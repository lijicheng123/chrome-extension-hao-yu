import Browser from 'webextension-polyfill'

// 全局消息总线
class MessageBus {
  constructor() {
    this.handlers = new Map() // 存储namespace到处理函数的映射
    this._initListener()
    console.log('全局消息总线已初始化')
  }

  _initListener() {
    // 只注册一个全局监听器
    Browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('全局消息总线收到消息:', message)
      // 特殊处理 action: 'apiRequest' 和 action: 'apiFetch'
      if (message.action === 'apiRequest' || message.action === 'apiFetch') {
        // 这些消息由专门的处理器处理，不经过总线
        return false
      }

      const namespace = message.namespace
      if (!namespace || !this.handlers.has(namespace)) {
        console.log(`未找到namespace处理器: ${namespace || '未指定'}`)
        return false
      }

      // 将消息转发给对应的处理函数
      console.log(`转发消息到${namespace}处理器`)
      return this.handlers.get(namespace)(message, sender, sendResponse)
    })
  }

  // 注册处理器
  registerHandler(namespace, handler) {
    console.log(`注册${namespace}处理器到全局消息总线`)
    this.handlers.set(namespace, handler)
  }

  // 获取所有已注册的命名空间
  getRegisteredNamespaces() {
    return [...this.handlers.keys()]
  }
}

// 单例模式
const globalMessageBus = new MessageBus()

/**
 * 消息通信服务
 * 提供content script和background之间的消息通信功能
 * 完全基于消息传递，不使用回调或Promise
 */
export class MessagingService {
  constructor(namespace) {
    this.namespace = namespace
    this._requestId = 0
    this._handlers = {}
    this._responsePromises = new Map() // 存储请求ID到Promise的映射

    // 注册到全局总线
    globalMessageBus.registerHandler(namespace, (message, sender, sendResponse) => {
      return this._handleMessage(message, sender, sendResponse)
    })
  }

  /**
   * 处理请求消息
   * @private
   */
  _handleMessage(message, sender, sendResponse) {
    console.log(`${this.namespace} 收到消息:`, message)

    // 立即发送空响应，避免通道挂起
    sendResponse({ received: true })

    // 检查是否属于当前命名空间
    if (message.namespace !== this.namespace) {
      return false
    }

    // 处理请求消息
    if (message.type === 'request') {
      this._processRequest(message, sender)
    }
    // 处理响应消息
    else if (message.type === 'response') {
      this._processResponse(message)
    }

    return false
  }

  /**
   * 处理请求消息
   * @private
   */
  _processRequest(message, sender) {
    const { id, action, data } = message
    console.log(`处理${this.namespace}请求:`, { action, id })
    const handler = this._handlers[action]
    if (!handler) {
      console.error(`未知的请求操作: ${action}`)
      // 如果有sender，发送错误响应
      if (sender && sender.tab) {
        this._sendResponseToTab(sender.tab.id, id, null, `未知的请求操作: ${action}`)
      }
      return
    }

    // 执行处理函数
    try {
      // 异步执行处理器
      Promise.resolve().then(async () => {
        try {
          const result = await Promise.resolve(handler(data, sender))

          // 现在处理返回结果
          // 如果发送方是content script (有sender.tab)，则发送响应到content script
          if (sender && sender.tab) {
            this._sendResponseToTab(sender.tab.id, id, result, null)
          }
          // 如果发送方是background script，则发送响应到background
          else {
            this._sendResponseToBackground(id, result, null)
          }

          return result
        } catch (error) {
          console.error(`处理${action}请求时发生错误:`, error)
          // 如果有sender，发送错误响应
          if (sender && sender.tab) {
            this._sendResponseToTab(
              sender.tab.id,
              id,
              null,
              `处理请求时出错: ${error.message || '未知错误'}`,
            )
          } else {
            this._sendResponseToBackground(
              id,
              null,
              `处理请求时出错: ${error.message || '未知错误'}`,
            )
          }
        }
      })
    } catch (error) {
      console.error(`执行${action}处理器时出错:`, error)
    }
  }

  /**
   * 处理响应消息
   * @private
   */
  _processResponse(message) {
    const { id, response, error } = message
    console.log(`处理${this.namespace}响应 [ID:${id}]:`, { response, error })

    // 查找对应的Promise解析器
    const promiseHandlers = this._responsePromises.get(id)
    if (promiseHandlers) {
      const { resolve, reject } = promiseHandlers
      if (error) {
        reject(new Error(error))
      } else {
        resolve(response)
      }
      // 清理已处理的Promise
      this._responsePromises.delete(id)
    }
  }

  /**
   * 向标签页发送响应
   * @private
   */
  _sendResponseToTab(tabId, requestId, data, error) {
    Browser.tabs
      .sendMessage(tabId, {
        namespace: this.namespace,
        type: 'response',
        id: requestId,
        response: data,
        error: error,
      })
      .catch((err) => {
        console.error(`发送响应到标签页失败 [TabID:${tabId}, ReqID:${requestId}]:`, err)
      })
  }

  /**
   * 发送响应消息到background
   * @private
   */
  _sendResponseToBackground(requestId, data, error) {
    Browser.runtime
      .sendMessage({
        namespace: this.namespace,
        type: 'response',
        id: requestId,
        response: data,
        error: error,
      })
      .catch((err) => {
        console.error(`发送响应到background失败 [ReqID:${requestId}]:`, err)
      })
  }

  /**
   * 发送请求消息
   * 注意：此方法不返回响应，响应将通过消息监听器接收
   * @public
   */
  sendMessage(action, data = {}) {
    const id = this._requestId++
    console.log(`发送${this.namespace}请求 [ID:${id}]:`, { action, data })

    // 发送消息，不期望响应
    Browser.runtime
      .sendMessage({
        namespace: this.namespace,
        type: 'request',
        id,
        action,
        data,
      })
      .catch((error) => {
        console.error(`发送消息失败 [ID:${id}]:`, error)
      })

    // 返回请求ID，用于跟踪请求
    return id
  }

  /**
   * 向指定标签页发送消息
   * @public
   */
  sendMessageToTab(tabId, action, data = {}) {
    const id = this._requestId++
    console.log(`发送${this.namespace}请求到标签页 [ID:${id}, TabID:${tabId}]:`, { action, data })

    // 发送消息，不期望响应
    Browser.tabs
      .sendMessage(tabId, {
        namespace: this.namespace,
        type: 'request',
        id,
        action,
        data,
      })
      .catch((error) => {
        console.error(`发送消息到标签页失败 [ID:${id}, TabID:${tabId}]:`, error)
      })

    // 返回请求ID，用于跟踪请求
    return id
  }

  /**
   * 广播消息到所有标签页
   * @public
   */
  async broadcastMessage(action, data = {}) {
    try {
      const tabs = await Browser.tabs.query({})
      const id = this._requestId++

      tabs.forEach((tab) => {
        Browser.tabs
          .sendMessage(tab.id, {
            namespace: this.namespace,
            type: 'request',
            id,
            action,
            data,
          })
          .catch(() => {
            // 忽略错误
          })
      })

      return id
    } catch (error) {
      console.error(`广播消息失败:`, error)
      return -1
    }
  }

  /**
   * 注册请求处理器
   * @public
   */
  registerHandler(action, handler) {
    this._handlers[action] = handler
    return this
  }

  /**
   * 批量注册请求处理器
   * @public
   */
  registerHandlers(handlers) {
    Object.entries(handlers).forEach(([action, handler]) => {
      this.registerHandler(action, handler)
    })
    return this
  }

  /**
   * 发送需要响应的消息
   * 返回Promise，在收到响应时解析
   * @public
   */
  sendMessageWithResponse(action, data = {}) {
    const id = this._requestId++
    console.log(`发送${this.namespace}请求并等待响应 [ID:${id}]:`, { action, data })

    // 创建Promise
    const responsePromise = new Promise((resolve, reject) => {
      // 存储解析器
      this._responsePromises.set(id, { resolve, reject })

      // 设置超时
      setTimeout(() => {
        if (this._responsePromises.has(id)) {
          this._responsePromises.delete(id)
          reject(new Error(`请求超时 [ID:${id}, Action:${action}]`))
        }
      }, 30000) // 30秒超时
    })

    // 发送消息
    Browser.runtime
      .sendMessage({
        namespace: this.namespace,
        type: 'request',
        id,
        action,
        data,
      })
      .catch((error) => {
        console.error(`发送消息失败 [ID:${id}]:`, error)
        // 如果发送失败，立即拒绝Promise
        if (this._responsePromises.has(id)) {
          const { reject } = this._responsePromises.get(id)
          reject(error)
          this._responsePromises.delete(id)
        }
      })

    return responsePromise
  }
}
