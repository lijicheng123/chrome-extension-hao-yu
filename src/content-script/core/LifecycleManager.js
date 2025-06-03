/**
 * 生命周期管理器
 * 负责 content script 的启动、停止和清理
 */
export class LifecycleManager {
  constructor() {
    this.modules = new Map()
    this.isInitialized = false
    this.cleanupFunctions = []
  }

  /**
   * 注册模块
   * @param {string} name - 模块名称
   * @param {Object} module - 模块实例，需要实现 init 和 destroy 方法
   */
  registerModule(name, module) {
    if (!module.init || typeof module.init !== 'function') {
      throw new Error(`Module ${name} must implement init method`)
    }
    if (!module.destroy || typeof module.destroy !== 'function') {
      throw new Error(`Module ${name} must implement destroy method`)
    }
    this.modules.set(name, module)
  }

  /**
   * 初始化所有模块
   * @param {Object} config - 用户配置
   */
  async init(config) {
    if (this.isInitialized) {
      console.warn('LifecycleManager already initialized')
      return
    }

    try {
      console.log('Starting content script initialization...')
      
      // 按优先级初始化模块
      const initOrder = [
        'eventManager',       // 事件管理器（最高优先级）
        'componentManager',   // 组件管理器
        'config',            // 配置模块
        'utility',           // 工具模块
        'messageService',    // 消息服务
        'contextMenu',       // 右键菜单
        'siteAdapter',       // 网站适配
        'selectionTools',    // 划词工具
        'sidebar',           // 侧边栏
        'translation',       // 翻译
        'mining'             // 挖掘
      ]

      for (const moduleName of initOrder) {
        const module = this.modules.get(moduleName)
        if (module) {
          console.log(`Initializing module: ${moduleName}`)
          try {
            const cleanup = await module.init(config)
            if (cleanup && typeof cleanup === 'function') {
              this.cleanupFunctions.push(cleanup)
            }
          } catch (error) {
            console.error(`Failed to initialize module ${moduleName}:`, error)
            throw error
          }
        }
      }

      this.isInitialized = true
      console.log('Content script initialization completed')
    } catch (error) {
      console.error('Failed to initialize content script:', error)
      // 如果初始化失败，清理已初始化的模块
      await this.destroy()
      throw error
    }
  }

  /**
   * 销毁所有模块并清理资源
   */
  async destroy() {
    if (!this.isInitialized) {
      return
    }

    console.log('Destroying content script...')

    // 执行清理函数
    for (const cleanup of this.cleanupFunctions.reverse()) {
      try {
        await cleanup()
      } catch (error) {
        console.error('Error during cleanup:', error)
      }
    }

    // 销毁模块（逆序）
    const modules = Array.from(this.modules.entries()).reverse()
    for (const [name, module] of modules) {
      try {
        console.log(`Destroying module: ${name}`)
        await module.destroy()
      } catch (error) {
        console.error(`Error destroying module ${name}:`, error)
      }
    }

    this.modules.clear()
    this.cleanupFunctions = []
    this.isInitialized = false
    console.log('Content script destroyed')
  }

  /**
   * 重新加载配置
   * @param {Object} newConfig - 新的配置
   */
  async reloadConfig(newConfig) {
    if (!this.isInitialized) {
      return
    }

    console.log('Reloading configuration...')
    
    // 通知所有模块配置已更新
    for (const [name, module] of this.modules) {
      if (module.onConfigChange && typeof module.onConfigChange === 'function') {
        try {
          await module.onConfigChange(newConfig)
        } catch (error) {
          console.error(`Error reloading config for module ${name}:`, error)
        }
      }
    }
  }

  /**
   * 获取模块实例
   * @param {string} name - 模块名称
   * @returns {Object|null} 模块实例
   */
  getModule(name) {
    return this.modules.get(name) || null
  }

  /**
   * 检查是否已初始化
   */
  get initialized() {
    return this.isInitialized
  }
}

// 导出单例实例
export const lifecycleManager = new LifecycleManager() 