/**
 * Content Window消息服务
 * 用于处理页面间的通信（window.postMessage）
 */
export class ContentWindowMessenger {
  constructor(namespace) {
    this.namespace = namespace
    this._handlers = {}
    this._init()
  }

  /**
   * 初始化消息监听
   * @private
   */
  _init() {
    // 监听来自其他窗口的消息
    window.addEventListener('message', (event) => {
      // 检查消息是否属于当前命名空间
      if (!event.data || !event.data.namespace || event.data.namespace !== this.namespace) {
        return
      }

      const { action, data } = event.data
      const handler = this._handlers[action]

      if (handler) {
        handler(data, event.source)
      }
    })
  }

  /**
   * 注册消息处理器
   * @param {string} action - 消息动作类型
   * @param {Function} handler - 处理函数
   */
  registerHandler(action, handler) {
    this._handlers[action] = handler
    return this
  }

  /**
   * 批量注册处理器
   * @param {Object} handlers - 处理器映射
   */
  registerHandlers(handlers) {
    Object.entries(handlers).forEach(([action, handler]) => {
      this.registerHandler(action, handler)
    })
    return this
  }

  /**
   * 发送消息到目标窗口
   * @param {Window} targetWindow - 目标窗口
   * @param {string} action - 消息动作类型
   * @param {Object} data - 消息数据
   */
  sendMessage(targetWindow, action, data = {}) {
    if (!targetWindow) {
      console.error('目标窗口不存在')
      return
    }

    targetWindow.postMessage(
      {
        namespace: this.namespace,
        action,
        data,
      },
      '*',
    )
  }

  /**
   * 销毁实例，移除事件监听
   */
  destroy() {
    window.removeEventListener('message', this._messageHandler)
  }
}

/**
 * LeadsMining窗口通信常量
 */
export const LEADS_MINING_WINDOW_ACTIONS = {
  SCROLL_AND_EXTRACT: 'SCROLL_AND_EXTRACT',
  EXTRACTED_EMAILS: 'EXTRACTED_EMAILS',
}

/**
 * LeadsMining窗口通信服务
 */
export class LeadsMiningWindowMessenger extends ContentWindowMessenger {
  constructor() {
    super('LEADS_MINING_WINDOW')
  }

  /**
   * 发送滚动和提取邮箱的请求
   * @param {Window} targetWindow - 目标窗口
   * @param {number} depth - 页面深度
   */
  sendScrollAndExtract(targetWindow, depth) {
    this.sendMessage(targetWindow, LEADS_MINING_WINDOW_ACTIONS.SCROLL_AND_EXTRACT, { depth })
  }

  /**
   * 发送提取到的邮箱
   * @param {Window} targetWindow - 目标窗口
   * @param {string[]} emails - 邮箱列表
   */
  sendExtractedEmails(targetWindow, emails) {
    this.sendMessage(targetWindow, LEADS_MINING_WINDOW_ACTIONS.EXTRACTED_EMAILS, { emails })
  }
}

// 创建LeadsMining窗口通信服务实例
export const leadsMiningWindowMessenger = new LeadsMiningWindowMessenger()
