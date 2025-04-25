import Browser from 'webextension-polyfill'

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
 * 用于内容脚本中发送API请求到后台脚本
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