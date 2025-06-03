import { eventManager } from '../core/EventManager.js'
import { initImmersiveTranslate, renderTranslatePanel } from '../immersive-translate'

/**
 * 翻译模块 - 单一职责：处理翻译相关功能
 * 高内聚：所有翻译相关的逻辑都在这里
 * 低耦合：通过事件系统与其他模块通信
 */
export class TranslationModule {
  constructor() {
    this.config = null
    this.initialized = false
  }

  /**
   * 初始化翻译模块
   * @param {Object} config - 用户配置
   */
  async init(config) {
    this.config = config
    
    // 初始化沉浸式翻译 - 保持原有逻辑
    await this.initImmersiveTranslate()
    
    // 设置翻译快捷键 - 保持原有逻辑
    this.setupTranslationShortcut()
    
    this.initialized = true
    console.log('TranslationModule initialized')
    
    return () => this.cleanup()
  }

  /**
   * 销毁模块
   */
  async destroy() {
    this.cleanup()
    this.config = null
    this.initialized = false
    console.log('TranslationModule destroyed')
  }

  /**
   * 配置变更处理
   * @param {Object} newConfig - 新配置
   */
  async onConfigChange(newConfig) {
    this.config = newConfig
  }

  /**
   * 初始化沉浸式翻译 - 保持原有逻辑
   */
  async initImmersiveTranslate() {
    try {
      await initImmersiveTranslate()
      console.log('Immersive translate initialized')
    } catch (error) {
      console.warn('Failed to initialize immersive translate:', error)
    }
  }

  /**
   * 设置翻译快捷键 - 完全保持原有逻辑
   */
  setupTranslationShortcut() {
    const handleKeyDown = (e) => {
      // Alt + I 快捷键触发翻译面板 - 保持原逻辑
      if (e.altKey && e.key === 'i') {
        e.preventDefault()
        this.renderTranslatePanel()
      }
    }

    eventManager.addListener('translation-keydown', document, 'keydown', handleKeyDown)
  }

  /**
   * 渲染翻译面板 - 保持原有逻辑
   */
  renderTranslatePanel() {
    try {
      renderTranslatePanel()
    } catch (error) {
      console.warn('Failed to render translate panel:', error)
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 事件监听器会由 EventManager 统一清理
  }
} 