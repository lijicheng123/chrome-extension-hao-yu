import { WebAutomationContentAPI } from '../../services/messaging/webAutomation.js'
import { WebAutomationExecutor } from '../automation/webAutomationExecutor.js'

/**
 * Web自动化模块
 * 负责管理web自动化功能的完整生命周期：消息处理器注册、执行器初始化等
 */
export class WebAutomationModule {
  constructor() {
    this.isInitialized = false
    this.webAutomationExecutor = null
  }

  /**
   * 初始化模块
   */
  async init() {
    if (this.isInitialized) return

    console.log('WebAutomationModule正在初始化...')

    // 创建并初始化WebAutomationExecutor实例
    this.webAutomationExecutor = new WebAutomationExecutor()
    await this.webAutomationExecutor.init()

    // 将executor实例注册到全局，让WebAutomationContentAPI能够调用
    window.webAutomationExecutor = this.webAutomationExecutor

    // 注册Web自动化消息处理器
    WebAutomationContentAPI.registerHandlers()

    this.isInitialized = true
    console.log('WebAutomationModule初始化完成')

    // 返回清理函数
    return () => this.cleanup()
  }

  /**
   * 销毁模块
   */
  async destroy() {
    this.cleanup()
    console.log('WebAutomationModule已销毁')
  }

  /**
   * 配置变更处理
   * @param {Object} newConfig - 新配置
   */
  async onConfigChange(newConfig) {
    // Web自动化模块通常不需要处理配置变更
    console.log('WebAutomationModule配置变更:', newConfig)
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 清理全局引用
    if (window.webAutomationExecutor === this.webAutomationExecutor) {
      window.webAutomationExecutor = null
    }
    
    // 清理executor实例
    this.webAutomationExecutor = null
    this.isInitialized = false
  }
} 