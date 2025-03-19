import { MessagingService } from './index'

/**
 * 国际化消息服务
 * 命名空间: I18N
 */
const i18nService = new MessagingService('I18N')

// 导出服务实例
export default i18nService

// 定义国际化API常量
export const I18N_API = {
  CHANGE_LANGUAGE: 'CHANGE_LANGUAGE',
  GET_LANGUAGE: 'GET_LANGUAGE',
}

/**
 * Content Script API封装
 */
export class I18nContentAPI {
  /**
   * 获取当前语言
   * @returns {Promise<string>} 当前语言代码
   */
  static async getLanguage() {
    return i18nService.sendMessage(I18N_API.GET_LANGUAGE)
  }
}

/**
 * Background API封装
 */
export class I18nBackgroundAPI {
  /**
   * 更改所有页面的语言
   * @param {string} lang - 语言代码
   * @returns {Promise<void>}
   */
  static async changeLanguage(lang) {
    return i18nService.broadcastMessage(I18N_API.CHANGE_LANGUAGE, { lang })
  }
}
