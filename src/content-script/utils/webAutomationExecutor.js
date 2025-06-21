import { WebAutomationContentAPI } from '../../services/messaging/webAutomation.js'

/**
 * Web自动化执行器
 * 负责在content script中执行自动化任务
 * 生命周期由WebAutomationModule管理
 */
export class WebAutomationExecutor {
  constructor() {
    this.isInitialized = false
    this.currentTask = null
    this.config = null
  }

  /**
   * 初始化执行器
   */
  async init() {
    if (this.isInitialized) return

    console.log('初始化WebAutomationExecutor，等待任务信息...')
    this.isInitialized = true
  }

  /**
   * 处理初始化自动化任务消息（由WebAutomationContentAPI调用）
   * @param {Object} data - 初始化数据
   */
  handleInitializeAutomation(data) {
    console.log('初始化自动化任务:', data)
    
    // 保存任务信息
    this.currentTask = { 
      taskId: data.taskId, 
      configIndex: data.configIndex 
    }
    this.config = data.config
    
    // 通知background页面准备就绪
    WebAutomationContentAPI.notifyPageReady({
      taskId: data.taskId,
      configIndex: data.configIndex,
      url: window.location.href,
      title: document.title
    })
  }

  /**
   * 处理执行自动化任务消息（由WebAutomationContentAPI调用）
   * @param {Object} data - 执行数据
   */
  async handleExecuteAutomation(data) {
    console.log('开始执行自动化任务:', data)
    
    // 执行自动化
    await this.executeAutomation(data)
    console.log('自动化任务执行完成')
  }

  /**
   * 执行自动化操作
   * @param {Object} message - 消息对象
   */
  async executeAutomation(message) {
    const { config, taskId, configIndex } = message
    this.currentTask = { taskId, configIndex }
    this.config = config

    console.log('开始执行自动化操作:', config)

    try {
      let extractedData = {}

      // 等待页面完全加载
      await this.waitForPageLoad()


      // 执行操作序列
      for (const action of config.actions) {
        await this.executeAction(action)
        
        // 操作之间的延迟
        await this.delay(1000)
      }

      // 提取数据
      if (config.dataExtraction) {
        extractedData = await this.extractData(config.dataExtraction)
      }

      // 通知完成
      await WebAutomationContentAPI.notifyPageDataExtracted({
        taskId,
        configIndex,
        extractedData,
        url: window.location.href
      })

      console.log('自动化操作完成:', extractedData)

    } catch (error) {
      console.error('自动化操作失败:', error)
      
      // 通知失败
      await WebAutomationContentAPI.notifyPageDataExtracted({
        taskId,
        configIndex,
        error: error.message,
        url: window.location.href
      })
    }
  }

  /**
   * 等待页面完全加载
   */
  async waitForPageLoad() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve()
      } else {
        window.addEventListener('load', resolve, { once: true })
      }
    })
  }

  /**
   * 激活当前标签页
   */
  async activateTab() {
    try {
      await WebAutomationContentAPI.notifyPageTabActive({ url: window.location.href})
      window.focus()
      // 如果有标签页切换API，可以在这里调用
      console.log('标签页已激活')
    } catch (error) {
      console.warn('激活标签页失败:', error)
    }
  }

  /**
   * 执行单个操作
   * @param {Object} action - 操作配置
   */
  async executeAction(action) {
    console.log('执行操作:', action)

    switch (action.type) {
      case 'activate_tab':
        await this.activateTab({ url: window.location.href })
        break

      case 'scroll_to_bottom':
        await this.scrollToBottom(action.config)
        break
        
      case 'click_element':
        await this.clickElement(action.selector)
        break
        
      case 'scroll_into_view':
        await this.scrollIntoView(action.selector)
        break
        
      case 'wait':
        await this.delay(action.duration || 2000)
        break
        
      default:
        console.warn('未知操作类型:', action.type)
    }
  }

  /**
   * 滚动到页面底部
   * @param {Object} config - 滚动配置
   */
  async scrollToBottom(config = {}) {
    const { 
      scrollStep = 500, 
      scrollDelay = 1000, 
      maxScrolls = 20 
    } = config

    console.log('开始滚动到底部')

    let scrollCount = 0
    let lastScrollTop = 0

    while (scrollCount < maxScrolls) {
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop

      // 如果没有变化，说明已经到底部
      if (currentScrollTop === lastScrollTop && scrollCount > 0) {
        console.log('已到达页面底部')
        break
      }

      lastScrollTop = currentScrollTop

      // 滚动一定距离
      window.scrollBy(0, scrollStep)
      scrollCount++

      // 等待懒加载内容
      await this.delay(scrollDelay)
    }

    // 确保滚动到最底部
    window.scrollTo(0, document.body.scrollHeight)
    await this.delay(2000)
  }

  /**
   * 点击元素
   * @param {string} selector - 元素选择器
   */
  async clickElement(selector) {
    const element = document.querySelector(selector)
    if (!element) {
      throw new Error(`未找到元素: ${selector}`)
    }

    // 滚动到元素位置
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await this.delay(1000)

    // 点击元素
    element.click()
    console.log('已点击元素:', selector)
  }

  /**
   * 滚动元素到视口
   * @param {string} selector - 元素选择器
   */
  async scrollIntoView(selector) {
    const element = document.querySelector(selector)
    if (!element) {
      throw new Error(`未找到元素: ${selector}`)
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await this.delay(1000)
    console.log('已滚动到元素:', selector)
  }

  /**
   * 提取数据
   * @param {Object} config - 提取配置
   */
  async extractData(config) {
    const extractedData = {}

    switch (config.type) {
      case 'full_html':
        extractedData.html = document.documentElement.outerHTML
        extractedData.title = document.title
        extractedData.url = window.location.href
        break
        
      case 'page_content':
        extractedData.title = document.title
        extractedData.url = window.location.href
        extractedData.content = this.extractMainContent()
        break
        
      case 'custom_selectors':
        if (config.selectors) {
          for (const [key, selector] of Object.entries(config.selectors)) {
            const element = document.querySelector(selector)
            extractedData[key] = element ? element.textContent.trim() : null
          }
        }
        break
        
      default:
        extractedData.title = document.title
        extractedData.url = window.location.href
        extractedData.content = this.extractMainContent()
    }

    return extractedData
  }

  /**
   * 提取页面主要内容
   */
  extractMainContent() {
    // 尝试多种方式提取主要内容
    const selectors = [
      'main',
      'article', 
      '.content',
      '#content',
      '.main-content',
      'body'
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        return element.textContent.trim().substring(0, 5000) // 限制长度
      }
    }

    return document.body.textContent.trim().substring(0, 5000)
  }

  /**
   * 延迟执行
   * @param {number} ms - 延迟毫秒数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
} 