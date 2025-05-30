import { extractGoogleMapsContacts } from './googleMapsExtractor'
import { mediumDelay, shortDelay, longDelay } from './delayUtils'
import { message } from 'antd'
import Browser from 'webextension-polyfill'

/**
 * 谷歌地图自动化工具
 * 用于自动执行谷歌地图的搜索和数据提取操作
 */

/**
 * 获取谷歌地图搜索框
 * @returns {Element|null} 搜索框元素
 */
const getGoogleMapsSearchInput = () => {
  // 尝试多种选择器找到搜索框
  const selectors = [
    'input[id="searchboxinput"]',
    'input[placeholder*="搜索"]',
    'input[placeholder*="Search"]',
    'input[aria-label*="搜索"]',
    'input[data-test-id="searchbox-input"]',
    'input[name="q"]',
  ]
  
  for (const selector of selectors) {
    const input = document.querySelector(selector)
    if (input) {
      console.log(`找到搜索框: ${selector}`)
      return input
    }
  }
  
  console.warn('未找到谷歌地图搜索框')
  return null
}

/**
 * 获取谷歌地图搜索按钮
 * @returns {Element|null} 搜索按钮元素
 */
const getGoogleMapsSearchButton = () => {
  // 尝试多种选择器找到搜索按钮
  const selectors = [
    'button[id="searchbox-searchbutton"]',
    'button[aria-label*="搜索"]',
    'button[aria-label*="Search"]',
    'button[data-test-id="searchbox-searchbutton"]',
    '[jsaction*="search"] button',
  ]
  
  for (const selector of selectors) {
    const button = document.querySelector(selector)
    if (button) {
      console.log(`找到搜索按钮: ${selector}`)
      return button
    }
  }
  
  console.warn('未找到谷歌地图搜索按钮')
  return null
}

/**
 * 清空搜索框
 * @returns {boolean} 是否成功清空
 */
export const clearSearchInput = () => {
  const input = getGoogleMapsSearchInput()
  if (!input) return false
  
  try {
    // 尝试多种方式清空输入框
    input.value = ''
    input.focus()
    input.select()
    
    // 触发清空事件
    const events = ['input', 'change', 'keyup']
    events.forEach((eventType) => {
      const event = new Event(eventType, { bubbles: true })
      input.dispatchEvent(event)
    })
    
    console.log('搜索框已清空')
    return true
  } catch (error) {
    console.error('清空搜索框失败:', error)
    return false
  }
}

/**
 * 在搜索框中输入关键词
 * @param {string} keyword - 要搜索的关键词
 * @returns {boolean} 是否成功输入
 */
export const inputSearchKeyword = (keyword) => {
  const input = getGoogleMapsSearchInput()
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
    
    console.log(`已输入关键词: ${keyword}`)
    return true
  } catch (error) {
    console.error('输入关键词失败:', error)
    return false
  }
}

/**
 * 点击搜索按钮
 * @returns {Promise<boolean>} 是否成功点击
 */
const clickSearchButton = async () => {
  const button = getGoogleMapsSearchButton()
  if (!button) return false
  
  try {
    // 点击前等待1-2秒
    await mediumDelay()
    
    button.click()
    console.log('已点击搜索按钮')
    // 稍微等久一点再开始后面的任务
    await longDelay()
    return true
  } catch (error) {
    console.error('点击搜索按钮失败:', error)
    return false
  }
}

/**
 * 执行搜索操作
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<boolean>} 是否搜索成功
 */
export const performGoogleMapsSearch = async (keyword) => {
  try {
    console.log(`开始搜索: ${keyword}`)
    
    // 输入关键词
    if (!inputSearchKeyword(keyword)) {
      throw new Error('输入关键词失败')
    }
    
    // 短暂延迟
    await shortDelay()
    
    // 点击搜索
    if (!(await clickSearchButton())) {
      throw new Error('点击搜索按钮失败')
    }
    
    // 等待搜索结果加载
    await mediumDelay()
    
    console.log(`搜索完成: ${keyword}`)
    return true
  } catch (error) {
    console.error('执行搜索失败:', error)
    message.error(`搜索失败: ${error.message}`)
    return false
  }
}

/**
 * 获取搜索结果列表
 * @returns {Element[]} 搜索结果元素数组
 */
export const getSearchResults = () => {
  // 获取所有结果项
  const results =
    Array.from(document.querySelectorAll('div[role="feed"][tabindex="-1"] div>div[jsaction]>a')) ||
    []
  console.log(`找到 ${results.length} 个搜索结果`)
  
  return results
}

/**
 * 等待详情面板完全加载并有内容
 * @param {number} maxWaitTime - 最大等待时间（毫秒），默认10秒
 * @returns {Promise<boolean>} 是否成功加载
 */
const waitForDetailPanelLoaded = async (maxWaitTime = 10000) => {
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      // 检查面板是否存在并有内容
      const panelContainer = document.querySelector('div[jstcache="4"] div[tabindex="-1"]')
      if (panelContainer) {
        const heading = panelContainer.querySelector('h1')
        if (heading && heading.textContent.trim()) {
          console.log('详情面板已加载，标题:', heading.textContent.trim())
          return true
        }
      }
      
      // 等待一小段时间后重试
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch (error) {
      console.error('检查详情面板时出错:', error)
    }
  }
  
  console.warn('等待详情面板超时')
  return false
}

/**
 * 关闭详情面板
 * @returns {Promise<boolean>} 是否成功关闭
 */
const closeDetailPanel = async () => {
  try {
    // 查找关闭按钮
    const closeButton = document.querySelector(
      'div[jstcache="4"] div[role="main"] button[jscontroller][jsaction]'
    )
    if (closeButton) {
      // 点击前等待1-2秒
      await mediumDelay()
      
      closeButton.click()
      console.log('已点击关闭详情面板')
      
      // 等待面板关闭
      await shortDelay()
      return true
    }
    console.warn('未找到详情面板关闭按钮')
    return false
  } catch (error) {
    console.error('关闭详情面板失败:', error)
    return false
  }
}

/**
 * 设置搜索结果的视觉状态
 * @param {Element} element - 结果元素
 * @param {string} status - 状态: 'upcoming'(即将点击), 'clicking'(正在点击), 'completed'(已完成)
 */
const setResultElementStatus = (element, status) => {
  // 清除之前的状态样式
  element.style.border = ''
  element.style.boxShadow = ''
  element.style.backgroundColor = ''
  element.style.opacity = ''
  
  switch (status) {
    case 'upcoming':
      // 即将点击：淡蓝色边框
      element.style.border = '2px solid #87CEEB'
      element.style.backgroundColor = '#f0f8ff'
      element.style.opacity = '0.9'
      break
    case 'clicking':
      // 正在点击：红色边框，突出显示
      element.style.border = '2px solid #ff4d4f'
      element.style.boxShadow = '0 0 10px rgba(255, 77, 79, 0.5)'
      element.style.backgroundColor = '#fff2f0'
      element.style.opacity = '0.8'
      break
    case 'completed':
      // 已完成：绿色边框，半透明
      element.style.border = '2px solid #52c41a'
      element.style.backgroundColor = '#f6ffed'
      element.style.opacity = '0.7'
      break
    default:
      break
  }
}

/**
 * 滚动元素到可视区域
 * @param {Element} element - 要滚动的元素
 * @returns {Promise<void>}
 */
const scrollElementIntoView = async (element) => {
  try {
    // 标记为即将点击状态
    setResultElementStatus(element, 'upcoming')
    
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest',
    })
    
    // 等待滚动完成
    await shortDelay()
    
    console.log('元素已滚动到可视区域')
  } catch (error) {
    console.error('滚动元素失败:', error)
  }
}

   
/**
 * 检查是否到达结果列表底部
 * @returns {boolean} 是否到达底部
 */
export const isResultListAtBottom = () => {
  const noMoreResults = document.querySelector('div[role="feed"][tabindex="-1"]>div>div>p>span>span')
  return !!noMoreResults
}

/**
 * 点击搜索结果项
 * @param {Element} resultElement - 结果元素
 * @returns {Promise<boolean>} 是否点击成功
 */
const clickSearchResult = async (resultElement) => {
  try {
    // 先滚动到可视区域
    await scrollElementIntoView(resultElement)
    
    // 标记为正在点击状态
    setResultElementStatus(resultElement, 'clicking')
    
    // 点击前等待1-2秒
    await shortDelay()
    
    // 点击链接
    resultElement.click()
    console.log('已点击搜索结果')
    
    // 等待详情面板加载
    await mediumDelay()
    
    return true
  } catch (error) {
    console.error('点击搜索结果失败:', error)
    return false
  }
}

/**
 * 处理单个搜索结果
 * @param {Element} resultElement - 结果元素
 * @param {number} index - 结果索引
 * @param {string} keyword - 当前挖掘的关键词
 * @returns {Promise<Array>} 提取的联系人数据
 */
const processSearchResult = async (resultElement, index, keyword = '') => {
  try {
    console.log(`处理第 ${index + 1} 个搜索结果`)
    
    // 点击结果
    const clicked = await clickSearchResult(resultElement)
    if (!clicked) {
      console.warn(`第 ${index + 1} 个结果点击失败，跳过`)
      return []
    }
    
    // 等待面板完全加载
    const panelLoaded = await waitForDetailPanelLoaded()
    if (!panelLoaded) {
      console.warn(`第 ${index + 1} 个结果面板加载失败，跳过`)
      setResultElementStatus(resultElement, 'completed')
      return []
    }
    
    // 提取数据，传递关键词信息
    const contacts = extractGoogleMapsContacts(keyword)
    
    // 关闭详情面板
    await closeDetailPanel()
    
    // 标记为已完成状态
    setResultElementStatus(resultElement, 'completed')
    
    console.log(`第 ${index + 1} 个结果处理完成，提取到 ${contacts.length} 个联系人`)
    return contacts
  } catch (error) {
    console.error(`处理第 ${index + 1} 个结果时出错:`, error)
    // 出错时也标记为已完成，避免重复处理
    setResultElementStatus(resultElement, 'completed')
    return []
  }
}

/**
 * 滚动结果列表到底部以触发加载更多
 * @returns {Promise<void>}
 */
const scrollResultsToBottom = async () => {
  try {
    // 找到结果列表容器
    const resultsContainer = document.querySelector('div[role="feed"][tabindex="-1"]')
    if (resultsContainer) {
      // 滚动到底部
      resultsContainer.scrollTop = resultsContainer.scrollHeight
      console.log('已滚动结果列表到底部')
    } else {
      // 如果找不到容器，尝试滚动页面
      window.scrollTo(0, document.body.scrollHeight)
      console.log('已滚动页面到底部')
    }
    
    // 等待加载更多内容
    await mediumDelay()
  } catch (error) {
    console.error('滚动到底部失败:', error)
  }
}

/**
 * 等待新的搜索结果加载完成
 * @param {number} previousCount - 之前的结果数量
 * @param {number} maxWaitTime - 最大等待时间（毫秒）
 * @returns {Promise<boolean>} 是否有新结果加载
 */
const waitForNewResults = async (previousCount, maxWaitTime = 5000) => {
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitTime) {
    const currentResults = getSearchResults()
    
    // 如果结果数量增加了，说明有新内容加载
    if (currentResults.length > previousCount) {
      console.log(`新结果已加载，从 ${previousCount} 增加到 ${currentResults.length}`)
      return true
    }
    
    // 如果已经到底部，不再等待
    if (isResultListAtBottom()) {
      console.log('已到达结果列表底部，无更多结果')
      return false
    }
    
    // 短暂等待后重试
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('等待新结果超时')
  return false
}

/**
 * 检查挖掘状态是否仍然为true
 * @param {string} taskId - 任务ID，用于构建storage键
 * @returns {Promise<boolean>} 是否仍在挖掘中
 */
const checkMiningState = async (taskId = 'default') => {
  try {
    const storageKey = `googleMaps_miningState_${taskId}`
    const result = await Browser.storage.local.get([storageKey])
    return result[storageKey] || false
  } catch (error) {
    console.error('检查挖掘状态失败:', error)
    return false
  }
}

/**
 * 处理当前关键词的所有搜索结果
 * @param {string} keyword - 当前关键词
 * @param {string} taskId - 任务ID，默认为'default'
 * @returns {Promise<Array>} 所有提取的联系人数据
 */
export const processAllResultsForKeyword = async (keyword, taskId = 'default') => {
  try {
    console.log(`开始处理关键词 "${keyword}" 的所有结果`)
    
    let allContacts = []
    let processedCount = 0
    let batchNumber = 1
    let hasMoreResults = true
    
    while (hasMoreResults) {
      // 🔥 添加挖掘状态检查
      const isMining = await checkMiningState(taskId)
      if (!isMining) {
        console.log('检测到挖掘已停止，中断处理')
        break
      }
      
      console.log(`=== 开始处理第 ${batchNumber} 批结果 ===`)
      
      // 获取当前可见的结果
      const currentResults = getSearchResults()
      
      if (currentResults.length === 0) {
        console.log('没有找到搜索结果')
        hasMoreResults = false
        break
      }
      
      // 获取本批次需要处理的新结果
      const newResults = currentResults.slice(processedCount)
      
      if (newResults.length === 0) {
        console.log('没有新的结果需要处理，尝试加载更多...')
        
        // 检查是否还有更多结果可以加载
        if (isResultListAtBottom()) {
          console.log('已到达结果列表底部，无更多结果可加载，处理完成')
          hasMoreResults = false
          break
        }
        
        // 尝试滚动加载更多
        console.log('滚动加载更多结果...')
        await scrollResultsToBottom()
        
        // 等待新结果加载
        const hasNewResults = await waitForNewResults(currentResults.length)
        if (!hasNewResults) {
          console.log('没有更多结果可加载，处理完成')
          hasMoreResults = false
          break
        }
        
        // 继续下一轮处理
        continue
      }
      
      console.log(`第 ${batchNumber} 批找到 ${newResults.length} 个新结果，总结果数: ${currentResults.length}`)
      
      // 处理新结果
      for (let i = 0; i < newResults.length; i++) {
        // 🔥 在每个结果处理前也检查状态
        const isMining = await checkMiningState(taskId)
        if (!isMining) {
          console.log('检测到挖掘已停止，中断结果处理')
          hasMoreResults = false
          break
        }
        
        const globalIndex = processedCount + i
        const resultElement = newResults[i]
        
        console.log(`处理第 ${globalIndex + 1} 个搜索结果`)
        
        // 处理单个结果，传递关键词
        const contacts = await processSearchResult(resultElement, globalIndex, keyword)
        allContacts.push(...contacts)
      }
      
      // 如果在处理结果时检测到停止，跳出外层循环
      if (!hasMoreResults) break
      
      // 更新已处理数量
      processedCount = currentResults.length
      batchNumber++
      
      console.log(`第 ${batchNumber - 1} 批处理完成，已处理 ${processedCount} 个结果，共提取 ${allContacts.length} 个联系人`)
      
      // 处理完当前批次后，尝试滚动加载更多结果，确保不遗漏任何结果
      if (!isResultListAtBottom()) {
        console.log('尝试滚动加载更多结果...')
        await scrollResultsToBottom()
        
        // 等待新结果加载
        const hasNewResults = await waitForNewResults(processedCount, 3000)
        if (!hasNewResults) {
          // 如果滚动后没有新结果，再次检查是否到底部
          if (isResultListAtBottom()) {
            console.log('滚动后仍无新结果且已到底部，处理完成')
            hasMoreResults = false
          } else {
            console.log('滚动后无新结果但未到底部，继续尝试')
          }
        }
      } else {
        console.log('已到达结果列表底部，检查是否还有未处理的结果...')
        
        // 即使到了底部，也要再次检查是否有未处理的结果
        const finalResults = getSearchResults()
        if (finalResults.length > processedCount) {
          console.log(`发现还有 ${finalResults.length - processedCount} 个未处理的结果，继续处理`)
          // 继续下一轮处理剩余结果
        } else {
          console.log('已到底部且所有结果都已处理完成')
          hasMoreResults = false
        }
      }
    }
    
    console.log(`关键词 "${keyword}" 处理完成，共处理 ${processedCount} 个结果，提取 ${allContacts.length} 个联系人`)
    return allContacts
  } catch (error) {
    console.error(`处理关键词 "${keyword}" 的结果时出错:`, error)
    return []
  }
}
