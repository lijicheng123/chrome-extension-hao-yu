// import { message } from 'antd'
import Browser from 'webextension-polyfill'
import { API_CONFIG } from '../../constants/api.js'
import { apiClient } from '../messaging/api'

/**
 * API请求管理器
 * 负责管理请求配置、认证等
 */
export class RequestManager {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL
    this.token = null

    // 设置API客户端的基础URL
    apiClient.setBaseURL(this.baseURL)
  }

  async initToken() {
    const storage = await Browser.storage.local.get('authToken')
    this.token = storage.authToken

    // 设置API客户端的认证令牌
    if (this.token) {
      apiClient.setToken(this.token)
    }

    return this.token
  }

  async setToken(token) {
    this.token = token
    apiClient.setToken(token)
    await Browser.storage.local.set({ authToken: token })
  }

  async clearToken() {
    this.token = null
    apiClient.setToken(null)
    await Browser.storage.local.remove('authToken')
  }

  /**
   * 构建完整的URL（包含查询参数）
   * @param {string} endpoint - API端点
   * @param {object} params - 查询参数对象
   * @returns {string} 完整的URL
   */
  buildUrl(endpoint, params) {
    // 检查endpoint是否已经是完整URL
    let fullUrl
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      // 如果endpoint已经是完整URL，直接使用
      fullUrl = endpoint
    } else {
      // 否则添加baseURL
      fullUrl = `${this.baseURL}${endpoint}`
    }

    const url = new URL(fullUrl)
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
    const { method = 'GET', body, headers = {}, type, ...restOptions } = options
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
        // 其他请求到background再JSON序列化
        processedBody = body
      }
    }

    return {
      method,
      headers: { ...defaultHeaders, ...headers },
      body: processedBody,
      ...(type ? { type } : {}),
      ...restOptions,
      params,
    }
  }

  /**
   * 处理请求响应
   * @param {object} response - 响应对象
   * @returns {object} 处理后的响应数据
   * @private
   */
  _handleResponse(response) {
    // 处理401未授权错误
    if (response && response.status === 401) {
      console.warn('API请求返回401未授权，触发登录流程')
      // authClient.needLogin()
      throw new Error('用户未登录或登录已过期')
    }

    // 处理API错误
    if (
      response === null ||
      response === undefined ||
      (response.jsonrpc === '2.0' && response.error)
    ) {
      const errorObj = new Error(
        '请求失败: ' + (response?.error?.message || response?.message || '未知错误'),
      )

      if (response?.error) {
        errorObj.details = response.error.data
        errorObj.code = response.error.code
        errorObj.type = 'api_error'
        errorObj.originalError = response.error
      }

      throw errorObj
    }

    return response
  }

  /**
   * 发送请求
   * @param {string} endpoint - API端点
   * @param {object} options - 请求配置
   * @returns {Promise} 请求响应
   */
  async request(endpoint, options = {}) {
    // 首先准备请求选项
    const preparedOptions = await this.prepareRequestOptions(options)
    const { params, ...restOptions } = preparedOptions
    const url = this.buildUrl(endpoint, params)

    // 使用apiClient发送请求
    const response = await apiClient.request(url, restOptions)
    return this._handleResponse(response)
  }

  /**
   * GET请求快捷方法
   */
  async get(endpoint, params = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'GET',
      params,
    })
  }

  /**
   * POST请求捷方法
   */
  async post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body,
    })
  }

  /**
   * odoo请求快捷方法
   */
  async odooCall(endpoint, body = {}, options = { type: 'odoo' }) {
    console.log('odooCall调用:', {
      endpoint,
      body,
      options,
    })
    const result = await this.post(endpoint, body, options)
    console.log('odooCall响应:', result)
    return result
  }
  /**
   * PUT请求快捷方法
   */
  async put(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body,
    })
  }

  /**
   * DELETE请求快捷方法
   */
  async delete(endpoint, params = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE',
      params,
    })
  }

  /**
   * 文件上传快捷方法
   */
  async upload(endpoint, files, options = {}) {
    // 准备基本选项，但不处理body (文件会单独处理)
    const baseOptions = {
      ...options,
      method: 'POST',
      headers: {
        // 移除Content-Type,让浏览器自动设置multipart/form-data
        ...(options.headers || {}),
      },
    }
    const preparedOptions = await this.prepareRequestOptions(baseOptions)
    const { params, ...restOptions } = preparedOptions
    const url = this.buildUrl(endpoint, params)

    // 创建FormData
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })

    // 确保Content-Type未设置，让浏览器自动处理
    if (restOptions.headers && restOptions.headers['Content-Type']) {
      delete restOptions.headers['Content-Type']
    }

    const response = await apiClient.request(url, {
      ...restOptions,
      body: formData,
    })
    return this._handleResponse(response)
  }
}

export const requestManager = new RequestManager()
