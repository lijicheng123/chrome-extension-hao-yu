import './styles.scss'
import { getUserConfig, getPreferredLanguageKey } from '../config/index.mjs'
import { changeLanguage } from 'i18next'
import '../_locales/i18n-react'
import { injectCSSVariables } from '../config/ui-config.mjs'
import { isModuleEnabled } from './config/modules.js'

// 核心管理器
import { lifecycleManager } from './core/LifecycleManager.js'
import { eventManager } from './core/EventManager.js'
import { componentManager } from './core/ComponentManager.js'

// 功能模块
import { selectionToolsModule } from './modules/SelectionToolsModule.js'
import { SiteAdapterModule } from './modules/SiteAdapterModule.js'
import { ContextMenuModule } from './modules/ContextMenuModule.js'
import { SidebarModule } from './modules/SidebarModule.js'
import { TranslationModule } from './modules/TranslationModule.js'
import { MiningModule } from './modules/MiningModule.js'
import { UtilityModule } from './modules/UtilityModule.js'
import { ConfigModule } from './modules/ConfigModule.js'
import { WebAutomationModule } from './modules/WebAutomationModule.js'

/**
 * 主应用类 - 统一管理所有模块
 * 负责整个content script的初始化和管理
 * 实现了高内聚低耦合的模块化架构
 */
class ContentScriptApp {
  constructor() {
    this.initialized = false
  }

  /**
   * 初始化应用
   */
  async init() {
    if (this.initialized) {
      console.warn('ContentScriptApp already initialized')
      return
    }

    try {
      console.log('Starting ContentScript initialization...')

      // 注入CSS变量
      injectCSSVariables()

      // 获取用户配置
      const userConfig = await getUserConfig()

      // 设置语言
      const lang = await getPreferredLanguageKey(userConfig)
      await changeLanguage(lang)

      // 注册所有模块到生命周期管理器
      this.registerModules()

      // 初始化所有模块
      await lifecycleManager.init(userConfig)

      this.initialized = true
      console.log('ContentScript initialized successfully')
    } catch (error) {
      console.error('Failed to initialize ContentScript:', error)
      throw error
    }
  }

  /**
   * 注册所有功能模块 - 按照职责清晰分离
   */
  registerModules() {
    // 核心管理器（必须启用）
    if (isModuleEnabled('core', 'eventManager')) {
      lifecycleManager.registerModule('eventManager', eventManager)
    }

    if (isModuleEnabled('core', 'componentManager')) {
      lifecycleManager.registerModule('componentManager', componentManager)
    }

    // 配置模块（必须启用，处理配置监听）
    lifecycleManager.registerModule('config', new ConfigModule())

    // 工具模块（必须启用，处理访问令牌、跳转通知等）
    lifecycleManager.registerModule('utility', new UtilityModule())

    // 功能模块（按配置启用）
    if (isModuleEnabled('features', 'selectionTools')) {
      lifecycleManager.registerModule('selectionTools', selectionToolsModule)
    }

    if (isModuleEnabled('features', 'siteAdapter')) {
      lifecycleManager.registerModule('siteAdapter', new SiteAdapterModule())
    }

    if (isModuleEnabled('features', 'sidebar')) {
      lifecycleManager.registerModule('sidebar', new SidebarModule())
    }

    if (isModuleEnabled('features', 'contextMenu')) {
      lifecycleManager.registerModule('contextMenu', new ContextMenuModule())
    }

    if (isModuleEnabled('features', 'translation')) {
      lifecycleManager.registerModule('translation', new TranslationModule())
    }

    if (isModuleEnabled('features', 'mining')) {
      lifecycleManager.registerModule('mining', new MiningModule())
    }

    // Web自动化模块（必须启用，处理自动化消息）
    lifecycleManager.registerModule('webAutomation', new WebAutomationModule())

    console.log('已注册的模块:', Array.from(lifecycleManager.modules.keys()))
  }

  /**
   * 销毁应用
   */
  async destroy() {
    if (!this.initialized) {
      return
    }

    await lifecycleManager.destroy()
    this.initialized = false
    console.log('ContentScript destroyed')
  }
}

/**
 * 主入口函数
 */
async function main() {
  try {
    const app = new ContentScriptApp()
    await app.init()

    // 将app实例挂载到window上，方便调试和外部访问
    window.contentScriptApp = app

    // 页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
      console.log('Destroying ContentScript due to beforeunload...')
      app.destroy()
    })
  } catch (error) {
    console.error('Failed to start ContentScript:', error)
  }
}

// 启动应用
main()
