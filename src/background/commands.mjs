import Browser from 'webextension-polyfill'
import { config as menuConfig } from '../content-script/menu-tools/index.mjs'

export function registerCommands() {
  Browser.commands.onCommand.addListener(async (command, tab) => {
    const message = {
      itemId: command,
      selectionText: '',
      useMenuPosition: false,
    }
    console.debug('command triggered', message)

    if (command in menuConfig) {
      if (menuConfig[command].action) {
        menuConfig[command].action(true, tab)
      }

      if (menuConfig[command].genPrompt) {
        const currentTab = (await Browser.tabs.query({ active: true, currentWindow: true }))[0]
        Browser.tabs.sendMessage(currentTab.id, {
          namespace: 'UI',
          type: 'request',
          action: 'CREATE_CHAT',
          data: message,
        })
      }
    }
  })
}
