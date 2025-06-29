import { createRoot } from 'react-dom/client'
import Popup from './Popup'
import '../_locales/i18n-react'
import { getUserConfig } from '../config/index.mjs'
import { config as menuConfig } from '../content-script/menu-tools/index.mjs'
import Browser from 'webextension-polyfill'

getUserConfig().then(async (config) => {
  if (config.clickIconAction === 'popup' || (window.innerWidth > 100 && window.innerHeight > 100)) {
    const root = createRoot(document.getElementById('app'))
    root.render(<Popup />)
  } else {
    const message = {
      itemId: config.clickIconAction,
      selectionText: '',
      useMenuPosition: false,
    }
    console.debug('custom icon action triggered', message)

    if (config.clickIconAction in menuConfig) {
      const currentTab = (await Browser.tabs.query({ active: true, currentWindow: true }))[0]

      if (menuConfig[config.clickIconAction].action) {
        menuConfig[config.clickIconAction].action(false, currentTab)
      }

      if (menuConfig[config.clickIconAction].genPrompt) {
        Browser.tabs.sendMessage(currentTab.id, {
          namespace: 'UI',
          type: 'request',
          action: 'CREATE_CHAT',
          data: message,
        })
      }
    }
    window.close()
  }
})
