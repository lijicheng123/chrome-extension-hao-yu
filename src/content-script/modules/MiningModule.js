/**
 * 挖掘模块 - 单一职责：处理线索挖掘功能
 * 高内聚：所有挖掘相关的逻辑都在这里  
 * 低耦合：通过配置和工具函数与其他模块通信
 * 注意：实际的挖掘界面渲染由SidebarModule处理，避免重复功能
 */
export class MiningModule {
  constructor() {
    this.config = null
  }

  /**
   * 初始化挖掘模块
   * @param {Object} config - 用户配置
   */
  async init(config) {
    this.config = config
    
    console.log('MiningModule initialized - delegating rendering to SidebarModule')
    
    return () => this.cleanup()
  }

  /**
   * 销毁模块
   */
  async destroy() {
    this.cleanup()
    this.config = null
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
  cleanup() {
    // 挖掘功能的实际渲染由SidebarModule处理，这里不需要清理
  }
} 