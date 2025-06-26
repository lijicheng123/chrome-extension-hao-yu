import { eventManager } from '../core/EventManager.js'
import { componentManager } from '../core/ComponentManager.js'
import { createElementAtPosition, cropText } from '../../utils'
import { config as toolsConfig } from '../selection-tools'
import { config as menuConfig } from '../menu-tools'
import FloatingToolbar from '../../components/FloatingToolbar/index.jsx'
import { initSession } from '../../services/init-session.mjs'
import { getUserConfig } from '../../config/index.mjs'
import { getPreferredLanguage } from '../../config/language.mjs'
import uiService, { UI_API } from '../../services/messaging/ui'
import { renderBatchImageDownloader } from '../utils/BatchImageDownloader.js'

/**
 * 右键菜单模块 - 单一职责：处理右键菜单相关功能
 * 高内聚：所有右键菜单的逻辑都在这里
 * 低耦合：通过消息服务与其他模块通信
 */
export class ContextMenuModule {
  constructor() {
    this.config = null
    this.menuX = 0
    this.menuY = 0
    this.toolbarContainer = null
    this.componentId = null
    this.isInitialized = false
  }

  /**
   * 初始化右键菜单模块
   * @param {Object} config - 用户配置
   */
  async init(config) {
    if (this.isInitialized) {
      console.warn('ContextMenuModule already initialized')
      return
    }

    this.config = config
    
    // 初始化右键菜单功能
    this.initContextMenu()
    
    // 注册UI消息处理器
    this.registerUIHandlers()
    
    this.isInitialized = true
    console.log('ContextMenuModule initialized')
    
    return () => this.cleanup()
  }

  /**
   * 销毁模块
   */
  async destroy() {
    this.cleanup()
    this.config = null
    this.isInitialized = false
    console.log('ContextMenuModule destroyed')
  }

  /**
   * 配置变更处理
   * @param {Object} newConfig - 新配置
   */
  async onConfigChange(newConfig) {
    this.config = newConfig
  }

  /**
   * 初始化右键菜单功能
   */
  initContextMenu() {
    // 监听右键事件，记录菜单位置
    const handleContextMenu = (e) => {
      this.menuX = e.clientX
      this.menuY = e.clientY
    }

    eventManager.addListener('context-menu', document, 'contextmenu', handleContextMenu)
  }

  /**
   * 注册UI消息处理器
   */
  registerUIHandlers() {
    uiService.registerHandlers({
      // 创建聊天处理器
      [UI_API.CREATE_CHAT]: async (data) => {
        let prompt = ''
        
        // 根据不同的工具配置生成提示词
        if (data.itemId in toolsConfig) {
          const userConfig = await getUserConfig()
          const customPrompt = userConfig.selectionToolsPrompts?.[data.itemId]
          
          if (customPrompt) {
            // 使用自定义prompt
            prompt = customPrompt.replace('{{selection}}', data.selectionText)
          } else {
            // 使用默认genPrompt
            prompt = await toolsConfig[data.itemId].genPrompt(data.selectionText)
          }
        } else if (data.itemId in menuConfig) {
          const menuItem = menuConfig[data.itemId]
          if (menuItem.genPrompt) {
            prompt = await menuItem.genPrompt()
            if (prompt) {
              prompt = await cropText(`Reply in ${await getPreferredLanguage()}.\n` + prompt)
            }
          }
        }
        
        // 确定位置
        const position = data.useMenuPosition
          ? { x: this.menuX, y: this.menuY }
          : { x: window.innerWidth / 2 - 300, y: window.innerHeight / 2 - 200 }
        
        // 创建容器并渲染工具栏
        await this.createContextToolbar(data, position, prompt)
        
        return { success: true }
      },
      
      // 关闭工具栏处理器
      [UI_API.CLOSE_TOOLBAR]: () => {
        this.deleteToolbar()
        return { success: true }
      },
      
      // 打开批量图片下载器处理器
      [UI_API.OPEN_BATCH_IMAGE_DOWNLOADER]: () => {
        renderBatchImageDownloader()
        return { success: true }
      },
    })
  }

  /**
   * 创建右键菜单触发的工具栏
   * @param {Object} data - 菜单数据
   * @param {Object} position - 位置信息
   * @param {string} prompt - 提示词
   */
  async createContextToolbar(data, position, prompt) {
    // 清理现有工具栏
    this.deleteToolbar()
    
    // 创建容器
    this.toolbarContainer = createElementAtPosition(position.x, position.y, data.containerType)
    this.toolbarContainer.className = 'chatgptbox-toolbar-container-not-queryable'
    
    const userConfig = await getUserConfig()
    this.componentId = `context-toolbar-${Date.now()}`
    
    const component = (
      <FloatingToolbar
        session={initSession({
          modelName: userConfig.modelName,
          apiMode: userConfig.apiMode,
          extraCustomModelName: userConfig.customModelName,
        })}
        selection={data.selectionText}
        container={this.toolbarContainer}
        triggered={true}
        closeable={true}
        prompt={prompt}
      />
    )

    componentManager.renderComponent(this.componentId, component, this.toolbarContainer)
  }

  /**
   * 删除工具栏
   */
  deleteToolbar() {
    if (this.toolbarContainer) {
      this.toolbarContainer.remove()
      this.toolbarContainer = null
    }
    
    if (this.componentId) {
      componentManager.unmountComponent(this.componentId)
      this.componentId = null
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.deleteToolbar()
    // 事件监听器会由 EventManager 统一清理
    // UI处理器会在uiService中统一清理
  }
} 