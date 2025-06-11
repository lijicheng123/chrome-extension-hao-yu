/**
 * 元素查找和操作工具
 * 统一项目中的元素查找逻辑，避免重复实现
 */

import { waitForElementToExistAndSelect } from '../../../utils/wait-for-element-to-exist-and-select.mjs'
import { getPossibleElementByQuerySelector } from '../../../utils/get-possible-element-by-query-selector.mjs'

/**
 * 使用多个选择器尝试查找元素
 * @param {Array<string>} selectors - 选择器数组
 * @param {string} logPrefix - 日志前缀，用于调试
 * @returns {Element|null} 找到的元素或null
 */
export const findElementBySelectors = (selectors, logPrefix = '元素') => {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector)
      if (element) {
        console.log(`${logPrefix}找到: ${selector}`)
        return element
      }
    } catch (error) {
      console.warn(`${logPrefix}选择器无效: ${selector}`, error)
    }
  }
  
  console.warn(`${logPrefix}未找到，尝试的选择器:`, selectors)
  return null
}

/**
 * 等待元素出现（使用项目通用工具）
 * @param {string} selector - CSS选择器
 * @param {number} timeout - 超时时间，默认5000ms
 * @returns {Promise<Element|null>} 找到的元素或null
 */
export const waitForElement = (selector, timeout = 5000) => {
  return waitForElementToExistAndSelect(selector, timeout)
}

/**
 * 使用项目通用工具查找元素
 * @param {Array<string>} selectors - 选择器数组
 * @returns {Element|null} 找到的元素或null
 */
export const findByPossibleSelectors = (selectors) => {
  return getPossibleElementByQuerySelector(selectors)
}

/**
 * 在指定容器内查找元素
 * @param {Array<string>} selectors - 选择器数组
 * @param {Element|null} container - 容器元素，为null时在document中查找
 * @param {string} logPrefix - 日志前缀
 * @returns {Element|null} 找到的元素或null
 */
export const findElementInContainer = (selectors, container = null, logPrefix = '容器元素') => {
  const searchContext = container || document
  
  for (const selector of selectors) {
    try {
      const element = searchContext.querySelector(selector)
      if (element) {
        console.log(`${logPrefix}找到: ${selector}`)
        return element
      }
    } catch (error) {
      console.warn(`${logPrefix}选择器无效: ${selector}`, error)
    }
  }
  
  console.warn(`${logPrefix}未找到，容器:`, container, '选择器:', selectors)
  return null
}

/**
 * 等待容器内的元素出现
 * @param {Array<string>} selectors - 选择器数组
 * @param {Element} container - 容器元素
 * @param {number} timeout - 超时时间，默认5000ms
 * @param {number} checkInterval - 检查间隔，默认200ms
 * @returns {Promise<Element|null>} 找到的元素或null
 */
export const waitForElementInContainer = async (selectors, container, timeout = 5000, checkInterval = 200) => {
  const startTime = Date.now()
  
  return new Promise((resolve) => {
    const checkElement = () => {
      const element = findElementInContainer(selectors, container, '等待容器元素')
      
      if (element) {
        resolve(element)
        return
      }
      
      if (Date.now() - startTime > timeout) {
        console.warn('等待容器内元素超时:', selectors)
        resolve(null)
        return
      }
      
      setTimeout(checkElement, checkInterval)
    }
    
    checkElement()
  })
}

/**
 * 检查元素是否在视图中
 * @param {Element} element - 要检查的元素
 * @returns {boolean} 是否在视图中
 */
export const isElementInView = (element) => {
  if (!element) return false
  
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

/**
 * 滚动元素到视图中
 * @param {Element} element - 要滚动的元素
 * @param {Object} options - 滚动选项
 * @param {string} options.behavior - 滚动行为，默认'smooth'
 * @param {string} options.block - 垂直对齐，默认'center'
 * @param {string} options.inline - 水平对齐，默认'nearest'
 */
export const scrollElementIntoView = (element, options = {}) => {
  if (!element) return
  
  const {
    behavior = 'smooth',
    block = 'center',
    inline = 'nearest'
  } = options
  
  element.scrollIntoView({
    behavior,
    block,
    inline
  })
}

/**
 * 等待元素变为可见状态
 * @param {Element} element - 要等待的元素
 * @param {number} timeout - 超时时间，默认5000ms
 * @param {number} checkInterval - 检查间隔，默认200ms
 * @returns {Promise<boolean>} 是否变为可见
 */
export const waitForElementVisible = async (element, timeout = 5000, checkInterval = 200) => {
  if (!element) return false
  
  const startTime = Date.now()
  
  return new Promise((resolve) => {
    const checkVisible = () => {
      if (element.offsetWidth > 0 && element.offsetHeight > 0) {
        resolve(true)
        return
      }
      
      if (Date.now() - startTime > timeout) {
        resolve(false)
        return
      }
      
      setTimeout(checkVisible, checkInterval)
    }
    
    checkVisible()
  })
} 