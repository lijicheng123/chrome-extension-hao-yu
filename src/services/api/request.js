import { message } from 'antd'
import Browser from 'webextension-polyfill'
import { API_CONFIG } from './config'
class RequestManager {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL
    this.token = null
    this._requestId = 0
    this._callbacks = {}

    // 初始化消息监听器
    Browser.runtime.onMessage.addListener((message) => {
      if (message.action === 'apiResponse') {
        const { id, response, error } = message
        const callback = this._callbacks[id]
        if (callback) {
          if (error) {
            callback.reject(new Error(error))
          } else {
            callback.resolve(response)
          }
          delete this._callbacks[id]
        }
      }
    })
  }

  async initToken() {
    const storage = await Browser.storage.local.get('authToken')
    this.token = storage.authToken
    return this.token
  }

  async setToken(token) {
    this.token = token
    await Browser.storage.local.set({ authToken: token })
  }

  async clearToken() {
    this.token = null
    await Browser.storage.local.remove('authToken')
  }

  /**
   * 构建完整的URL（包含查询参数）
   * @param {string} endpoint - API端点
   * @param {object} params - 查询参数对象
   * @returns {string} 完整的URL
   */
  buildUrl(endpoint, params) {
    const url = new URL(`${this.baseURL}${endpoint}`)
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key])
        }
      })
    }
    return url.toString()
  }

  /**
   * 处理请求配置
   * @param {object} options - 请求配置
   * @returns {object} 处理后的请求配置
   */
  async prepareRequestOptions(options) {
    const { method = 'GET', body, headers = {}, ...restOptions } = options
    let params = options.params || {}

    // 确保token已初始化
    if (!this.token) {
      await this.initToken()
    }

    // 构建headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(this.token ? { token: this.token } : {}),
    }

    // 处理请求体
    let processedBody = undefined
    if (body) {
      if (headers['Content-Type']?.includes('multipart/form-data')) {
        // 处理文件上传
        const formData = new FormData()
        Object.entries(body).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((item) => formData.append(`${key}[]`, item))
          } else {
            formData.append(key, value)
          }
        })
        processedBody = formData
        // 使用FormData时删除Content-Type，让浏览器自动设置
        delete defaultHeaders['Content-Type']
      } else if (method === 'GET') {
        // GET请求将body转换为查询参数
        params = { ...params, ...body }
      } else {
        // 其他请求JSON序列化
        processedBody = JSON.stringify(body)
      }
    }

    return {
      method,
      headers: { ...defaultHeaders, ...headers },
      body: processedBody,
      ...restOptions,
      params,
    }
  }
  /**
   * 发送请求
   * @param {string} endpoint - API端点
   * @param {object} options - 请求配置
   * @returns {Promise} 请求响应
   */
  async request(endpoint, options = {}) {
    const processedOptions = await this.prepareRequestOptions(options)
    const url = this.buildUrl(endpoint, processedOptions.params)
    const requestId = this._requestId++

    // 构建请求参数
    const requestOptions = {
      headers: processedOptions.headers,
      data: processedOptions.body,
      params: processedOptions.params,
    }

    return new Promise(async (resolve, reject) => {
      try {
        // 设置回调
        this._callbacks[requestId] = {
          resolve: async (response) => {
            // 处理特殊状态码
            if (response.code === 401) {
              await this.clearToken()
              await Browser.runtime.sendMessage({ type: 'NEED_LOGIN' })
              reject(new Error('需要登录'))
            } else if (response.code === 403) {
              reject(new Error('没有权限'))
            } else if (response.code === 404) {
              reject(new Error('资源不存在'))
            } else if (response.code === 429) {
              reject(new Error('请求过于频繁'))
            } else {
              resolve(response)
            }
          },
          reject: (error) => reject(new Error(error.message || '请求失败')),
        }

        // 发送消息
        await Browser.runtime.sendMessage({
          action: 'apiRequest',
          request: {
            id: requestId,
            method: processedOptions.method,
            url,
            ...requestOptions,
          },
        })
      } catch (error) {
        reject(new Error(error.message || '请求失败'))
      }
    })
  }

  /**
   * GET请求快捷方法
   */
  async get(endpoint, params = {}, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      params,
      ...options,
    })
  }

  /**
   * POST请求捷方法
   */
  async post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body,
      ...options,
    })
  }

  /**
   * PUT请求快捷方法
   */
  async put(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body,
      ...options,
    })
  }

  /**
   * DELETE请求快捷方法
   */
  async delete(endpoint, params = {}, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      params,
      ...options,
    })
  }

  /**
   * 文件上传快捷方法
   */
  async upload(endpoint, files, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: files,
      ...options,
    })
  }
}

export const requestManager = new RequestManager()
