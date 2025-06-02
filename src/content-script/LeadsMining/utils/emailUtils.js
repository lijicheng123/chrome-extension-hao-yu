// 用于跟踪已标记的邮箱，防止重复标记
const markedEmailsSet = new Set()

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
 * 从文本中匹配邮箱地址
 * @param {string} text - 要匹配的文本
 * @returns {string[]} 匹配到的邮箱地址数组
 */
export const matchEmailsInText = (text) => {
  const emailRegEx = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
  const matches = text.match(emailRegEx) || []

  return matches.filter((email) => {
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
}

/**
 * 删除重复的邮箱地址
 * @param {string[]} array - 邮箱地址数组
 * @returns {string[]} 去重后的邮箱地址数组
 */
export const removeDuplicates = (array) => {
  return Array.from(new Set(array))
}

/**
 * 标记页面中的邮箱地址
 * @param {Array<string|{user_email: string}>} emails - 邮箱地址数组或邮箱对象数组
 * @returns {Element[]} 标记的邮箱元素数组
 */
export const markEmails = (emails) => {
  const markedEmails = []
  // 检查是否已经运行过标记操作
  if (document.querySelector('.marked-email-container')) {
    console.log('页面已经包含标记的邮箱，跳过重复标记')
    return markedEmails
  }

  emails.forEach((emailItem) => {
    // 处理字符串或对象类型的邮箱
    const email = typeof emailItem === 'string' ? emailItem : emailItem.user_email
    
    if (!email || markedEmailsSet.has(email)) {
      console.log(`邮箱 ${email} 已被标记或无效，跳过`)
      return
    }

    markedEmailsSet.add(email)
    const emailRegExp = new RegExp(
      '\\b' + email.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b',
      'g',
    )

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false)
    const nodesToReplace = []
    let node

    while ((node = walker.nextNode())) {
      if (emailRegExp.test(node.nodeValue)) {
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
      if (
        parent &&
        !parent.classList?.contains('marked-email-container') &&
        !parent.closest('.marked-email-container')
      ) {
        const content = textNode.nodeValue
        const fragment = document.createDocumentFragment()
        let lastIndex = 0
        let match

        emailRegExp.lastIndex = 0

        while ((match = emailRegExp.exec(content)) !== null) {
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(content.substring(lastIndex, match.index)))
          }

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

        if (lastIndex < content.length) {
          fragment.appendChild(document.createTextNode(content.substring(lastIndex)))
        }

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
 * 清除页面上所有标记的邮箱
 */
export const clearMarkedEmails = () => {
  markedEmailsSet.clear()

  const containers = document.querySelectorAll('.marked-email-container')
  containers.forEach((container) => {
    const text = container.textContent
    const textNode = document.createTextNode(text)
    if (container.parentNode) {
      container.parentNode.replaceChild(textNode, container)
    }
  })
} 