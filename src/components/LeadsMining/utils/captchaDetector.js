/**
 * 检测页面中是否存在验证码
 * @returns {boolean} 是否存在验证码
 */
export const detectCaptcha = () => {
  // 检查是否存在验证码相关元素
  const captchaElements = document.querySelectorAll('form[action*="captcha"]')
  const recaptchaElements = document.querySelectorAll('div.g-recaptcha, iframe[src*="recaptcha"]')
  const captchaImages = document.querySelectorAll('img[src*="captcha"]')

  return captchaElements.length > 0 || recaptchaElements.length > 0 || captchaImages.length > 0
}

/**
 * 检测是否为Google验证页面
 * @returns {boolean} 是否为Google验证页面
 */
export const isGoogleCaptchaPage = () => {
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

/**
 * 检测验证码是否已解决
 * @returns {boolean} 验证码是否已解决
 */
export const isCaptchaSolved = () => {
  return !detectCaptcha() && !isGoogleCaptchaPage()
}
