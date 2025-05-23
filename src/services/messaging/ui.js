import { MessagingService } from './index'
import Browser from 'webextension-polyfill'

/**
 * UI操作消息服务
 * 命名空间: UI
 */
const uiService = new MessagingService('UI')

// 导出服务实例
export default uiService

// 定义UI操作API常量
export const UI_API = {
  CREATE_CHAT: 'CREATE_CHAT',
  CLOSE_TOOLBAR: 'CLOSE_TOOLBAR',
  OPEN_URL: 'OPEN_URL',
  OPEN_CHAT_WINDOW: 'OPEN_CHAT_WINDOW',
  OPEN_BATCH_IMAGE_DOWNLOADER: 'OPEN_BATCH_IMAGE_DOWNLOADER',
}

/**
 * Content Script API封装
 */
export class UiContentAPI {
  /**
   * 创建聊天
   * @param {Object} data - 聊天数据
   * @returns {Promise<any>}
   */
  static async createChat(data) {
    return uiService.sendMessage(UI_API.CREATE_CHAT, data)
  }

  /**
   * 关闭工具栏
   * @returns {Promise<any>}
   */
  static async closeToolbar() {
    return uiService.sendMessage(UI_API.CLOSE_TOOLBAR)
  }
}

/**
 * Background API封装
 */
export class UiBackgroundAPI {
  /**
   * 在标签页中创建聊天
   * @param {number} tabId - 标签页ID
   * @param {Object} data - 聊天数据
   * @returns {Promise<any>}
   */
  static async createChat(tabId, data) {
    return uiService.sendMessageToTab(tabId, UI_API.CREATE_CHAT, data)
  }

  /**
   * 在标签页中关闭工具栏
   * @param {number} tabId - 标签页ID
   * @returns {Promise<any>}
   */
  static async closeToolbar(tabId) {
    return uiService.sendMessageToTab(tabId, UI_API.CLOSE_TOOLBAR)
  }

  /**
   * 打开URL
   * @param {string} url - 要打开的URL
   * @returns {Promise<any>}
   */
  static async openUrl(url) {
    return uiService.sendMessage(UI_API.OPEN_URL, { url })
  }

  /**
   * 打开聊天窗口
   * @returns {Promise<any>}
   */
  static async openChatWindow() {
    return uiService.sendMessage(UI_API.OPEN_CHAT_WINDOW)
  }
}

/**
 * Background处理器
 */
export class UiBackgroundHandlers {
  /**
   * 处理打开URL请求
   * @param {Object} data - 请求数据
   * @param {Object} sender - 发送者信息
   */
  static async handleOpenUrl(data) {
    const { url } = data

    try {
      // 使用Browser.tabs.create打开URL
      await Browser.tabs.create({ url })
      return { success: true }
    } catch (error) {
      throw new Error(`打开URL失败: ${error.message}`)
    }
  }

  /**
   * 处理打开聊天窗口请求
   */
  static async handleOpenChatWindow() {
    // 实现打开聊天窗口的逻辑
    // 如果需要访问chrome API，可以在这里实现
    return { success: true }
  }

  /**
   * 注册UI处理器
   */
  static registerHandlers() {
    uiService.registerHandlers({
      [UI_API.OPEN_URL]: UiBackgroundHandlers.handleOpenUrl,
      [UI_API.OPEN_CHAT_WINDOW]: UiBackgroundHandlers.handleOpenChatWindow,
    })
  }
}
