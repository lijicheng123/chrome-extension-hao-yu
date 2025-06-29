import { MessagingService } from './index'
import Browser from 'webextension-polyfill'
import { API_CONFIG } from '../../constants/api.js'

/**
 * 认证消息服务
 * 命名空间: AUTH
 */
const authService = new MessagingService('AUTH')

// 导出服务实例
export default authService

// 定义AUTH常量
export const AUTH_ACTIONS = {
  NEED_LOGIN: 'NEED_LOGIN',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
}

/**
 * 认证处理器
 * 背景脚本中使用
 */
export class AuthBackgroundHandlers {
  /**
   * 处理需要登录的请求
   * @param {Object} data 请求数据
   * @returns {Promise<Object>} 处理结果
   */
  static async handleNeedLogin(data) {
    console.log('处理需要登录请求:', data)

    try {
      // 获取当前活动标签页
      // const currentTab = await Browser.tabs.query({ active: true, currentWindow: true })
      // const currentUrl = currentTab[0]?.url || ''

      // 带上重定向地址，并打开登录页，一般从这里发起的都不是odoo的页面，所以不能带redirect参数
      // redirect=${encodeURIComponent(currentUrl)}&
      const loginUrl = `${API_CONFIG.BASE_URL}/web/login?from=extension`
      await Browser.tabs.create({ url: loginUrl, active: true })

      return { success: true }
    } catch (error) {
      console.error('处理需要登录请求失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 注册所有处理器
   */
  static registerHandlers() {
    authService.registerHandlers({
      [AUTH_ACTIONS.NEED_LOGIN]: AuthBackgroundHandlers.handleNeedLogin,
    })

    console.log('认证处理器已注册')
  }
}

/**
 * 认证API - 内容脚本使用
 */
class AuthContentAPI {
  /**
   * 发送需要登录消息
   * @returns {Promise<void>}
   */
  async needLogin() {
    console.log('发送需要登录请求')
    try {
      // 使用消息总线方式
      const requestId = authService.sendMessage(AUTH_ACTIONS.NEED_LOGIN, {})
      console.log(`发送需要登录请求 [ID:${requestId}]`)
    } catch (error) {
      console.error('发送需要登录请求失败:', error)
    }
  }
}

// 导出API
export const authClient = new AuthContentAPI()
