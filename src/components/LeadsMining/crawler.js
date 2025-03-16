// 1. 提取页面文本
export function getPageText() {
  const bodyText = document.body.innerText
  return bodyText
}

// 2. 从文本中匹配邮箱地址
export function matchEmailsInText(text) {
  // 简化后的正则表达式，移除了不必要的控制字符
  const emailRegEx = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
  const matches = text.match(emailRegEx) || []
  return matches
}

// 3. 删除重复的邮箱地址
export function removeDuplicates(array) {
  const uniqueEmails = Array.from(new Set(array))
  setTimeout(() => {
    markEmails(uniqueEmails)
  }, 1000)
  return uniqueEmails
}

// 标记页面中的邮箱地址
export function markEmails(emails) {
  const markedEmails = []

  emails.forEach((email) => {
    const emailRegExp = new RegExp(
      '\\b' + email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b',
      'g',
    )
    document.body.innerHTML = document.body.innerHTML.replace(emailRegExp, (match) => {
      const markedEmail = `<span class="marked-email" data-email="${email}" style="color: red; cursor: pointer;">${match}</span>`
      markedEmails.push(markedEmail)
      return markedEmail
    })
  })

  return markedEmails
}

export const scrollToEmail = (element) => {
  window.scrollTo({
    top: element.getBoundingClientRect().top + window.scrollY - 100,
    behavior: 'smooth',
  })
}

export const highlightEmail = (element) => {
  const originalColor = element.style.backgroundColor
  const originalBorderColor = element.style.borderColor
  element.style.backgroundColor = 'yellow'
  element.style.borderColor = 'red'

  setTimeout(() => {
    element.style.backgroundColor = originalColor
    element.style.borderColor = originalBorderColor
  }, 3000)
}
