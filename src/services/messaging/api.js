import { MessagingService } from './index'
import Browser from 'webextension-polyfill'

/**
 * API请求消息服务
 * 命名空间: API
 */
const apiService = new MessagingService('API')

// 导出服务实例
export default apiService

// 定义API常量
export const API_ACTIONS = {
  REQUEST: 'REQUEST',
  RESPONSE: 'RESPONSE',
  FETCH: 'FETCH',
}

// 存储API请求回调
const pendingRequests = new Map()

// 定义响应监听器
Browser.runtime.onMessage.addListener((message) => {
  // 检查是否是API响应
  if (message.action === 'apiResponse') {
    const id = message.id
    const callback = pendingRequests.get(id)

    if (callback) {
      if (message.error) {
        callback.reject(new Error(message.error))
      } else {
        callback.resolve(message.response)
      }

      // 移除已处理的请求
      pendingRequests.delete(id)
    }
  }

  // 不阻止其他监听器处理
  return false
})

/**
 * Content Script API封装
 */
export class ApiContentAPI {
  constructor() {
    this.baseURL = null
    this.token = null
    this._requestId = 0
  }

  /**
   * 设置基础URL
   * @param {string} url
   */
  setBaseURL(url) {
    this.baseURL = url
  }

  /**
   * 设置认证Token
   * @param {string} token
   */
  setToken(token) {
    this.token = token
  }

  /**
   * 发送API请求
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<any>} 响应数据 - 通过Promise接口保持API兼容性
   */
  request(endpoint, options = {}) {
    // 检查endpoint是否已经是完整URL
    let url
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      // 如果endpoint已经是完整URL，直接使用
      url = endpoint
    } else {
      // 否则添加baseURL
      url = this.baseURL ? `${this.baseURL}${endpoint}` : endpoint
    }

    // 添加默认头信息
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // 如果有token，添加认证头
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    // 生成唯一请求ID
    const requestId = Date.now() + Math.floor(Math.random() * 1000)

    // 准备请求数据
    const requestOptions = {
      ...options,
      headers,
    }

    console.log(`发起API请求 [ID:${requestId}]:`, {
      url,
      options: requestOptions,
    })

    // 创建Promise接口，保持API兼容性
    return new Promise((resolve, reject) => {
      // 存储回调
      pendingRequests.set(requestId, { resolve, reject })

      // 直接向background发送请求
      Browser.runtime
        .sendMessage({
          action: 'apiRequest',
          request: {
            id: requestId,
            url,
            ...requestOptions,
          },
        })
        .catch((error) => {
          pendingRequests.delete(requestId)
          reject(new Error(`发送请求失败: ${error.message || '通信错误'}`))
        })

      // 设置超时处理
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId)
          reject(new Error('请求超时，未收到响应'))
        }
      }, 30000) // 30秒超时
    })
  }

  /**
   * 发送GET请求
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<any>} 响应数据
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  /**
   * 发送POST请求
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>} 响应数据
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data, // 不自动转换为JSON字符串，在background中处理
    })
  }

  /**
   * 发送PUT请求
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>} 响应数据
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data,
    })
  }

  /**
   * 发送DELETE请求
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<any>} 响应数据
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }

  /**
   * 在后台执行fetch请求
   * @param {RequestInfo|URL} input
   * @param {RequestInit} init
   * @returns {Promise<Response>}
   */
  fetchBg(input, init) {
    // 生成唯一请求ID
    const requestId = Date.now() + Math.floor(Math.random() * 1000)

    return new Promise((resolve, reject) => {
      // 存储回调
      pendingRequests.set(requestId, {
        resolve: (responseData) => {
          if (responseData.isBase64 && responseData.body) {
            // 解码Base64响应体
            const binaryStr = atob(responseData.body)
            const bytes = new Uint8Array(binaryStr.length)
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i)
            }
            const body = responseData.body ? new Blob([bytes]) : undefined
            resolve(
              new Response(body, {
                status: responseData.status,
                statusText: responseData.statusText,
                headers: new Headers(responseData.headers),
              }),
            )
          } else {
            resolve(
              new Response(responseData.body, {
                status: responseData.status,
                statusText: responseData.statusText,
                headers: new Headers(responseData.headers),
              }),
            )
          }
        },
        reject,
      })

      // 直接向background发送fetch请求
      Browser.runtime
        .sendMessage({
          action: 'apiFetch',
          request: {
            id: requestId,
            input,
            init,
          },
        })
        .catch((error) => {
          pendingRequests.delete(requestId)
          reject(new Error(`发送fetch请求失败: ${error.message || '通信错误'}`))
        })

      // 设置超时处理
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId)
          reject(new Error('Fetch请求超时，未收到响应'))
        }
      }, 30000) // 30秒超时
    })
  }
}

// 创建单例实例
export const apiClient = new ApiContentAPI()

/**
 * Background API处理器
 * 背景脚本中使用
 */
export class ApiBackgroundHandlers {
  /**
   * 执行API请求
   * @param {Object} data 请求数据
   * @param {Object} sender 发送者信息
   * @returns {Promise<void>}
   */
  static async handleRequest(data, sender) {
    console.log('ApiBackgroundHandlers.handleRequest开始处理', data, 'sender:', sender)

    if (!sender || !sender.tab) {
      console.error('没有sender信息或tab信息，无法返回响应')
      return { success: false, error: '无sender信息' }
    }

    try {
      // 兼容两种不同的输入格式
      let url, method, headers, body, type, requestId

      // 检查data的格式
      if (data.url) {
        // 直接从background.onMessage接收的格式: {id, url, method, headers, body, type}
        url = data.url
        method = data.method || 'GET'
        headers = data.headers || {}
        body = data.body
        type = data.type || ''
        requestId = data.id || Date.now() + Math.floor(Math.random() * 1000)
      } else if (data.options) {
        // MessagingService格式: {url, options: {method, headers, body, type}}
        url = data.url
        const options = data.options || {}
        method = options.method || 'GET'
        headers = options.headers || {}
        body = options.body
        type = options.type || ''
        requestId = data.id || Date.now() + Math.floor(Math.random() * 1000)
      } else {
        throw new Error('无效的请求格式，缺少url或options')
      }

      console.log('处理请求参数:', { url, method, headers, body, type, requestId })

      // 处理请求参数
      let bodyData = body
      if (typeof body === 'string') {
        try {
          bodyData = JSON.parse(body)
        } catch (e) {
          bodyData = body
        }
      }

      // 对odoo类型请求特殊处理
      if (type === 'odoo') {
        bodyData = {
          jsonrpc: '2.0',
          method: 'call',
          params: bodyData,
        }
      }

      // 完整的请求选项
      const requestOptions = {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(bodyData),
      }

      console.log(`开始执行请求 [ID:${requestId}]:`, url, requestOptions)

      const response = await fetch(url, requestOptions)
      console.log(`收到响应 [ID:${requestId}]:`, response.status, response.statusText)

      const responseData = await response.json()
      console.log(`响应数据 [ID:${requestId}]:`, responseData)

      // 特殊处理401未授权状态
      if (response.status === 401) {
        console.log(`请求返回401未授权 [ID:${requestId}]，将设置状态码到响应`)
        responseData.status = 401
      }

      // 直接使用Browser.tabs.sendMessage发送响应回content script
      console.log(`发送响应到标签页 [ID:${requestId}, TabID:${sender.tab.id}]`)
      Browser.tabs
        .sendMessage(sender.tab.id, {
          action: 'apiResponse',
          id: requestId,
          response: responseData,
        })
        .catch((error) => {
          console.error(`发送响应失败 [ID:${requestId}]:`, error)
        })

      return { success: true }
    } catch (error) {
      console.error('Background请求错误:', error)

      if (sender && sender.tab) {
        Browser.tabs
          .sendMessage(sender.tab.id, {
            action: 'apiResponse',
            id: data.id || Date.now(),
            error: `API请求失败: ${error.message || '未知错误'}`,
          })
          .catch((e) => {
            console.error('发送错误响应失败:', e)
          })
      }

      return { success: false, error: error.message }
    }
  }

  /**
   * 执行后台fetch请求
   * @param {Object} data 请求数据
   * @param {Object} sender 发送者信息
   * @returns {Promise<void>}
   */
  static async handleFetch(data, sender) {
    console.log('ApiBackgroundHandlers.handleFetch开始处理', data)

    if (!sender || !sender.tab) {
      console.error('没有sender信息或tab信息，无法返回响应')
      return { success: false, error: '无效的sender信息' }
    }

    // 兼容两种不同格式的输入
    let input, init, requestId

    // 检查data格式
    if (data.input) {
      // 直接从background.onMessage接收的格式: {id, input, init}
      input = data.input
      init = data.init || {}
      requestId = data.id || Date.now() + Math.floor(Math.random() * 1000)
    } else if (data.data) {
      // MessagingService格式: {data: {input, init}}
      const fetchData = data.data || {}
      input = fetchData.input
      init = fetchData.init || {}
      requestId = data.id || Date.now() + Math.floor(Math.random() * 1000)
    } else {
      throw new Error('无效的fetch请求格式')
    }

    console.log('处理fetch参数:', { input, init, requestId })

    try {
      const response = await fetch(input, init)
      console.log(`收到fetch响应 [ID:${requestId}]:`, response.status, response.statusText)

      // 转换response为可序列化对象
      const responseText = await response.text()
      const responseBlob = new Blob([responseText])

      // 使用FileReader读取响应内容
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsArrayBuffer(responseBlob)
      })

      // 转换ArrayBuffer为Base64以便传输
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
      )

      const responseData = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()]),
        body: base64,
        isBase64: true,
      }

      console.log(`发送fetch响应到标签页 [ID:${requestId}, TabID:${sender.tab.id}]`)
      Browser.tabs
        .sendMessage(sender.tab.id, {
          action: 'apiResponse',
          id: requestId,
          response: responseData,
        })
        .catch((error) => {
          console.error(`发送fetch响应失败 [ID:${requestId}]:`, error)
        })

      return { success: true }
    } catch (error) {
      console.error(`Fetch请求错误 [ID:${requestId}]:`, error)

      Browser.tabs
        .sendMessage(sender.tab.id, {
          action: 'apiResponse',
          id: requestId,
          error: `Fetch请求失败: ${error.message || '未知错误'}`,
        })
        .catch((e) => {
          console.error('发送fetch错误响应失败:', e)
        })

      return { success: false, error: error.message }
    }
  }

  /**
   * 注册所有处理器
   */
  static registerHandlers() {
    // 只注册直接监听器，不使用MessagingService
    Browser.runtime.onMessage.addListener((message, sender) => {
      if (message.action === 'apiRequest') {
        ApiBackgroundHandlers.handleRequest(message.request, sender)
        return false
      } else if (message.action === 'apiFetch') {
        ApiBackgroundHandlers.handleFetch(message.request, sender)
        return false
      }
      return false
    })

    console.log('API后台处理器已注册')
  }
}
