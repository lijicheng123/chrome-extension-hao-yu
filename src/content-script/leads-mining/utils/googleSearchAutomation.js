import Browser from 'webextension-polyfill'
import { extractPageEmails } from './emailService'
import { isGoogleCaptchaPage, detectCaptcha } from './captchaDetector'
import { isGoogleSearchPage, isGoogleMapsPage, isLinkedInPage, detectCurrentPlatform } from '../../../utils/platformDetector'
import { delay } from './delayUtils'
import { scrollToBottom } from './webPageUtils'
import { findElementBySelectors } from './elementUtils'
import { 
  AUTOMATION_CONFIG, 
  AUTOMATION_STORAGE_KEYS, 
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
    
    // 在新标签页打开前，设置页面标记（SERP -> LANDING_PAGE）
    await setPageMarker({
      from: PAGE_DEPTH.SERP,        // 来自搜索结果页
      to: PAGE_DEPTH.LANDING_PAGE,  // 发给目标页面
      action: PAGE_MARKER_ACTION.EXTRACT, // 要求提取信息
      keyword,
      taskId,
      resultUrl: url
    })
    await delay(3000)
    // 在新标签页中打开链接，添加 __h_d=1 参数
    const urlWithParams = new URL(url)
    urlWithParams.searchParams.set('__h_d', '1') // 谷歌搜索深度1
    const newTab = window.open(urlWithParams.toString(), '_blank')
    if (newTab) {
      console.log('已在新标签页打开链接')
      return true
    } else {
      console.error('无法打开新标签页，可能被浏览器阻止')
      return false
    }
  } catch (error) {
    console.error('点击搜索结果链接失败:', error)
    return false
  }
}

/**
 * 设置页面标记（新的结构）
 * @param {Object} markerData 标记数据
 * @param {number} markerData.from 来源层级（谁写进的）
 * @param {number} markerData.to 目标层级（给谁用的）
 * @param {string} markerData.action 要执行的动作
 * @param {string} markerData.keyword 当前关键词
 * @param {string} markerData.taskId 任务ID
 * @param {string} markerData.resultUrl 结果URL
 * @param {number} markerData.timestamp 时间戳
 * @param {Object} markerData.data 额外数据
 */
export const setPageMarker = async (markerData) => {
  try {
    const marker = {
      platform: markerData.platform || await detectCurrentPlatform(),
      from: markerData.from,
      to: markerData.to,
      action: markerData.action,
      keyword: markerData.keyword,
      taskId: markerData.taskId,
      resultUrl: markerData.resultUrl,
      timestamp: Date.now(),
      data: markerData.data || {}
    }
    
    console.log('准备设置页面标记:', {
      storageKey: AUTOMATION_STORAGE_KEYS.PAGE_MARKER,
      marker
    })
    
    await Browser.storage.local.set({
      [AUTOMATION_STORAGE_KEYS.PAGE_MARKER]: marker
    })
    
    console.log('✓ 页面标记已设置成功')
    
    // 验证是否真的设置成功
    const verification = await Browser.storage.local.get([AUTOMATION_STORAGE_KEYS.PAGE_MARKER])
    console.log('验证页面标记存储:', verification)
    
  } catch (error) {
    console.error('❌ 设置页面标记失败:', error)
  }
}

/**
 * 获取页面标记
 * @returns {Promise<Object|null>} 页面标记数据
 */
export const getPageMarker = async () => {
  try {
    const result = await Browser.storage.local.get([AUTOMATION_STORAGE_KEYS.PAGE_MARKER])
    return result[AUTOMATION_STORAGE_KEYS.PAGE_MARKER] || null
  } catch (error) {
    console.error('获取页面标记失败:', error)
    return null
  }
}

/**
 * 清除页面标记
 */
export const clearPageMarker = async () => {
  try {
    await Browser.storage.local.remove([AUTOMATION_STORAGE_KEYS.PAGE_MARKER])
    console.log('页面标记已清除')
  } catch (error) {
    console.error('清除页面标记失败:', error)
  }
}

/**
 * 监听页面标记变化
 * @param {Function} callback 回调函数，接收 (newMarker, oldMarker) 参数
 * @param {Object} filter 过滤条件 { to?, action? }
 * @returns {Function} 取消监听的函数
 */
export const listenToPageMarkerChanges = (callback, filter = {}) => {
  const listener = (changes, areaName) => {
    if (areaName !== 'local') return
    
    const markerChange = changes[AUTOMATION_STORAGE_KEYS.PAGE_MARKER]
    if (!markerChange) return
    
    const newMarker = markerChange.newValue
    const oldMarker = markerChange.oldValue
    
    // 应用过滤条件
    if (filter.to && newMarker && newMarker.to !== filter.to) return
    if (filter.action && newMarker && newMarker.action !== filter.action) return
    
    console.log('页面标记变化监听触发:', { newMarker, oldMarker, filter })
    callback(newMarker, oldMarker)
  }
  
  Browser.storage.onChanged.addListener(listener)
  
  // 返回取消监听的函数
  return () => {
    Browser.storage.onChanged.removeListener(listener)
  }
}

/**
 * 等待页面标记变化（基于监听）
 * @param {Object} filter 过滤条件 { to?, action? }
 * @param {number} timeout 超时时间（毫秒）
 * @returns {Promise<Object|null>} 返回匹配的标记或null（超时）
 */
export const waitForPageMarkerChange = (filter = {}, timeout = AUTOMATION_CONFIG.PAGE_TIMEOUT) => {
  return new Promise((resolve) => {
    let timeoutId
    let unsubscribe
    
    // 设置超时
    timeoutId = setTimeout(() => {
      if (unsubscribe) unsubscribe()
      console.log('等待页面标记变化超时')
      resolve(null)
    }, timeout)
    
    // 监听标记变化
    // eslint-disable-next-line no-unused-vars
    unsubscribe = listenToPageMarkerChanges((newMarker, _oldMarker) => {
      clearTimeout(timeoutId)
      unsubscribe()
      console.log('页面标记变化等待完成:', newMarker)
      resolve(newMarker)
    }, filter)
  })
}

/**
 * 检查当前页面是否为目标页面（需要提取信息的页面）
 * @returns {Promise<boolean>} 是否为目标页面
 */
export const isTargetPage = async () => {
  // 检查是否有页面标记
  const marker = await getPageMarker()
  if (!marker) return false
  
  // 检查是否为Google搜索页面（不是目标页面）
  if (isGoogleSearchPage()) return false
  
  return true
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
 * 获取当前页码
 * @returns {number} 当前页码
 */
export const getCurrentPageNumber = () => {
  // 尝试从URL参数获取
  const urlParams = new URLSearchParams(window.location.search)
  const start = urlParams.get('start')
  
  if (start) {
    // Google搜索每页通常10个结果，start=0是第1页，start=10是第2页
    return Math.floor(parseInt(start) / 10) + 1
  }
  
  // 如果没有start参数，通常是第1页
  return 1
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
  
  // 检查是否为指定平台页面
  const isGoogleMaps = isGoogleMapsPage()
  const isGoogleSearch = isGoogleSearchPage()
  const isLinkedIn = isLinkedInPage()
  const isSpecifiedPlatform = isGoogleMaps || isGoogleSearch || isLinkedIn
  // 这里写： url中的__h_d 为1的才是LandingPage，大于1的不是LandingPage
  const urlParams = new URLSearchParams(window.location.search)
  const pageDepth = urlParams.get('_h_d')
  if (pageDepth) {
    if (Number(pageDepth) > 1) {
      return false
    }
    if (Number(pageDepth) === 1) {
      return true
    }
  }


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
  
  // 检查是否有页面标记
  console.log('检查页面标记...')
  const marker = await getPageMarker()
  console.log('页面标记结果:', marker)
  
  if (!marker) {
    console.log('❌ 非指定平台页面，但没有页面标记，跳过自动处理')
    return false
  }
  
  // 检查是否为目标页面（to=LANDING_PAGE且action=EXTRACT）
  const isValidMarker = marker.to === PAGE_DEPTH.LANDING_PAGE && marker.action === PAGE_MARKER_ACTION.EXTRACT
  
  console.log('页面标记验证:', {
    markerTo: marker.to,
    expectedTo: PAGE_DEPTH.LANDING_PAGE,
    markerAction: marker.action,
    expectedAction: PAGE_MARKER_ACTION.EXTRACT,
    isValidMarker
  })
  
  if (!isValidMarker) {
    console.log('❌ 页面标记不匹配，跳过自动处理')
    return false
  }
  
  console.log('✓ 检测到是LandingPage!')
  console.log('========== 检查是否为LandingPage结束 ==========')

  return true
}