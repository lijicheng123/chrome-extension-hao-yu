import Browser from 'webextension-polyfill'
import { API_CONFIG } from '../../constants/api.js'
import { AuthBackgroundHandlers } from './auth.js'
import { USER_SESSION_KEY, SESSION_ERROR_CODES, SESSION_ERROR_NAMES } from '../../constants/session.js'

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
      console.log(`收到响应 response:`, response)
      if (response.redirected === true && response.url?.includes('login')) {
        AuthBackgroundHandlers.handleNeedLogin()
        Browser.storage.local.remove(USER_SESSION_KEY);
        console.log(`请求被重定向 [ID:${requestId}]:`, response.url)
      }
      const responseData = await response.json()
      console.log(`响应数据 [ID:${requestId}]:`, responseData)
      // 处理Odoo会话过期情况
      if (responseData.error) {
        console.error('Odoo API返回错误:', responseData.error);
        
        // 检查是否是会话过期错误
        if (
          responseData.error.code === SESSION_ERROR_CODES.SESSION_EXPIRED || 
          (responseData.error.data && 
           responseData.error.data.name === SESSION_ERROR_NAMES.SESSION_EXPIRED)
        ) {
          console.log('检测到Odoo会话过期，正在清除会话信息...');
          // 清除会话信息
          await Browser.storage.local.remove(USER_SESSION_KEY);
          console.log('会话信息已清除');
        }
      }

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
   * 调用Odoo API端点
   * @param {string} endpoint - Odoo端点路径 (例如: '/web/session/get_session_info')
   * @param {Object} params - 发送到端点的参数
   * @param {Object} options - 请求的其他选项
   * @returns {Promise<Object|null>} 响应数据或null（出错时）
   */
  static async callOdooApi(endpoint, params = {}, options = {}) {
    try {
      // 构建完整URL
      const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${API_CONFIG.BASE_URL}${endpoint}`;
      
      // 准备Odoo格式的请求体
      const body = JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: params,
        id: Date.now()
      });
      
      // 默认请求选项
      const requestOptions = {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: body
      };
      
      // 记录请求
      console.log(`Odoo API调用 ${url}`, { params });
      
      // 发送请求
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        console.warn(`Odoo API调用失败: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const responseData = await response.json();
      console.error('Odoo API返回:', responseData);
      // 检查Odoo错误
      if (responseData.error) {
        console.error('Odoo API返回错误:', responseData.error);
        return null;
      }
      
      return responseData;
    } catch (error) {
      console.error('Odoo API调用错误:', error);
      return null;
    }
  }
  
  /**
   * 直接调用Odoo模型方法
   * @param {string} model - Odoo模型名称 (例如: 'res.users')
   * @param {string} method - 调用的方法名 (例如: 'search_read')
   * @param {Array} args - 方法的位置参数
   * @param {Object} kwargs - 方法的关键字参数
   * @returns {Promise<Object|null>} 响应数据或null（出错时）
   */
  static async callOdooMethod(model, method, args = [], kwargs = {}) {
    try {
      const params = {
        model,
        method,
        args,
        kwargs
      };
      
      const response = await this.callOdooApi('/web/dataset/call_kw', params);
      
      if (!response || !response.result) {
        return null;
      }
      
      return response.result;
    } catch (error) {
      console.error(`调用Odoo方法${model}.${method}出错:`, error);
      return null;
    }
  }
  
  /**
   * 获取当前用户会话信息
   * @returns {Promise<Object|null>} 用户会话数据或null（不可用时）
   */
  static async getOdooSessionInfo() {
    try {
      const response = await this.callOdooApi(API_CONFIG.ENDPOINTS.AUTH.GET_SESSION_INFO);
      
      if (!response || !response.result) {
        return null;
      }
      
      return response.result;
    } catch (error) {
      console.error('获取Odoo会话信息出错:', error);
      return null;
    }
  }
  
  /**
   * 从Odoo模型搜索并读取记录
   * @param {string} model - Odoo模型名称
   * @param {Array} domain - 搜索域
   * @param {Array} fields - 要获取的字段
   * @param {Object} options - 附加选项(limit, offset, order)
   * @returns {Promise<Array|null>} 记录数组或null（出错时）
   */
  static async searchReadOdoo(model, domain = [], fields = [], options = {}) {
    try {
      const kwargs = {
        domain,
        fields,
        ...options
      };
      
      const result = await this.callOdooMethod(model, 'search_read', [], kwargs);
      return result;
    } catch (error) {
      console.error(`搜索${model}出错:`, error);
      return null;
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