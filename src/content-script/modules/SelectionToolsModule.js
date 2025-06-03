import { eventManager } from '../core/EventManager.js'
import { componentManager } from '../core/ComponentManager.js'
import { createElementAtPosition, getClientPosition } from '../../utils'
import FloatingToolbar from '../../components/FloatingToolbar/index.jsx'
import { initSession } from '../../services/init-session.mjs'
import { getUserConfig } from '../../config/index.mjs'

/**
 * 划词工具模块 - 单一职责：处理文本选择和浮动工具栏
 * 高内聚：所有划词相关的逻辑都在这里
 * 低耦合：只依赖必要的工具函数和组件
 */
export class SelectionToolsModule {
  constructor() {
    this.config = null
    this.toolbarContainer = null
    this.componentId = null
  }

  /**
   * 初始化划词工具模块
   * @param {Object} config - 用户配置
   */
  async init(config) {
    this.config = config
    
    // 初始化PC端划词功能
    this.initDesktopSelectionTools()
    
    // 初始化移动端划词功能  
    this.initMobileSelectionTools()
    
    console.log('SelectionToolsModule initialized')
    
    return () => this.cleanup()
  }

  /**
   * 销毁模块
   */
  async destroy() {
    this.cleanup()
    this.config = null
    console.log('SelectionToolsModule destroyed')
  }

  /**
   * 配置变更处理
   * @param {Object} newConfig - 新配置
   */
  async onConfigChange(newConfig) {
    this.config = newConfig
  }

  /**
   * 初始化PC端划词功能
   * 业务逻辑完全保持与备份文件一致
   */
  initDesktopSelectionTools() {
    // 鼠标抬起事件 - 显示工具栏
    const handleMouseUp = (e) => {
      // 如果点击在工具栏上，不处理
      if (this.toolbarContainer && this.toolbarContainer.contains(e.target)) return
      
      // 检查选中元素是否在工具栏内
      const selectionElement = window.getSelection()?.rangeCount > 0 &&
        window.getSelection()?.getRangeAt(0).endContainer.parentElement
      if (this.toolbarContainer && selectionElement && 
          this.toolbarContainer.contains(selectionElement)) return

      // 删除现有工具栏
      this.deleteToolbar()
      
      // 延迟处理选择文本，确保选择状态稳定
      setTimeout(async () => {
        const selection = window.getSelection()?.toString().trim().replace(/^-+|-+$/g, '')
        
        if (selection) {
          await this.createSelectionToolbar(selection, e)
        }
      })
    }

    // 鼠标按下事件 - 清理工具栏
    const handleMouseDown = (e) => {
      if (this.toolbarContainer && this.toolbarContainer.contains(e.target)) return
      this.deleteAllToolbars()
    }

    // 键盘事件 - 处理输入框中的选择
    const handleKeyDown = (e) => {
      if (this.toolbarContainer && 
          !this.toolbarContainer.contains(e.target) &&
          (e.target.nodeName === 'INPUT' || e.target.nodeName === 'TEXTAREA')) {
        setTimeout(() => {
          if (!window.getSelection()?.toString().trim()) {
            this.deleteToolbar()
          }
        })
      }
    }

    // 注册事件监听器
    eventManager.addListener('selection-mouseup', document, 'mouseup', handleMouseUp)
    eventManager.addListener('selection-mousedown', document, 'mousedown', handleMouseDown)
    eventManager.addListener('selection-keydown', document, 'keydown', handleKeyDown)
  }

  /**
   * 初始化移动端划词功能  
   * 业务逻辑完全保持与备份文件一致
   */
  initMobileSelectionTools() {
    // 触摸结束事件 - 显示工具栏
    const handleTouchEnd = (e) => {
      if (this.toolbarContainer && this.toolbarContainer.contains(e.target)) return
      
      // 检查选中元素是否在工具栏内
      if (this.toolbarContainer &&
          window.getSelection()?.rangeCount > 0 &&
          this.toolbarContainer.contains(window.getSelection()?.getRangeAt(0).endContainer.parentElement)) {
        return
      }

      this.deleteToolbar()
      
      setTimeout(() => {
        const selection = window.getSelection()?.toString().trim().replace(/^-+|-+$/g, '')
        
        if (selection) {
          const touch = e.changedTouches[0]
          this.toolbarContainer = createElementAtPosition(
            touch.pageX + 20,
            touch.pageY + 20
          )
          this.createSelectionTools(this.toolbarContainer, selection)
        }
      })
    }

    // 触摸开始事件 - 清理工具栏
    const handleTouchStart = (e) => {
      if (this.toolbarContainer && this.toolbarContainer.contains(e.target)) return
      this.deleteAllToolbars()
    }

    // 注册事件监听器
    eventManager.addListener('selection-touchend', document, 'touchend', handleTouchEnd)
    eventManager.addListener('selection-touchstart', document, 'touchstart', handleTouchStart)
  }

  /**
   * 创建选择工具栏
   * 完全保持原有的位置计算逻辑
   * @param {string} selection - 选中的文本
   * @param {Event} e - 鼠标事件
   */
  async createSelectionToolbar(selection, e) {
    let position

    // 获取选中文本的位置和尺寸 - 保持原逻辑
    const selectionRange = window.getSelection().getRangeAt(0)
    const selectionRect = selectionRange.getBoundingClientRect()

    // 将浮条放在选中文本的底部5px处 - 保持原逻辑
    position = {
      x: selectionRect.left + window.scrollX,
      y: selectionRect.bottom + window.scrollY + 5
    }

    // 配置检查：在输入框旁边显示 - 保持原逻辑
    const config = this.config || (await getUserConfig())
    if (config.selectionToolsNextToInputBox) {
      const selectionElement = window.getSelection()?.rangeCount > 0 &&
        window.getSelection()?.getRangeAt(0).endContainer.parentElement
      const inputElement = selectionElement?.querySelector('input, textarea')
      
      if (inputElement) {
        const inputPosition = getClientPosition(inputElement)
        position = {
          x: inputPosition.x + window.scrollX + inputElement.offsetWidth + 50,
          y: e.pageY + 30
        }
      }
    }

    this.toolbarContainer = createElementAtPosition(position.x, position.y)
    await this.createSelectionTools(this.toolbarContainer, selection)
  }

  /**
   * 创建选择工具 - 保持原有的渲染逻辑
   * @param {HTMLElement} toolbarContainer - 工具栏容器
   * @param {string} selection - 选中内容
   */
  async createSelectionTools(toolbarContainer, selection) {
    toolbarContainer.className = 'chatgptbox-toolbar-container'
    
    const userConfig = await getUserConfig()
    this.componentId = `selection-toolbar-${Date.now()}`
    
    const component = (
      <FloatingToolbar
        session={initSession({
          modelName: userConfig.modelName,
          apiMode: userConfig.apiMode,
          extraCustomModelName: userConfig.customModelName,
        })}
        selection={selection}
        container={toolbarContainer}
        closeable={true}
        dockable={true}
      />
    )

    componentManager.renderComponent(this.componentId, component, toolbarContainer)
  }

  /**
   * 删除当前工具栏
   */
  deleteToolbar() {
    if (this.toolbarContainer && 
        this.toolbarContainer.className === 'chatgptbox-toolbar-container') {
      this.toolbarContainer.remove()
      this.toolbarContainer = null
    }
    
    if (this.componentId) {
      componentManager.unmountComponent(this.componentId)
      this.componentId = null
    }
  }

  /**
   * 删除所有工具栏 - 保持原逻辑
   */
  deleteAllToolbars() {
    document.querySelectorAll('.chatgptbox-toolbar-container').forEach(e => e.remove())
    this.toolbarContainer = null
    if (this.componentId) {
      componentManager.unmountComponent(this.componentId)
      this.componentId = null
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.deleteAllToolbars()
    // 事件监听器会由 EventManager 统一清理
  }
}

// 导出单例实例
export const selectionToolsModule = new SelectionToolsModule() 