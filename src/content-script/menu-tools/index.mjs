import { getCoreContentText } from '../../utils/get-core-content-text'
import Browser from 'webextension-polyfill'
import { getUserConfig } from '../../config/index.mjs'
import { openUrl } from '../../utils/open-url'

export const config = {
  newChat: {
    label: 'New Chat',
    genPrompt: async () => {
      return ''
    },
  },
  summarizePage: {
    label: 'Summarize Page',
    genPrompt: async () => {
      return `You are an expert summarizer. Carefully analyze the following web page content and provide a concise summary focusing on the key points:\n${getCoreContentText()}`
    },
  },
  batchDownloadImages: {
    label: 'Batch Download Images',
    action: async (fromBackground, tab) => {
      console.debug('batch download images action', fromBackground)
      if (fromBackground) {
        // 从后台脚本调用时，发送消息到内容脚本
        Browser.tabs.sendMessage(tab.id, {
          namespace: 'UI',
          type: 'request',
          action: 'OPEN_BATCH_IMAGE_DOWNLOADER',
          data: {},
        })
      } else {
        // 从内容脚本调用时，直接发送消息
        Browser.runtime.sendMessage({
          namespace: 'UI',
          type: 'request',
          action: 'OPEN_BATCH_IMAGE_DOWNLOADER',
          data: {},
        })
      }
    },
  },
  openConversationPage: {
    label: 'Open Conversation Page',
    action: async (fromBackground) => {
      console.debug('action is from background', fromBackground)
      if (fromBackground) {
        openUrl(Browser.runtime.getURL('IndependentPanel.html'))
      } else {
        Browser.runtime.sendMessage({
          type: 'OPEN_URL',
          data: {
            url: Browser.runtime.getURL('IndependentPanel.html'),
          },
        })
      }
    },
  },
  openConversationWindow: {
    label: 'Open Conversation Window',
    action: async (fromBackground) => {
      console.debug('action is from background', fromBackground)
      if (fromBackground) {
        const config = await getUserConfig()
        const url = Browser.runtime.getURL('IndependentPanel.html')
        const tabs = await Browser.tabs.query({ url: url, windowType: 'popup' })
        if (!config.alwaysCreateNewConversationWindow && tabs.length > 0)
          await Browser.windows.update(tabs[0].windowId, { focused: true })
        else
          await Browser.windows.create({
            url: url,
            type: 'popup',
            width: 500,
            height: 650,
          })
      } else {
        Browser.runtime.sendMessage({
          type: 'OPEN_CHAT_WINDOW',
          data: {},
        })
      }
    },
  },
  closeAllChats: {
    label: 'Close All Chats In This Page',
    action: async (fromBackground) => {
      console.debug('action is from background', fromBackground)
      Browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        Browser.tabs.sendMessage(tabs[0].id, {
          type: 'CLOSE_CHATS',
          data: {},
        })
      })
    },
  },
}
