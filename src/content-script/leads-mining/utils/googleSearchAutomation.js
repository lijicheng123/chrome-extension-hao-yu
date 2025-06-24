import Browser from 'webextension-polyfill'
import { extractPageEmails } from './emailService'
import { isGoogleCaptchaPage, detectCaptcha } from './captchaDetector'
import { isGoogleSearchPage, isGoogleMapsPage, isLinkedInPage } from '../../../utils/platformDetector'
import { delay } from './delayUtils'
import { scrollToBottom } from './webPageUtils'
import { findElementBySelectors } from './elementUtils'
import { TabManagerContentAPI } from '../../../services/messaging/tabManager'
import { 
  AUTOMATION_CONFIG, 
  RESULT_STATUS, 
  RESULT_STATUS_CLASSES,
  ALL_RESULT_STATUS_CLASSES,
  SERP_RESULT_STYLES_CSS,
  SELECTORS,
  PAGE_DEPTH,
  PAGE_MARKER_ACTION
} from '../constants/automationConfig'

/**
 * Google搜索自动化工具集
 */

/**
 * 获取Google搜索输入框
 * @returns {Element|null} 搜索输入框元素
 */
export const getGoogleSearchInput = () => {
  const selectors = [
    SELECTORS.SEARCH_INPUT,
    'input[name="q"]',
    'input[aria-label*="搜索"]',
    'input[aria-label*="Search"]',
    'textarea[name="q"]'
  ]
  
  return findElementBySelectors(selectors, 'Google搜索框')
}

/**
 * 获取Google搜索按钮
 * @returns {Element|null} 搜索按钮元素
 */
export const getGoogleSearchButton = () => {
  const selectors = [SELECTORS.SEARCH_BUTTON]
  return findElementBySelectors(selectors, 'Google搜索按钮')
}

/**
 * 清空搜索框
 * @returns {boolean} 是否成功清空
 */
export const clearSearchInput = () => {
  const input = getGoogleSearchInput()
  if (!input) return false
  
  try {
    input.value = ''
    input.focus()
    
    // 触发清空事件
    const events = ['input', 'change', 'keyup']
    events.forEach((eventType) => {
      const event = new Event(eventType, { bubbles: true })
      input.dispatchEvent(event)
    })
    
    console.log('Google搜索框已清空')
    return true
  } catch (error) {
    console.error('清空Google搜索框失败:', error)
    return false
  }
}

/**
 * 输入搜索关键词
 * @param {string} keyword 关键词
 * @returns {boolean} 是否成功输入
 */
export const inputSearchKeyword = (keyword) => {
  const input = getGoogleSearchInput()
  if (!input) return false
  
  try {
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
export const clickSearchButton = async () => {
  const button = getGoogleSearchButton()
  if (!button) return false
  
  try {
    button.click()
    console.log('已点击搜索按钮')
    
    // 等待搜索结果加载
    await delay(AUTOMATION_CONFIG.SEARCH_DELAY)
    return true
  } catch (error) {
    console.error('点击搜索按钮失败:', error)
    return false
  }
}

/**
 * 执行搜索
 * @param {string} keyword 搜索关键词
 * @returns {Promise<boolean>} 是否搜索成功
 */
export const performSearch = async (keyword) => {
  console.log(`开始搜索关键词: ${keyword}`)
  
  try {
    // 清空搜索框
    if (!clearSearchInput()) {
      throw new Error('清空搜索框失败')
    }
    
    // 输入关键词
    if (!inputSearchKeyword(keyword)) {
      throw new Error('输入关键词失败')
    }
    
    // 点击搜索按钮
    if (!await clickSearchButton()) {
      throw new Error('点击搜索按钮失败')
    }
    
    // 如果仍然是谷歌搜索页，说明没有跳转，则抛出错误
    await delay(1000)
    if (isGoogleSearchPage()) {
      throw new Error('未能跳转到搜索结果页')
    }
    
    return true
  } catch (error) {
    console.error(`搜索失败: ${keyword}`, error)
    return false
  }
}

/**
 * 获取搜索结果容器
 * @returns {NodeList} 搜索结果容器列表
 */
export const getSearchResultContainers = () => {
  return getSearchResultLinks().containers || []
}

/**
 * 获取搜索结果链接
 * @returns {NodeList} 搜索结果链接列表
 */
export const getSearchResultLinks = () => {
  const links = [];
  const containers = [];

  // 获取所有符合条件的父级
  document.querySelectorAll(SELECTORS.RESULT_CONTAINERS).forEach(container => {
    // 在当前 container 下查找第一个符合条件的 <a>
    const link = container.querySelector(SELECTORS.RESULT_LINKS);
    if (link) {
      containers.push(container)
      links.push(link);
    }
  });
  return { links, containers }
}

/**
 * 注入SERP结果样式到页面
 */
export const injectSerpResultStyles = () => {
  const existingStyle = document.getElementById('haoyu-serp-result-styles')
  if (existingStyle) return // 已经注入过了
  
  const style = document.createElement('style')
  style.id = 'haoyu-serp-result-styles'
  style.textContent = SERP_RESULT_STYLES_CSS
  document.head.appendChild(style)
  
  console.log('已注入SERP结果样式')
}

/**
 * 为搜索结果添加状态样式（使用CSS类）
 * @param {Element} element 结果元素
 * @param {string} status 状态
 */
export const applyResultStyle = (element, status) => {
  if (!element || !RESULT_STATUS_CLASSES[status]) {
    console.warn('无效的元素或状态:', { element: !!element, status })
    return
  }
  
  // 确保样式已注入
  injectSerpResultStyles()
  
  // 清除所有状态类
  element.classList?.remove(...ALL_RESULT_STATUS_CLASSES)
  
  // 添加新的状态类
  const statusClass = RESULT_STATUS_CLASSES[status]
  element.classList?.add(statusClass)
  
  console.log(`已应用结果样式: ${status} -> ${statusClass}`, { element })
}

/**
 * 清除搜索结果样式
 * @param {Element} element 结果元素
 */
export const clearResultStyle = (element) => {
  if (!element) return
  
  // 清除所有状态类
  element.classList.remove(...ALL_RESULT_STATUS_CLASSES)
  
  console.log('已清除结果样式', { element })
}

/**
 * 标记所有搜索结果为待点击状态
 * @returns {number} 标记的结果数量
 */
export const markAllResultsAsPending = () => {
  const containers = getSearchResultContainers()
  containers.forEach(container => {
    applyResultStyle(container, RESULT_STATUS.PENDING)
  })
  
  console.log(`已标记 ${containers.length} 个搜索结果为待点击状态`)
  return containers.length
}

/**
 * 清除所有搜索结果样式
 */
export const clearAllResultStyles = () => {
  const containers = getSearchResultContainers()
  containers.forEach(container => {
    clearResultStyle(container)
  })
  
  console.log('已清除所有搜索结果样式')
}

/**
 * 获取下一页按钮
 * @returns {Element|null} 下一页按钮元素
 */
export const getNextPageButton = () => {
  const selectors = [SELECTORS.NEXT_PAGE_BUTTON]
  return findElementBySelectors(selectors, 'Google下一页按钮')
}

/**
 * 检查是否有下一页
 * @returns {boolean} 是否有下一页
 */
export const hasNextPage = () => {
  const nextButton = getNextPageButton()
  return nextButton && !nextButton.hasAttribute('disabled')
}

/**
 * 点击下一页
 * @returns {Promise<boolean>} 是否成功点击
 */
export const clickNextPage = async () => {
  const nextButton = getNextPageButton()
  if (!nextButton || nextButton.hasAttribute('disabled')) {
    console.log('没有下一页或下一页按钮已禁用')
    return false
  }
  
  try {
    nextButton.click()
    console.log('已点击下一页')
    
    // 等待页面加载
    await delay(AUTOMATION_CONFIG.SEARCH_DELAY)
    return true
  } catch (error) {
    console.error('点击下一页失败:', error)
    return false
  }
}

/**
 * 点击搜索结果链接
 * @param {Element} linkElement 链接元素
 * @param {string} keyword 当前关键词
 * @param {string} taskId 任务ID
 * @returns {Promise<boolean>} 是否成功点击
 */
export const clickSearchResultLink = async (linkElement, keyword, taskId) => {
  if (!linkElement) return false
  
  try {
    linkElement.element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    // 主要是url为主，保留linkElement.href是为了以后a标签扔进来直接用
    const url = linkElement.href || linkElement.url
    console.log(`准备打开链接: ${url}`)
    // 通过background打开标签页
    const result = await TabManagerContentAPI.openTabByBackground({
      url,
      pageDepth: 1, // LandingPage深度为1
      timestamp: Date.now(),
      extraData: {
        keyword,
        taskId,
        from: PAGE_DEPTH.SERP,
        to: PAGE_DEPTH.LANDING_PAGE,
        action: PAGE_MARKER_ACTION.EXTRACT
      }
    })
    
    if (result.success) {
      console.log('已通过background创建新标签页:', result.tabId)
      return true
    } else {
      console.error('创建新标签页失败:', result.error)
      return false
    }
  } catch (error) {
    console.error('点击搜索结果链接失败:', error)
    return false
  }
}



/**
 * 在目标页面提取信息
 * @returns {Promise<Array>} 提取的联系人信息
 */
export const extractDataFromLandingPage = async ({onCaptchaDetected, onExtracted, ai = false, isManual = false} = {}) => {
  console.log('开始提取目标页面信息')
  
  try {
    // 等待页面稳定
    await delay(AUTOMATION_CONFIG.SCROLL_DELAY)
    
    // 滚动到页面底部
    await scrollToBottom()
    
    // 等待滚动完成
    await delay(AUTOMATION_CONFIG.EXTRACT_DELAY)
    
    // 提取页面邮箱信息
    const extractedData = await extractPageEmails({
      onCaptchaDetected: () => {
        console.log('在目标页面检测到验证码')
        onCaptchaDetected?.()
      },
      onExtracted: (contact) => {
        console.log(`目标页面提取到 ${contact.length} 个联系人`)
        onExtracted?.(contact)
      },
      ai,
      isManual
    })
    
    console.log('目标页面信息提取完成')
    return extractedData || []
  } catch (error) {
    console.error('提取目标页面信息失败:', error)
    return []
  }
}

/**
 * 检测验证码并处理
 * @returns {boolean} 是否检测到验证码
 */
export const checkAndHandleCaptcha = () => {
  const hasCaptcha = detectCaptcha() || isGoogleCaptchaPage()
  
  if (hasCaptcha) {
    console.log('检测到验证码，需要用户处理')
    return true
  }
  
  return false
}


/**
 * 检查搜索是否有结果
 * @returns {boolean} 是否有搜索结果
 */
export const hasSearchResults = () => {
  const resultsSection = document.querySelector(SELECTORS.RESULTS_SECTION)
  if (!resultsSection) return false
  
  const results = getSearchResultContainers()
  return results.length > 0
} 
export const isLandingPage = async () => {
  console.log('========== 检查是否为LandingPage开始 ==========')
  
  // 检查1: 是否为指定平台页面（排除）
  const isGoogleMaps = isGoogleMapsPage()
  const isGoogleSearch = isGoogleSearchPage()
  const isLinkedIn = isLinkedInPage()
  const isSpecifiedPlatform = isGoogleMaps || isGoogleSearch || isLinkedIn
  
  console.log('平台检查:', {
    currentUrl: window.location.href,
    isGoogleMaps,
    isGoogleSearch, 
    isLinkedIn,
    isSpecifiedPlatform
  })
  
  if (isSpecifiedPlatform) {
    console.log('❌ 当前是指定平台页面，跳过自动处理')
    return false
  }
  
  // 检查2: 获取当前页面的TabID和页面深度信息
  console.log('检查当前页面Tab信息...')
  const tabInfo = await TabManagerContentAPI.getCurrentPageTabInfo()
  console.log('Tab信息结果:', tabInfo)
  
  if (!tabInfo.success) {
    console.log('❌ 没有找到Tab信息，跳过自动处理')
    return false
  }
  
  // 检查3: 验证页面深度
  if (tabInfo.pageDepth !== 1) {
    console.log('❌ 页面深度不匹配，期望1，实际:', tabInfo.pageDepth)
    return false
  }
  
  // 检查4: 验证时间窗口（1分钟）
  const currentTime = Date.now()
  const timeDiff = currentTime - tabInfo.timestamp
  const timeWindow = 60000 // 1分钟
  const isWithinTimeWindow = timeDiff <= timeWindow
  
  console.log('时间窗口检查:', {
    currentTime,
    timestamp: tabInfo.timestamp,
    timeDiff,
    timeWindow,
    isWithinTimeWindow
  })
  
  if (!isWithinTimeWindow) {
    console.log('❌ 超出时间窗口，可能是过期的页面')
    return false
  }
  
  // 检查5: 验证额外数据
  const extraData = tabInfo.extraData || {}
  const isValidData = extraData.to === PAGE_DEPTH.LANDING_PAGE && 
                      extraData.action === PAGE_MARKER_ACTION.EXTRACT
  
  console.log('额外数据验证:', {
    extraDataTo: extraData.to,
    expectedTo: PAGE_DEPTH.LANDING_PAGE,
    extraDataAction: extraData.action,
    expectedAction: PAGE_MARKER_ACTION.EXTRACT,
    isValidData
  })
  
  if (!isValidData) {
    console.log('❌ 额外数据不匹配，跳过自动处理')
    return false
  }
  
  console.log('✓ 检测到是LandingPage!', {
    tabId: tabInfo.tabId,
    pageDepth: tabInfo.pageDepth,
    keyword: extraData.keyword,
    taskId: extraData.taskId
  })
  
  console.log('========== 检查是否为LandingPage结束 ==========')
  return true
}

/**
 * 发送消息到SERP页面（使用统一的TabManagerService）
 * @param {Object} messageData 消息数据
 * @param {string} messageData.action 动作类型
 * @param {Object} messageData.data 消息数据
 * @returns {Promise<boolean>} 发送是否成功
 */
export const sendToSERPMessage = async (messageData) => {
  try {
    // 通过统一的tabManagerService发送到SERP页面
    const result = await TabManagerContentAPI.sendToSERPMessage(messageData)
    console.log('SERP消息通过统一服务发送结果:', result)
    return result.success
  } catch (error) {
    console.error('通过统一服务发送SERP消息失败:', error)
    return false
  }
}

/**
 * 监听来自LandingPage的消息
 * @param {Function} callback 回调函数，接收 (message) 参数
 * @param {Object} filter 过滤条件 { action? }
 * @returns {Function} 取消监听的函数
 */
export const listenLandingPageMessage = (callback, filter = {}) => {
  console.log('设置LandingPage消息监听器，过滤条件:', filter)
  
  const listener = (message, sender) => {
    console.log('监听器收到消息:', {
      messageType: message.type,
      messageAction: message.action,
      filterAction: filter.action,
      message,
      sender
    })
    
    // 只处理来自LandingPage的消息
    if (message.type !== 'LANDING_PAGE_MESSAGE') {
      console.log('❌ 消息类型不匹配，跳过:', message.type)
      return
    }
    
    console.log('✓ 收到LANDING_PAGE_MESSAGE消息:', message, 'filter:', filter)
    
    // 应用过滤条件
    if (filter.action && message.action !== filter.action) {
      console.log('❌ 消息动作不匹配，跳过:', {
        messageAction: message.action,
        filterAction: filter.action
      })
      return
    }
    
    console.log('✓ LandingPage消息通过过滤器，触发回调:', message)
    callback(message, sender)
  }
  
  Browser.runtime.onMessage.addListener(listener)
  console.log('✓ LandingPage消息监听器已注册')
  
  // 返回取消监听的函数
  return () => {
    Browser.runtime.onMessage.removeListener(listener)
    console.log('❌ LandingPage消息监听器已移除')
  }
}

/**
 * TODO:似乎不用了，考虑删除set和getPageMarker
 * 设置页面标记（通过消息传递到SERP）
 * @param {Object} markerData 标记数据
 * @param {string} markerData.action 要执行的动作
 * @param {string} markerData.keyword 当前关键词
 * @param {string} markerData.taskId 任务ID
 * @param {string} markerData.resultUrl 结果URL
 * @param {Object} markerData.data 额外数据
 */
export const setPageMarker = async (markerData) => {
  console.log('========== 设置页面标记开始 ==========')
  console.log('输入的markerData:', markerData)
  
  try {
    const message = {
      action: markerData.action,
      data: {
        keyword: markerData.keyword,
        taskId: markerData.taskId,
        resultUrl: markerData.resultUrl,
        timestamp: Date.now(),
        ...markerData.data
      }
    }
    
    console.log('构造的完整消息:', message)
    console.log('准备发送到SERP的消息 - action:', message.action)
    
    const success = await sendToSERPMessage(message)
    
    if (success) {
      console.log('✓ SERP消息发送成功，消息内容:', message)
    } else {
      console.error('❌ SERP消息发送失败，消息内容:', message)
    }
    
  } catch (error) {
    console.error('❌ 发送SERP消息失败:', error)
  }
  
  console.log('========== 设置页面标记结束 ==========')
}

/**
 * 获取页面标记（从当前Tab信息中获取）
 * @returns {Promise<Object|null>} 页面标记数据
 */
export const getPageMarker = async () => {
  try {
    const tabInfo = await TabManagerContentAPI.getCurrentPageTabInfo()
    if (tabInfo.success && tabInfo.extraData) {
      // 将extraData转换为兼容的页面标记格式
      const extraData = tabInfo.extraData
      return {
        from: extraData.from,
        to: extraData.to,
        action: extraData.action,
        keyword: extraData.keyword,
        taskId: extraData.taskId,
        resultUrl: extraData.resultUrl || window.location.href,
        timestamp: tabInfo.timestamp,
        data: extraData
      }
    }
    return null
  } catch (error) {
    console.error('获取页面标记失败:', error)
    return null
  }
}

/**
 * 监听页面标记变化（通过LandingPage消息监听）
 * @param {Function} callback 回调函数，接收 (newMarker, oldMarker) 参数
 * @param {Object} filter 过滤条件 { action? }
 * @returns {Function} 取消监听的函数
 */
export const listenToPageMarkerChanges = (callback, filter = {}) => {
  return listenLandingPageMessage((message) => {
    console.log('页面标记变化监听触发:', { message, filter })
    // 将消息转换为兼容的标记格式
    const newMarker = {
      from: PAGE_DEPTH.LANDING_PAGE,
      to: PAGE_DEPTH.SERP,
      action: message.action,
      keyword: message.data?.keyword,
      taskId: message.data?.taskId,
      resultUrl: message.data?.resultUrl,
      timestamp: message.timestamp,
      data: message.data
    }
    callback(newMarker, null) // oldMarker设为null，因为消息传递机制不保存历史
  }, filter)
}

/**
 * 清除页面标记（在新的消息机制下，这是个空操作）
 */
export const clearPageMarker = async () => {
  console.log('clearPageMarker: 在消息传递机制下，无需清除')
  // 在消息传递机制下，不需要清除操作，因为消息是实时传递的
}