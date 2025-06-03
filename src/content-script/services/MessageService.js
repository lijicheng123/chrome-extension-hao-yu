import Browser from 'webextension-polyfill'
import i18nService, { I18N_API } from '../../services/messaging/i18n.js'
import { changeLanguage } from 'i18next'

/**
 * 消息服务
 * 处理消息通信相关的功能
 */
export class MessageService {
  constructor() {
    this.config = null
    this.storageListener = null
  }

  /**
   * 初始化消息服务
   * @param {Object} config - 用户配置
   */
  async init(config) {
    this.config = config
    
    // 初始化i18n服务
    this.initI18nService()
    
    // 初始化存储监听器
    this.initStorageListener()
    
    console.log('MessageService initialized')
    
    // 返回清理函数
    return () => this.cleanup()
  }

  /**
   * 销毁模块
   */
  async destroy() {
    this.cleanup()
    this.config = null
    console.log('MessageService destroyed')
  }

  /**
   * 配置变更处理
   * @param {Object} newConfig - 新配置
   */
  async onConfigChange(newConfig) {
    this.config = newConfig
  }

  /**
   * 初始化i18n服务
   */
  initI18nService() {
    i18nService.registerHandler(I18N_API.CHANGE_LANGUAGE, (data) => {
      if (data && data.lang) {
        // 这里会调用其他模块来更新语言
        changeLanguage(data.lang)
      }
      return { success: true }
    })
  }

  /**
   * 初始化存储监听器
   */
  initStorageListener() {
    this.storageListener = (changes, area) => {
      if (area === 'local') {
        // 处理配置变更
        this.handleConfigChange(changes)
      }
    }

    Browser.storage.onChanged.addListener(this.storageListener)
  }

  /**
   * 处理配置变更
   * @param {Object} changes - 变更的配置项
   */
  handleConfigChange(changes) {
    // 这里可以通知其他模块配置已变更
    // 简化处理，暂时只记录日志
    console.log('Storage changes detected:', changes)
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.storageListener) {
      Browser.storage.onChanged.removeListener(this.storageListener)
      this.storageListener = null
    }
  }
} 