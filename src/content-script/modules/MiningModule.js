import googleSearchAutomationAdapter from '../leads-mining/adapters/googleSearchAutomationAdapter'

/**
 * 挖掘模块 - 单一职责：处理线索挖掘功能
 * 高内聚：所有挖掘相关的逻辑都在这里  
 * 低耦合：通过配置和工具函数与其他模块通信
 * 注意：实际的挖掘界面渲染由SidebarModule处理，避免重复功能
 */
export class MiningModule {
  constructor() {
    this.config = null
    this.automationInitialized = false
  }

  /**
   * 初始化挖掘模块
   * @param {Object} config - 用户配置
   */
  async init(config) {
    this.config = config
    
    console.log('MiningModule initialized - delegating rendering to SidebarModule')
    
    // 初始化自动化功能
    await this.initializeAutomation()
    
    return () => this.cleanup()
  }

  /**
   * 初始化自动化功能
   */
  async initializeAutomation() {
    if (this.automationInitialized) return
    
    try {
      // 初始化Google搜索自动化（如果有正在进行的任务）
      await googleSearchAutomationAdapter.initialize()
      
      // 注意：目标页面处理逻辑已整合到index.jsx中，不再需要单独的处理器
      
      this.automationInitialized = true
      console.log('MiningModule: 自动化功能初始化完成')
    } catch (error) {
      console.error('MiningModule: 自动化功能初始化失败:', error)
    }
  }

  /**
   * 销毁模块
   */
  async destroy() {
    await this.cleanup()
    this.config = null
    this.automationInitialized = false
    console.log('MiningModule destroyed')
  }

  /**
   * 配置变更处理
   * @param {Object} newConfig - 新配置
   */
  async onConfigChange(newConfig) {
    this.config = newConfig
  }

  /**
   * 清理资源
   */
  async cleanup() {
    // 正常情况下不做处理，因为刷新后还想按照原来的方式进行下去
    // try {
    //   if (googleSearchAutomationAdapter.isAutomating()) {
    //     await googleSearchAutomationAdapter.stopAutomation()
    //     console.log('MiningModule: 已停止正在运行的自动化')
    //   }
    // } catch (error) {
    //   console.error('MiningModule: 清理自动化资源失败:', error)
    // }
  }
} 