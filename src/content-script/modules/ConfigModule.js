import { componentManager } from '../core/ComponentManager.js'
import { getUserConfig } from '../../config/index.mjs'
import { changeLanguage } from 'i18next'
import { getPreferredLanguageKey } from '../../config/index.mjs'
import i18nService, { I18N_API } from '../../services/messaging/i18n'
import Browser from 'webextension-polyfill'
import { useEffect } from 'react'
import PropTypes from 'prop-types'

/**
 * 配置模块 - 单一职责：处理配置监听和变更响应
 * 高内聚：所有配置相关的逻辑都在这里
 * 低耦合：通过事件和回调与其他模块通信
 */
export class ConfigModule {
  constructor() {
    this.config = null
    this.configListeners = new Set()
    this.componentId = null
  }

  /**
   * 初始化配置模块
   * @param {Object} config - 用户配置
   */
  async init(config) {
    this.config = config
    
    // 设置语言配置 - 保持原有逻辑
    await this.setupLanguage()
    
    // 注册i18n服务处理器 - 保持原有逻辑
    this.registerI18nHandlers()
    
    // 渲染配置监听组件 - 保持原有逻辑
    this.renderConfigWatcher()
    
    console.log('ConfigModule initialized')
    
    return () => this.cleanup()
  }

  /**
   * 销毁模块
   */
  async destroy() {
    this.cleanup()
    this.config = null
    console.log('ConfigModule destroyed')
  }

  /**
   * 配置变更处理
   * @param {Object} newConfig - 新配置
   */
  async onConfigChange(newConfig) {
    this.config = newConfig
    
    // 通知所有注册的监听器
    this.configListeners.forEach(listener => {
      try {
        listener(newConfig)
      } catch (error) {
        console.error('Config listener error:', error)
      }
    })
  }

  /**
   * 设置语言配置 - 保持原有逻辑
   */
  async setupLanguage() {
    const userConfig = this.config || await getUserConfig()
    const lang = await getPreferredLanguageKey(userConfig)
    await changeLanguage(lang)
  }

  /**
   * 注册i18n服务处理器 - 保持原有逻辑
   */
  registerI18nHandlers() {
    i18nService.registerHandler(I18N_API.CHANGE_LANGUAGE, (data) => {
      if (data && data.lang) {
        changeLanguage(data.lang)
      }
      return { success: true }
    })
  }

  /**
   * 渲染配置监听组件 - 保持原有逻辑
   */
  renderConfigWatcher() {
    this.componentId = 'config-watcher'
    
    const component = <MonitConfigForView onConfigChange={this.onConfigChange.bind(this)} />
    
    // 创建隐藏的容器
    const container = document.createElement('div')
    container.style.display = 'none'
    document.body.appendChild(container)
    
    componentManager.renderComponent(this.componentId, component, container)
  }

  /**
   * 注册配置监听器
   * @param {Function} listener - 配置变更监听器
   */
  addConfigListener(listener) {
    this.configListeners.add(listener)
  }

  /**
   * 移除配置监听器
   * @param {Function} listener - 配置变更监听器
   */
  removeConfigListener(listener) {
    this.configListeners.delete(listener)
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.configListeners.clear()
    
    if (this.componentId) {
      componentManager.unmountComponent(this.componentId)
      this.componentId = null
    }
  }
}

/**
 * 配置监听组件 - 完全保持原有业务逻辑
 */
function MonitConfigForView({ onConfigChange }) {
  useEffect(() => {
    // 监听storage变更 - 保持原逻辑
    const handleStorageChange = (changes, area) => {
      if (area === 'local') {
        // 遍历变更的存储项 - 保持原逻辑
        const relevantChanges = Object.keys(changes).filter(
          (key) =>
            // 过滤出与userConfig相关的存储项 - 保持原逻辑
            key === 'alwaysShowToolSidebar' || key === 'alwaysFloatingSidebar',
        )

        // 如果有相关变更，重新获取完整的userConfig - 保持原逻辑
        if (relevantChanges.length > 0) {
          getUserConfig().then((newConfig) => {
            if (onConfigChange) {
              onConfigChange(newConfig)
            }
          })
        }
      }
    }

    // 添加监听器 - 保持原逻辑
    Browser.storage.onChanged.addListener(handleStorageChange)

    // 清理监听器 - 保持原逻辑
    return () => {
      Browser.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [onConfigChange])

  useEffect(() => {
    // 初始化渲染侧边栏 - 保持原逻辑
    getUserConfig().then((newConfig) => {
      if (onConfigChange && newConfig?.alwaysShowToolSidebar !== false) {
        onConfigChange(newConfig)
      }
    })
  }, [onConfigChange])

  return null
}

MonitConfigForView.propTypes = {
  onConfigChange: PropTypes.func,
} 