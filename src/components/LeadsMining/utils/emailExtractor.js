import { getCleanedPageText } from './htmlCleaner'
/**
 * 提取页面文本
 * @returns {string} 页面文本内容
 */
export function getPageText() {
  const bodyText = document.body.innerText
  const bodyHtml = getCleanedPageText()
  console.log('bodyHtml===>', bodyHtml)

  return bodyText
}

export function getPageHtml() {
  const bodyHtml = getCleanedPageText()
  return bodyHtml
}

/**
 * 从文本中匹配邮箱地址
 * @param {string} text - 要匹配的文本
 * @returns {string[]} 匹配到的邮箱地址数组
 */
export function matchEmailsInText(text) {
  // 更完善的邮箱正则表达式
  const emailRegEx = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
  const matches = text.match(emailRegEx) || []

  // 过滤掉一些常见的无效邮箱
  const filteredMatches = matches.filter((email) => {
    // 排除常见的示例邮箱
    if (
      email.includes('example.com') ||
      email.includes('domain.com') ||
      email.includes('yourdomain.com') ||
      email.includes('sample.com')
    ) {
      return false
    }

    // 排除明显无效的邮箱
    if (
      email.includes('xxx') ||
      email.includes('@email.com') ||
      email.includes('@mail.com') ||
      email.includes('@yourcompany.com')
    ) {
      return false
    }

    return true
  })

  return filteredMatches
}

/**
 * 删除重复的邮箱地址
 * @param {string[]} array - 邮箱地址数组
 * @returns {string[]} 去重后的邮箱地址数组
 */
export function removeDuplicates(array) {
  const uniqueEmails = Array.from(new Set(array))

  // 只在搜索结果页面（深度为0）标记邮箱，避免在详情页重复标记
  const urlParams = new URLSearchParams(window.location.search)
  const pageDepth = urlParams.get('leadsMining_pageDepth')

  if (pageDepth === null || pageDepth === '0') {
    setTimeout(() => {
      markEmails(uniqueEmails)
    }, 1000)
  }

  return uniqueEmails
}

// 用于跟踪已标记的邮箱，防止重复标记
const markedEmailsSet = new Set()

/**
 * 标记页面中的邮箱地址
 * @param {string[]} emails - 邮箱地址数组
 * @returns {Element[]} 标记的邮箱元素数组
 */
export function markEmails(emails) {
  const markedEmails = []

  // 检查是否已经运行过标记操作
  if (document.querySelector('.marked-email-container')) {
    console.log('页面已经包含标记的邮箱，跳过重复标记')
    return markedEmails
  }

  emails.forEach((email) => {
    // 检查此邮箱是否已被标记
    if (markedEmailsSet.has(email)) {
      console.log(`邮箱 ${email} 已被标记，跳过`)
      return
    }

    // 将邮箱添加到已标记集合
    markedEmailsSet.add(email)

    const emailRegExp = new RegExp(
      '\\b' + email.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b',
      'g',
    )

    // 使用更安全的方式替换文本，避免破坏页面结构
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false)

    const nodesToReplace = []
    let node

    while ((node = walker.nextNode())) {
      if (emailRegExp.test(node.nodeValue)) {
        // 检查父节点是否已经在处理列表中
        const parent = node.parentNode
        if (
          parent &&
          !parent.classList?.contains('marked-email-container') &&
          !parent.closest('.marked-email-container')
        ) {
          nodesToReplace.push(node)
        }
      }
    }

    nodesToReplace.forEach((textNode) => {
      const parent = textNode.parentNode
      // 额外检查，确保父节点不在已标记的容器内
      if (
        parent &&
        !parent.classList?.contains('marked-email-container') &&
        !parent.closest('.marked-email-container')
      ) {
        const content = textNode.nodeValue
        const fragment = document.createDocumentFragment()
        let lastIndex = 0
        let match

        emailRegExp.lastIndex = 0 // 重置正则表达式

        while ((match = emailRegExp.exec(content)) !== null) {
          // 添加匹配前的文本
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(content.substring(lastIndex, match.index)))
          }

          // 创建标记的邮箱元素
          const markedSpan = document.createElement('span')
          markedSpan.className = 'marked-email'
          markedSpan.dataset.email = email
          markedSpan.style.color = 'red'
          markedSpan.style.cursor = 'pointer'
          markedSpan.style.backgroundColor = 'rgba(255, 255, 0, 0.3)'
          markedSpan.style.border = '1px dashed #f00'
          markedSpan.style.padding = '2px 4px'
          markedSpan.style.borderRadius = '2px'
          markedSpan.textContent = match[0]

          fragment.appendChild(markedSpan)
          markedEmails.push(markedSpan)

          lastIndex = match.index + match[0].length
        }

        // 添加剩余的文本
        if (lastIndex < content.length) {
          fragment.appendChild(document.createTextNode(content.substring(lastIndex)))
        }

        // 替换原始节点
        if (fragment.childNodes.length > 0) {
          const container = document.createElement('span')
          container.className = 'marked-email-container'
          container.appendChild(fragment)
          parent.replaceChild(container, textNode)
        }
      }
    })
  })

  return markedEmails
}

/**
 * 滚动到邮箱元素位置
 * @param {Element} element - 邮箱元素
 */
export const scrollToEmail = (element) => {
  if (!element) return

  window.scrollTo({
    top: element.getBoundingClientRect().top + window.scrollY - 100,
    behavior: 'smooth',
  })
}

/**
 * 高亮显示邮箱元素
 * @param {Element} element - 邮箱元素
 */
export const highlightEmail = (element) => {
  if (!element) return

  const originalColor = element.style.backgroundColor
  const originalBorderColor = element.style.borderColor

  element.style.backgroundColor = 'yellow'
  element.style.borderColor = 'red'
  element.style.transition = 'all 0.3s'

  setTimeout(() => {
    element.style.backgroundColor = originalColor
    element.style.borderColor = originalBorderColor
  }, 3000)
}

/**
 * 检查是否为有效的邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否为有效邮箱
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

/**
 * 从页面中提取所有可能的邮箱
 * @returns {string[]} 邮箱地址数组
 */
export const extractAllEmails = () => {
  const pageText = getPageText()
  const emails = matchEmailsInText(pageText)
  return removeDuplicates(emails)
}

/**
 * 从特定元素中提取邮箱
 * @param {Element} element - 要提取邮箱的元素
 * @returns {string[]} 邮箱地址数组
 */
export const extractEmailsFromElement = (element) => {
  if (!element) return []

  const text = element.innerText
  const emails = matchEmailsInText(text)
  return removeDuplicates(emails)
}

/**
 * 清除页面上所有标记的邮箱
 */
export const clearMarkedEmails = () => {
  // 清除已标记的邮箱集合
  markedEmailsSet.clear()

  // 移除所有标记的邮箱容器
  const containers = document.querySelectorAll('.marked-email-container')
  containers.forEach((container) => {
    // 获取容器的文本内容
    const text = container.textContent
    // 创建文本节点替换容器
    const textNode = document.createTextNode(text)
    // 替换容器
    if (container.parentNode) {
      container.parentNode.replaceChild(textNode, container)
    }
  })
}
