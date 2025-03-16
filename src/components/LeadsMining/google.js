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
  const navigationTD = document.querySelectorAll(
    '#botstuff div[role="navigation"] table tbody tr td',
  )
  if (!navigationTD) return null
  return navigationTD.length - 2
}

// 获取当前页数
export function getCurrentPage() {
  const currentPageElement = document.querySelector('#navcnt > table tr > td.cur')
  if (!currentPageElement) return null
  return parseInt(currentPageElement.textContent, 10)
}

// 判断是否为最后一页
export function isLastPage() {
  const totalPages = getTotalPages()
  const currentPage = getCurrentPage()

  return totalPages && currentPage && currentPage === totalPages
}

// 点击下一页
export function clickNextPage() {
  const nextPageButton = document.querySelector('#pnnext')
  if (nextPageButton) nextPageButton.click()
}

// (async function main() {
//   await scrollToBottom();

//   if (!isLastPage()) {
//     clickNextPage();
//   }
// })();
