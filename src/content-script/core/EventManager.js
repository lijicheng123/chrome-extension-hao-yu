/**
 * 事件管理器
 * 统一管理所有DOM事件监听器
 */
export class EventManager {
  constructor() {
    this.listeners = new Map()
    this.config = null
  }

  /**
   * 初始化事件管理器
   * @param {Object} config - 用户配置
   */
  async init(config) {
    this.config = config
    console.log('EventManager initialized')
    
    // 返回清理函数
    return () => this.removeAllListeners()
  }

  /**
   * 销毁事件管理器
   */
  async destroy() {
    this.removeAllListeners()
    this.config = null
    console.log('EventManager destroyed')
  }

  /**
   * 配置变更处理
   * @param {Object} newConfig - 新配置
   */
  async onConfigChange(newConfig) {
    this.config = newConfig
  }

  /**
   * 添加事件监听器
   * @param {string} id - 监听器唯一标识
   * @param {Element|Document|Window} target - 目标元素
   * @param {string} event - 事件类型
   * @param {Function} handler - 事件处理函数
   * @param {Object} options - 事件选项
   */
  addListener(id, target, event, handler, options = {}) {
    // 如果已存在同ID的监听器，先移除
    this.removeListener(id)

    const listenerInfo = {
      target,
      event,
      handler,
      options
    }

    target.addEventListener(event, handler, options)
    this.listeners.set(id, listenerInfo)
  }

  /**
   * 移除指定的事件监听器
   * @param {string} id - 监听器唯一标识
   */
  removeListener(id) {
    const listenerInfo = this.listeners.get(id)
    if (listenerInfo) {
      const { target, event, handler, options } = listenerInfo
      target.removeEventListener(event, handler, options)
      this.listeners.delete(id)
    }
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners() {
    for (const [id] of this.listeners) {
      this.removeListener(id)
    }
  }

  /**
   * 创建防抖事件处理器
   * @param {Function} fn - 原始函数
   * @param {number} delay - 延迟时间
   * @returns {Function} 防抖后的函数
   */
  debounce(fn, delay) {
    let timeoutId
    return (...args) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn.apply(this, args), delay)
    }
  }

  /**
   * 创建节流事件处理器
   * @param {Function} fn - 原始函数
   * @param {number} limit - 限制时间
   * @returns {Function} 节流后的函数
   */
  throttle(fn, limit) {
    let inThrottle
    return (...args) => {
      if (!inThrottle) {
        fn.apply(this, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  /**
   * 检查元素是否在指定容器内
   * @param {Element} element - 要检查的元素
   * @param {Element} container - 容器元素
   * @returns {boolean} 是否在容器内
   */
  isElementInContainer(element, container) {
    if (!element || !container) return false
    return container.contains(element)
  }

  /**
   * 获取当前监听器数量
   * @returns {number} 监听器数量
   */
  getListenerCount() {
    return this.listeners.size
  }

  /**
   * 获取所有监听器信息（用于调试）
   * @returns {Array} 监听器信息数组
   */
  getListenersInfo() {
    return Array.from(this.listeners.entries()).map(([id, info]) => ({
      id,
      target: info.target.tagName || info.target.constructor.name,
      event: info.event
    }))
  }
}

// 导出单例实例
export const eventManager = new EventManager() 