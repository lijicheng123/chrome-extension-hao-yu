import { shortDelay } from './delayUtils'

/**
 * 谷歌搜索自动化工具（简化版）
 * 只提供基础的搜索框操作功能
 */

/**
 * 获取谷歌搜索框
 * @returns {Element|null} 搜索框元素
 */
const getGoogleSearchInput = () => {
  // 尝试多种选择器找到搜索框
  const selectors = [
    'input[name="q"]',
    'textarea[name="q"]'
  ]
  
  for (const selector of selectors) {
    const input = document.querySelector(selector)
    if (input && input.offsetParent !== null) { // 确保元素可见
      return input
    }
  }
  
  console.warn('未找到谷歌搜索框')
  return null
}

/**
 * 清空搜索框内容
 * @returns {boolean} 是否成功清空
 */
export const clearSearchInput = () => {
  const input = getGoogleSearchInput()
  if (!input) return false
  
  try {
    input.value = ''
    input.focus()
    
    // 触发清空事件
    const events = ['input', 'change']
    events.forEach((eventType) => {
      const event = new Event(eventType, { bubbles: true })
      input.dispatchEvent(event)
    })
    
    return true
  } catch (error) {
    console.error('清空搜索框失败:', error)
    return false
  }
}

/**
 * 在搜索框中输入关键词（不自动搜索）
 * @param {string} keyword - 要输入的关键词
 * @returns {Promise<boolean>} 是否成功输入
 */
export const inputSearchKeyword = async (keyword) => {
  const input = getGoogleSearchInput()
  if (!input) return false
  
  try {
    // 先清空再输入
    clearSearchInput()
    
    // 模拟用户输入
    input.value = keyword
    input.focus()
    
    // 触发输入事件
    const events = ['input', 'change', 'keyup']
    events.forEach((eventType) => {
      const event = new Event(eventType, { bubbles: true })
      input.dispatchEvent(event)
    })
    
    await shortDelay()
    
    return true
  } catch (error) {
    console.error('输入关键词失败:', error)
    return false
  }
} 