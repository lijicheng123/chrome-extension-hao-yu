import { createRoot } from 'react-dom/client'

/**
 * 组件管理器
 * 统一管理React组件的渲染和卸载
 */
export class ComponentManager {
  constructor() {
    this.containers = new Map()
    this.roots = new Map()
    this.config = null
  }

  /**
   * 初始化组件管理器
   * @param {Object} config - 用户配置
   */
  async init(config) {
    this.config = config
    console.log('ComponentManager initialized')
    
    // 返回清理函数
    return () => this.unmountAllComponents()
  }

  /**
   * 销毁组件管理器
   */
  async destroy() {
    this.unmountAllComponents()
    this.config = null
    console.log('ComponentManager destroyed')
  }

  /**
   * 配置变更处理
   * @param {Object} newConfig - 新配置
   */
  async onConfigChange(newConfig) {
    this.config = newConfig
  }

  /**
   * 渲染React组件
   * @param {string} id - 组件唯一标识
   * @param {ReactElement} component - React组件
   * @param {HTMLElement} container - 容器元素
   */
  renderComponent(id, component, container) {
    // 如果已存在同ID的组件，先卸载
    this.unmountComponent(id)

    try {
      const root = createRoot(container)
      root.render(component)

      // 保存引用
      this.containers.set(id, container)
      this.roots.set(id, root)

      // 保存到容器元素上，用于外部访问
      container._reactRoot = root
      container._componentId = id

      console.log(`Component rendered: ${id}`)
    } catch (error) {
      console.error(`Failed to render component ${id}:`, error)
      throw error
    }
  }

  /**
   * 卸载指定组件
   * @param {string} id - 组件唯一标识
   */
  unmountComponent(id) {
    const root = this.roots.get(id)
    const container = this.containers.get(id)

    if (root) {
      try {
        root.unmount()
        console.log(`Component unmounted: ${id}`)
      } catch (error) {
        console.error(`Error unmounting component ${id}:`, error)
      }
    }

    if (container) {
      // 清理容器上的引用
      delete container._reactRoot
      delete container._componentId
      
      // 如果容器仍在DOM中，移除它
      if (container.parentNode) {
        container.remove()
      }
    }

    this.roots.delete(id)
    this.containers.delete(id)
  }

  /**
   * 卸载所有组件
   */
  unmountAllComponents() {
    const componentIds = Array.from(this.roots.keys())
    for (const id of componentIds) {
      this.unmountComponent(id)
    }
  }

  /**
   * 检查组件是否已渲染
   * @param {string} id - 组件唯一标识
   * @returns {boolean} 是否已渲染
   */
  isComponentMounted(id) {
    return this.roots.has(id)
  }

  /**
   * 获取组件的容器元素
   * @param {string} id - 组件唯一标识
   * @returns {HTMLElement|null} 容器元素
   */
  getContainer(id) {
    return this.containers.get(id) || null
  }

  /**
   * 获取组件的React根实例
   * @param {string} id - 组件唯一标识
   * @returns {Root|null} React根实例
   */
  getRoot(id) {
    return this.roots.get(id) || null
  }

  /**
   * 更新组件（重新渲染）
   * @param {string} id - 组件唯一标识
   * @param {ReactElement} component - 新的React组件
   */
  updateComponent(id, component) {
    const root = this.roots.get(id)
    if (root) {
      try {
        root.render(component)
        console.log(`Component updated: ${id}`)
      } catch (error) {
        console.error(`Failed to update component ${id}:`, error)
        throw error
      }
    } else {
      console.warn(`Cannot update component ${id}: not mounted`)
    }
  }

  /**
   * 清理旧的组件容器（基于className）
   * @param {string} className - 要清理的容器类名
   */
  cleanupOldContainers(className) {
    const oldContainers = document.querySelectorAll(`.${className}`)
    oldContainers.forEach(container => {
      if (container._reactRoot) {
        try {
          container._reactRoot.unmount()
        } catch (error) {
          console.error('Error unmounting old container:', error)
        }
      }
      container.remove()
    })
  }

  /**
   * 获取所有已渲染组件的信息（用于调试）
   * @returns {Array} 组件信息数组
   */
  getComponentsInfo() {
    return Array.from(this.containers.entries()).map(([id, container]) => ({
      id,
      container: container.tagName,
      className: container.className,
      mounted: this.isComponentMounted(id)
    }))
  }

  /**
   * 获取当前组件数量
   * @returns {number} 组件数量
   */
  getComponentCount() {
    return this.roots.size
  }
}

// 导出单例实例
export const componentManager = new ComponentManager() 