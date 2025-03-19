import { render } from 'preact'
import '../../_locales/i18n-react'
import App from './App'
import { changeLanguage } from 'i18next'
import { getPreferredLanguageKey } from '../../config/index.mjs'
import i18nService, { I18N_API } from '../../services/messaging/i18n'

document.body.style.margin = 0
document.body.style.overflow = 'hidden'
getPreferredLanguageKey().then((lang) => {
  changeLanguage(lang)
})

// 使用新的i18n服务注册语言变更处理器
i18nService.registerHandler(I18N_API.CHANGE_LANGUAGE, (data) => {
  if (data && data.lang) {
    changeLanguage(data.lang)
  }
  return { success: true }
})

render(<App />, document.getElementById('app'))
