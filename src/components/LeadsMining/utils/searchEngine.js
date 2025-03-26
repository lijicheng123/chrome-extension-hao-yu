import { getMatchedSearchEngine } from './searchEngineConfig'

/**
 * 模拟滚动到页面底部
 * @returns {Promise<void>} 滚动完成的Promise
 */
export async function scrollToBottom() {
  return new Promise((resolve) => {
    const distance = 200 // 每次滚动的距离
    const delay = 150 // 每次滚动的延迟
    const timer = setInterval(() => {
      window.scrollBy(0, distance)
      if (
        document.documentElement.scrollTop + window.innerHeight >=
        document.documentElement.scrollHeight
      ) {
        clearInterval(timer)
        resolve()
      }
    }, delay)
  })
}

/**
 * 获取总页数
 * @returns {number|null} 总页数或null
 */
export function getTotalPages() {
  // 尝试获取Google搜索结果页面的导航元素
  const navigationTD = document.querySelectorAll('div[role="navigation"] table tbody tr td')

  if (!navigationTD || navigationTD.length === 0) {
    // 尝试其他可能的选择器
    const paginationElements = document.querySelectorAll('table tbody tr[valign="top"] td')
    if (paginationElements && paginationElements.length > 0) {
      return paginationElements.length - 2 // 减去"上一页"和"下一页"按钮
    }

    return null
  }

  return navigationTD.length - 2 // 减去"上一页"和"下一页"按钮
}

/**
 * 获取当前页数
 * @returns {number} 当前页数
 */
export function getCurrentPage() {
  // 找到分页表格（通过role属性）
  const paginationTable = document.querySelector(
    'div[role="navigation"] table[role="presentation"]',
  )
  if (!paginationTable) return 1

  // 在表格中找到不包含<a>标签的数字单元格
  const cells = Array.from(paginationTable.getElementsByTagName('td'))
  const currentPageCell = cells.find((cell) => {
    const hasNoLink = !cell.querySelector('a')
    const hasNumber = /^\d+$/.test(cell.textContent.trim())
    return hasNoLink && hasNumber
  })

  return currentPageCell ? parseInt(currentPageCell.textContent.trim(), 10) : 1
}

/**
 * 判断是否为最后一页
 * @returns {boolean} 是否为最后一页
 */
export function isLastPage() {
  // 检查是否存在"下一页"按钮
  const nextPageButton = document.querySelector('td[aria-level="3"] a, #pnnext, a.pn[id="pnnext"]')
  if (!nextPageButton) {
    return true // 没有下一页按钮，说明是最后一页
  }

  const totalPages = getTotalPages()
  const currentPage = getCurrentPage()

  // 如果能获取到总页数和当前页数，则比较它们
  if (totalPages && currentPage) {
    return currentPage >= totalPages
  }

  // 如果无法确定，则根据下一页按钮判断
  return !nextPageButton
}

/**
 * 点击下一页
 * @returns {boolean} 是否成功点击
 */
export function clickNextPage() {
  // 尝试传统的选择器
  const traditionalNextButton = document.querySelector('#pnnext, a.pn[id="pnnext"]')
  if (traditionalNextButton) {
    console.log('找到下一页按钮(传统选择器):', traditionalNextButton)
    traditionalNextButton.click()
    return true
  }

  // 尝试新的选择器
  const nextPageButton = document.querySelectorAll('td[aria-level="3"] a')
  if (nextPageButton) {
    if (nextPageButton.length > 1) {
      console.log('找到下一页按钮(新选择器):', nextPageButton)
      nextPageButton[1].click()
      return true
    }
  }

  console.log('未找到下一页按钮')
  return false
}

/**
 * 执行Google搜索
 * @param {string} searchTerm - 搜索词
 * @returns {boolean} 是否成功执行搜索
 */
export function performGoogleSearch(searchTerm) {
  if (!searchTerm) return false

  // 检查当前是否在Google搜索页面
  const isGoogleSearch = window.location.hostname.includes('google')

  if (isGoogleSearch) {
    // 如果已经在Google搜索页面，使用搜索框
    const searchInput = document.querySelector('input[name="q"]')
    if (searchInput) {
      searchInput.value = searchTerm
      const searchForm = searchInput.closest('form')
      if (searchForm) {
        searchForm.submit()
        return true
      }
    }
  }

  // 如果不在Google搜索页面或无法使用搜索框，直接跳转
  window.location.href = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`
  return true
}

function getSearchLinks() {
  // 获取主容器
  const container = document.getElementById('rso')
  if (!container) {
    return []
  }

  // 获取所有a标签
  const links = container.getElementsByTagName('a')

  // 过滤出包含h3的链接
  const searchLinks = Array.from(links).filter((link) => {
    return link.querySelector('h3') !== null
  })

  // 返回链接信息
  return searchLinks
}

/**
 * 获取搜索结果链接
 * @returns {Element[]} 搜索结果链接元素数组
 */
export function getSearchResultLinks() {
  // 尝试多种可能的选择器来获取搜索结果链接
  const mainLinks = getSearchLinks()
  // 合并结果并去重
  const allLinks = [...new Set([...mainLinks])]
  // 过滤链接并按URL去重
  const uniqueUrls = new Set()

  return allLinks.filter((link) => {
    const href = link.href

    // 排除Google内部链接
    if (
      href.includes('google.com/search') ||
      href.includes('google.com/url') ||
      href.includes('accounts.google') ||
      href.includes('play.google.com') ||
      href.includes('support.google')
    ) {
      return false
    }

    // 去除URL中的参数，获取基本URL
    const baseUrl = href.split('?')[0]

    // 如果这个基本URL已经存在，则跳过
    if (uniqueUrls.has(baseUrl)) {
      return false
    }

    // 添加到已处理集合
    uniqueUrls.add(baseUrl)
    return true
  })
}

/**
 * 检查当前页面是否为Google搜索结果页
 * @deprecated 请使用utils/searchEngineConfig.js中的isSearchResultPage函数
 * @returns {boolean} 是否为Google搜索结果页
 */
export function isGoogleSearchPage() {
  // 使用新的配置方式判断
  const matchedEngine = getMatchedSearchEngine()
  return matchedEngine?.name === 'GOOGLE'
}

/**
 * 标记搜索结果链接的状态
 * @param {Element} link - 链接元素
 * @param {string} status - 状态：'to-visit'(待访问), 'visited'(已访问) 或 'current'(正在访问)
 */
export function markLinkStatus(link, status) {
  if (!link) return

  // 获取链接所在的搜索结果容器
  const resultContainer = findResultContainer(link)
  const targetElement = resultContainer || link

  // 移除所有current标记，确保只有一个链接有current状态
  if (status === 'current') {
    document.querySelectorAll('.leadsMining-link-current').forEach((el) => {
      el.classList.remove('leadsMining-link-current')

      // 检查该元素是否已被处理过
      if (el.hasAttribute('data-visited') && el.getAttribute('data-visited') === 'true') {
        // 如果之前是已访问状态，恢复为已访问状态
        el.classList.remove('leadsMining-link-to-visit')
        el.classList.add('leadsMining-link-visited')

        // 移除时钟图标和loading动画
        const clockIcon = el.querySelector('.leadsMining-link-clock')
        if (clockIcon) clockIcon.remove()
        const loadingEl = el.querySelector('.leadsMining-link-loading')
        if (loadingEl) loadingEl.remove()

        // 添加对勾图标
        if (!el.querySelector('.leadsMining-link-check')) {
          const checkIcon = createCheckIcon()
          el.appendChild(checkIcon)
        }
      } else {
        // 如果之前是待访问状态，恢复为待访问状态
        el.classList.remove('leadsMining-link-visited')
        el.classList.add('leadsMining-link-to-visit')

        // 移除loading动画和对勾图标
        const loadingEl = el.querySelector('.leadsMining-link-loading')
        if (loadingEl) loadingEl.remove()
        const checkIcon = el.querySelector('.leadsMining-link-check')
        if (checkIcon) checkIcon.remove()

        // 添加时钟图标
        if (!el.querySelector('.leadsMining-link-clock')) {
          const clockIcon = createClockIcon()
          el.appendChild(clockIcon)
        }
      }
    })
  }

  // 移除之前的状态类
  targetElement.classList.remove(
    'leadsMining-link-to-visit',
    'leadsMining-link-visited',
    'leadsMining-link-current',
  )

  // 添加相应的类名
  targetElement.classList.add(`leadsMining-link-${status}`)

  // 根据状态设置或移除data-visited属性
  if (status === 'visited') {
    targetElement.setAttribute('data-visited', 'true')
  } else if (status === 'to-visit') {
    targetElement.removeAttribute('data-visited')
  }

  // 移除之前的所有图标
  const existingIcons = targetElement.querySelectorAll(
    '.leadsMining-link-icon, .leadsMining-link-loading',
  )
  existingIcons.forEach((icon) => icon.remove())

  // 根据状态添加不同的图标
  if (status === 'current') {
    // 创建loading元素
    const loadingEl = document.createElement('div')
    loadingEl.className = 'leadsMining-link-loading'
    loadingEl.innerHTML = `
      <div class="leadsMining-spinner">
        <div></div><div></div><div></div><div></div>
      </div>
    `
    targetElement.appendChild(loadingEl)

    // 滚动到当前链接可见区域
    scrollToLink(targetElement)
  } else if (status === 'visited') {
    // 创建已访问图标（打钩）
    const checkIcon = createCheckIcon()
    targetElement.appendChild(checkIcon)
  } else if (status === 'to-visit') {
    // 创建待访问图标（时钟）
    const clockIcon = createClockIcon()
    targetElement.appendChild(clockIcon)
  }

  // 添加样式到页面，如果还没有添加过
  addLinkStyles()
}

/**
 * 创建时钟图标（待访问）
 * @returns {Element} 时钟图标元素
 */
function createClockIcon() {
  const clockIcon = document.createElement('div')
  clockIcon.className = 'leadsMining-link-icon leadsMining-link-clock'
  clockIcon.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path fill="#fa8c16" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"></path>
    </svg>
  `
  return clockIcon
}

/**
 * 创建对勾图标（已访问）
 * @returns {Element} 对勾图标元素
 */
function createCheckIcon() {
  const checkIcon = document.createElement('div')
  checkIcon.className = 'leadsMining-link-icon leadsMining-link-check'
  checkIcon.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path fill="#52c41a" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
    </svg>
  `
  return checkIcon
}

/**
 * 查找链接所在的搜索结果容器
 * @param {Element} link - 链接元素
 * @returns {Element|null} 搜索结果容器元素或null
 */
function findResultContainer(link) {
  // 尝试查找链接所在的搜索结果容器
  let container = link.closest('.g, .yuRUbf, .DhN8Cf')

  // 如果找不到直接的容器，尝试向上查找更大的容器
  if (!container) {
    container = link.closest('div[data-hveid], div[data-ved]')
  }

  return container || null
}

/**
 * 标记所有搜索结果链接为待访问状态
 * @param {Element[]} links - 链接元素数组
 */
export function markAllLinksToVisit(links) {
  if (!links || !links.length) return

  // 清除之前的所有标记
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
      // 移除图标和loading动画
      const icons = el.querySelectorAll('.leadsMining-link-icon, .leadsMining-link-loading')
      icons.forEach((icon) => icon.remove())
      // 移除data-visited属性
      el.removeAttribute('data-visited')
    })

  // 标记新的链接
  links.forEach((link) => {
    markLinkStatus(link, 'to-visit')
  })
}

/**
 * 滚动到指定链接
 * @param {Element} link - 要滚动到的链接元素
 */
export function scrollToLink(link) {
  if (!link) return

  // 获取链接的位置信息
  const rect = link.getBoundingClientRect()
  const isInView =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)

  // 如果链接不在视图中，滚动到链接
  if (!isInView) {
    // 计算滚动位置，使链接在视图中间
    const scrollTop = rect.top + window.pageYOffset - window.innerHeight / 2
    window.scrollTo({
      top: scrollTop,
      behavior: 'smooth',
    })
  }
}

/**
 * 添加链接状态样式到页面
 */
function addLinkStyles() {
  // 检查是否已经添加了样式
  if (document.getElementById('leadsMining-link-styles')) return

  // 创建样式元素
  const style = document.createElement('style')
  style.id = 'leadsMining-link-styles'
  style.textContent = `
    .leadsMining-link-to-visit,
    .leadsMining-link-visited,
    .leadsMining-link-current {
      border: 2px solid transparent !important;
      border-radius: 8px !important;
      padding: 8px !important;
      transition: all 0.3s !important;
      position: relative !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
    }
    
    .leadsMining-link-to-visit {
      border-color: #fa8c16 !important;
      background-color: rgba(250, 140, 22, 0.05) !important;
    }
    
    .leadsMining-link-visited {
      border-color: #52c41a !important;
      background-color: rgba(82, 196, 26, 0.05) !important;
    }
    
    .leadsMining-link-current {
      border-color: #1890ff !important;
      background-color: rgba(24, 144, 255, 0.05) !important;
      box-shadow: 0 0 12px rgba(24, 144, 255, 0.3) !important;
    }
    
    .leadsMining-link-icon,
    .leadsMining-link-loading {
      position: absolute !important;
      top: -8px !important;
      right: -8px !important;
      width: 24px !important;
      height: 24px !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 99 !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
    }
    
    .leadsMining-link-check {
      background: #f6ffed !important;
      border: 1px solid #52c41a !important;
    }
    
    .leadsMining-link-clock {
      background: #fff7e6 !important;
      border: 1px solid #fa8c16 !important;
    }
    
    .leadsMining-link-loading {
      background: #1890ff !important;
    }
    
    .leadsMining-spinner {
      display: inline-block !important;
      position: relative !important;
      width: 16px !important;
      height: 16px !important;
    }
    
    .leadsMining-spinner div {
      box-sizing: border-box !important;
      display: block !important;
      position: absolute !important;
      width: 12px !important;
      height: 12px !important;
      margin: 2px !important;
      border: 2px solid #fff !important;
      border-radius: 50% !important;
      animation: leadsMining-spinner 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite !important;
      border-color: #fff transparent transparent transparent !important;
    }
    
    .leadsMining-spinner div:nth-child(1) {
      animation-delay: -0.45s !important;
    }
    
    .leadsMining-spinner div:nth-child(2) {
      animation-delay: -0.3s !important;
    }
    
    .leadsMining-spinner div:nth-child(3) {
      animation-delay: -0.15s !important;
    }
    
    @keyframes leadsMining-spinner {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `

  // 添加样式到页面
  document.head.appendChild(style)
}
