// 模拟滚动到页面底部
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

// 获取总页数
export function getTotalPages() {
  // 尝试获取Google搜索结果页面的导航元素
  const navigationTD = document.querySelectorAll(
    '#botstuff div[role="navigation"] table tbody tr td',
  )

  if (!navigationTD || navigationTD.length === 0) {
    // 尝试其他可能的选择器
    const paginationElements = document.querySelectorAll('.AaVjTc td')
    if (paginationElements && paginationElements.length > 0) {
      return paginationElements.length - 2 // 减去"上一页"和"下一页"按钮
    }

    return null
  }

  return navigationTD.length - 2 // 减去"上一页"和"下一页"按钮
}

// 获取当前页数
export function getCurrentPage() {
  // 尝试获取当前页码元素
  const currentPageElement = document.querySelector('#navcnt > table tr > td.cur')

  if (!currentPageElement) {
    // 尝试其他可能的选择器
    const activePage = document.querySelector('.AaVjTc td.YyVfkd')
    if (activePage) {
      return parseInt(activePage.textContent, 10)
    }

    return 1 // 默认为第一页
  }

  return parseInt(currentPageElement.textContent, 10)
}

// 判断是否为最后一页
export function isLastPage() {
  // 检查是否存在"下一页"按钮
  const nextPageButton = document.querySelector('#pnnext, a.pn[id="pnnext"]')
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

// 点击下一页
export function clickNextPage() {
  const nextPageButton = document.querySelector('#pnnext, a.pn[id="pnnext"]')
  if (nextPageButton) {
    nextPageButton.click()
    return true
  }

  // 尝试其他可能的下一页按钮
  const altNextButton = document.querySelector(
    '.AaVjTc a[aria-label="下一页"], .AaVjTc a[aria-label="Next"]',
  )
  if (altNextButton) {
    altNextButton.click()
    return true
  }

  return false
}

// 执行Google搜索
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

// 获取搜索结果链接
export function getSearchResultLinks() {
  // 尝试多种可能的选择器来获取搜索结果链接
  const mainLinks = Array.from(
    document.querySelectorAll('div.g a[href]:not([href^="#"]):not([href^="javascript"])'),
  )
  const organicLinks = Array.from(document.querySelectorAll('.yuRUbf > a, .DhN8Cf > a'))

  // 合并结果并去重
  const allLinks = [...new Set([...mainLinks, ...organicLinks])]

  return allLinks.filter((link) => {
    const href = link.href

    // 排除Google内部链接
    if (
      href.includes('google.com/search') ||
      href.includes('google.com/url') ||
      href.includes('accounts.google') ||
      href.includes('support.google')
    ) {
      return false
    }

    return true
  })
}

// 检测是否为Google验证页面
export function isGoogleCaptchaPage() {
  // 检查URL
  if (
    window.location.href.includes('google.com/sorry') ||
    window.location.href.includes('ipv4.google.com/sorry')
  ) {
    return true
  }

  // 检查页面内容
  const captchaForm = document.querySelector('form[action*="sorry"]')
  const recaptchaElements = document.querySelectorAll('div.g-recaptcha, iframe[src*="recaptcha"]')
  const sorryText =
    document.body.innerText.includes('请完成以下验证') ||
    document.body.innerText.includes('unusual traffic') ||
    document.body.innerText.includes('请输入验证码')

  return captchaForm || recaptchaElements.length > 0 || sorryText
}

// (async function main() {
//   await scrollToBottom();

//   if (!isLastPage()) {
//     clickNextPage();
//   }
// })();
