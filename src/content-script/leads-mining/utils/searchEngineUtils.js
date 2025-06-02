/**
 * 搜索引擎辅助工具函数
 */

// 常量定义
export const PAGE_DEPTH_KEY = 'leadsMining_pageDepth'
export const MAX_PAGE_DEPTH = 1
export const SEARCH_PAGE_KEY = 'leadsMining_isSearchPage'

/**
 * 检查URL是否为搜索结果页
 * @param {string} url - 要检查的URL
 * @returns {boolean} 是否为搜索结果页
 */
export const isSearchUrl = (url) => {
  if (!url) return false
  
  try {
    const urlObj = new URL(url)
    
    // Google搜索
    if (urlObj.hostname.includes('google') && urlObj.pathname.includes('/search')) {
      return true
    }
    
    // Bing搜索
    if (urlObj.hostname.includes('bing.com') && urlObj.pathname.includes('/search')) {
      return true
    }
    
    // 百度搜索
    if (urlObj.hostname.includes('baidu.com') && urlObj.pathname === '/s') {
      return true
    }
    
    return false
  } catch (error) {
    console.error('检查搜索URL时出错:', error)
    return false
  }
}


/**
 * 检查URL是否为详情页
 * @returns {boolean} 是否为详情页
 */
export const isDetailPage = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const depthParam = urlParams.get(PAGE_DEPTH_KEY)

  return depthParam !== null && depthParam > 0
}


/**
 * 创建延时函数
 * @param {number} ms - 延时毫秒数
 * @returns {Promise} 延时Promise
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 获取随机延时时间
 * @param {number} min - 最小秒数
 * @param {number} max - 最大秒数
 * @returns {number} 随机毫秒数
 */
export const getRandomDelay = (min, max) => {
  return (Math.random() * (max - min) + min) * 1000
}

/**
 * 获取默认的延时参数
 * @param {Object} selectedTask - 当前选择的任务
 * @returns {Object} 延时参数对象
 */
export const getDelayParams = (selectedTask) => {
  const defaultClickDelay = 2 // 默认点击前等待时间（秒）
  const defaultBrowseDelay = 2.5 // 默认浏览时间（秒）

  const clickDelay = selectedTask?.clickDelay || defaultClickDelay
  const browseDelay = selectedTask?.browseDelay || defaultBrowseDelay

  return {
    clickDelay,
    browseDelay,
  }
}

/**
 * 清理链接标记
 */
export const cleanupLinkMarkers = () => {
  // 清理链接标记样式
  const styleElement = document.getElementById('leadsMining-link-styles')
  if (styleElement) {
    styleElement.remove()
  }

  // 移除所有链接标记和图标
  document
    .querySelectorAll(
      '.leadsMining-link-to-visit, .leadsMining-link-visited, .leadsMining-link-current',
    )
    .forEach((el) => {
      el.classList.remove(
        'leadsMining-link-to-visit',
        'leadsMining-link-visited',
        'leadsMining-link-current',
      )

      // 移除所有图标和loading动画
      const icons = el.querySelectorAll('.leadsMining-link-icon, .leadsMining-link-loading')
      icons.forEach((icon) => icon.remove())
    })
}

/**
 * 简单的防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖处理后的函数
 */
export const debounce = (fn, delay) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

/**
 * 判断两个状态是否相同
 * @param {string} prevStatus - 前一个状态
 * @param {string} currentStatus - 当前状态
 * @returns {boolean} 是否相同
 */
export const isStatusChanged = (prevStatus, currentStatus) => {
  return prevStatus !== currentStatus
}

/**
 * 优化URL
 * @param {string} url - 要优化的URL
 * @returns {string} 优化后的URL
 */
export const optimizeUrl = (url) => {
  // 检查URL是否为有效的URL
  try {
    new URL(url)
  } catch (e) {
    console.error('Invalid URL:', url)
    return url.slice(0, 255) // 如果无效，只返回前255个字符
  }

  // 检查是否是谷歌搜索URL
  if (url.includes('google.') && url.includes('/search?')) {
    const urlObj = new URL(url)
    const searchParams = urlObj.searchParams

    // 保留必要的参数
    const newParams = new URLSearchParams()
    if (searchParams.has('q')) newParams.set('q', searchParams.get('q'))
    if (searchParams.has('start')) newParams.set('start', searchParams.get('start'))

    // 构建新的URL
    let newUrl = `${urlObj.origin}${urlObj.pathname}?${newParams.toString()}`

    // 如果新URL超过255个字符，进行截断
    if (newUrl.length > 255) {
      // 尝试缩短查询参数
      let q = newParams.get('q')
      while (newUrl.length > 255 && q.length > 0) {
        q = q.slice(0, -1)
        newParams.set('q', q)
        newUrl = `${urlObj.origin}${urlObj.pathname}?${newParams.toString()}`
      }
    }

    return newUrl
  } else {
    // 非谷歌URL，直接截取前255个字符
    return url.slice(0, 255)
  }
}