import { config as siteConfig } from '../site-adapters/index.mjs'
import { componentManager } from '../core/ComponentManager.js'
import { getPossibleElementByQuerySelector } from '../../utils'
import DecisionCard from '../../components/DecisionCard/index.jsx'
import { initSession } from '../../services/init-session.mjs'

/**
 * 网站适配模块
 * 处理不同网站的适配逻辑
 */
export class SiteAdapterModule {
  constructor() {
    this.config = null
    this.currentSite = null
  }

  /**
   * 初始化网站适配模块
   * @param {Object} config - 用户配置
   */
  async init(config) {
    this.config = config
    
    // 检查当前网站是否需要适配
    await this.checkSiteAdapter(config)
    
    console.log('SiteAdapterModule initialized')
    
    // 返回清理函数
    return () => this.cleanup()
  }

  /**
   * 销毁模块
   */
  async destroy() {
    this.cleanup()
    this.config = null
    this.currentSite = null
    console.log('SiteAdapterModule destroyed')
  }

  /**
   * 配置变更处理
   * @param {Object} newConfig - 新配置
   */
  async onConfigChange(newConfig) {
    this.config = newConfig
    // 重新检查网站适配
    await this.checkSiteAdapter(newConfig)
  }

  /**
   * 检查网站适配
   * @param {Object} userConfig - 用户配置
   */
  async checkSiteAdapter(userConfig) {
    let siteRegex
    
    if (userConfig.useSiteRegexOnly) {
      siteRegex = userConfig.siteRegex
    } else {
      siteRegex = new RegExp(
        (userConfig.siteRegex && userConfig.siteRegex + '|') + Object.keys(siteConfig).join('|')
      )
    }

    const matches = location.hostname.match(siteRegex)
    if (!matches) {
      console.log(`SiteAdapterModule: 当前站点 ${location.hostname} 不匹配任何配置的网站`)
      return
    }

    const siteName = matches[0]
    this.currentSite = siteName
    console.log(`SiteAdapterModule: 匹配到网站 ${siteName}`)

    if (
      userConfig.siteAdapters.includes(siteName) &&
      !userConfig.activeSiteAdapters.includes(siteName)
    ) {
      console.log(`SiteAdapterModule: 网站 ${siteName} 被用户禁用`)
      return
    }

    let initSuccess = true
    if (siteName in siteConfig) {
      const siteAction = siteConfig[siteName].action
      if (siteAction && siteAction.init) {
        initSuccess = await siteAction.init(
          location.hostname, 
          userConfig, 
          this.getInput.bind(this), 
          this.mountComponent.bind(this)
        )
      }
    }

    if (initSuccess) {
      await this.mountComponent(siteConfig[siteName])
    }
  }

  /**
   * 获取输入内容
   * @param {string[]|function} inputQuery - 输入查询
   * @returns {Promise<string>} 输入内容
   */
  async getInput(inputQuery) {
    const { getPreferredLanguage } = await import('../../config/language.mjs')
    
    let input
    if (typeof inputQuery === 'function') {
      input = await inputQuery()
      const replyPromptBelow = `Reply in ${await getPreferredLanguage()}. Regardless of the language of content I provide below. !!This is very important!!`
      const replyPromptAbove = `Reply in ${await getPreferredLanguage()}. Regardless of the language of content I provide above. !!This is very important!!`
      if (input) return `${replyPromptBelow}\n\n` + input + `\n\n${replyPromptAbove}`
      return input
    }
    
    const searchInput = getPossibleElementByQuerySelector(inputQuery)
    if (searchInput) {
      if (searchInput.value) input = searchInput.value
      else if (searchInput.textContent) input = searchInput.textContent
      if (input) {
        return (
          `Reply in ${await getPreferredLanguage()}.\nThe following is a search input in a search engine, ` +
          `giving useful content or solutions and as much information as you can related to it, ` +
          `use markdown syntax to make your answer more readable, such as code blocks, bold, list:\n` +
          input
        )
      }
    }
  }

  /**
   * 挂载组件
   * @param {Object} siteConfig - 网站配置
   */
  async mountComponent(siteConfig) {
    const question = siteConfig?.question || ''
    
    if (!this.config.alwaysFloatingSidebar) {
      const retry = 10
      let oldUrl = location.href
      
      for (let i = 1; i <= retry; i++) {
        if (location.href !== oldUrl) {
          console.log(`SiteAdapters Retry ${i}/${retry}: stop`)
          return
        }
        
        const e =
          (siteConfig &&
            (getPossibleElementByQuerySelector(siteConfig.sidebarContainerQuery) ||
              getPossibleElementByQuerySelector(siteConfig.appendContainerQuery) ||
              getPossibleElementByQuerySelector(siteConfig.resultsContainerQuery))) ||
          getPossibleElementByQuerySelector([this.config.prependQuery]) ||
          getPossibleElementByQuerySelector([this.config.appendQuery])
          
        if (e) {
          console.log(`SiteAdapters Retry ${i}/${retry}: found`)
          break
        } else {
          console.log(`SiteAdapters Retry ${i}/${retry}: not found`)
          if (i === retry) return
          else await new Promise((r) => setTimeout(r, 500))
        }
      }
    }

    // 清理旧的容器
    componentManager.cleanupOldContainers('chatgptbox-container')

    const container = document.createElement('div')
    container.id = 'chatgptbox-container'
    container.className = 'haoyu-adapter-container'
    
    const componentId = `site-adapter-${this.currentSite}-${Date.now()}`
    
    const component = (
      <DecisionCard
        session={initSession({
          modelName: this.config.modelName,
          apiMode: this.config.apiMode,
          extraCustomModelName: this.config.customModelName,
        })}
        question={question}
        siteConfig={siteConfig}
        container={container}
      />
    )

    componentManager.renderComponent(componentId, component, container)
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 清理网站适配相关的组件
    componentManager.cleanupOldContainers('chatgptbox-container')
  }
}

// 导出单例实例
export const siteAdapterModule = new SiteAdapterModule() 