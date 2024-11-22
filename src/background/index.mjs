import Browser from 'webextension-polyfill'
import {
  deleteConversation,
  generateAnswersWithChatgptWebApi,
  sendMessageFeedback,
} from '../services/apis/chatgpt-web'
import { generateAnswersWithBingWebApi } from '../services/apis/bing-web.mjs'
import {
  generateAnswersWithChatgptApi,
  generateAnswersWithGptCompletionApi,
} from '../services/apis/openai-api'
import { generateAnswersWithCustomApi } from '../services/apis/custom-api.mjs'
import { generateAnswersWithOllamaApi } from '../services/apis/ollama-api.mjs'
import { generateAnswersWithAzureOpenaiApi } from '../services/apis/azure-openai-api.mjs'
import { generateAnswersWithClaudeApi } from '../services/apis/claude-api.mjs'
import { generateAnswersWithChatGLMApi } from '../services/apis/chatglm-api.mjs'
import { generateAnswersWithWaylaidwandererApi } from '../services/apis/waylaidwanderer-api.mjs'
import {
  defaultConfig,
  getUserConfig,
  setUserConfig,
  isUsingChatgptWebModel,
  isUsingBingWebModel,
  isUsingGptCompletionApiModel,
  isUsingChatgptApiModel,
  isUsingCustomModel,
  isUsingOllamaApiModel,
  isUsingAzureOpenAiApiModel,
  isUsingClaudeApiModel,
  isUsingChatGLMApiModel,
  isUsingGithubThirdPartyApiModel,
  isUsingGeminiWebModel,
  isUsingClaudeWebModel,
  isUsingMoonshotApiModel,
  isUsingMoonshotWebModel,
} from '../config/index.mjs'
import '../_locales/i18n'
import { openUrl } from '../utils/open-url'
import {
  getBardCookies,
  getBingAccessToken,
  getChatGptAccessToken,
  getClaudeSessionKey,
  registerPortListener,
} from '../services/wrappers.mjs'
import { refreshMenu } from './menus.mjs'
import { registerCommands } from './commands.mjs'
import { generateAnswersWithBardWebApi } from '../services/apis/bard-web.mjs'
import { generateAnswersWithClaudeWebApi } from '../services/apis/claude-web.mjs'
import { generateAnswersWithMoonshotCompletionApi } from '../services/apis/moonshot-api.mjs'
import { generateAnswersWithMoonshotWebApi } from '../services/apis/moonshot-web.mjs'
import { isUsingModelName } from '../utils/model-name-convert.mjs'
import twpConfig from '../lib/config.mjs'
import { platformInfo } from '../lib/platformInfo.mjs'
import { resetBrowserAction } from './chrome_background.mjs'

function setPortProxy(port, proxyTabId) {
  port.proxy = Browser.tabs.connect(proxyTabId)
  const proxyOnMessage = (msg) => {
    port.postMessage(msg)
  }
  const portOnMessage = (msg) => {
    port.proxy.postMessage(msg)
  }
  const proxyOnDisconnect = () => {
    port.proxy = Browser.tabs.connect(proxyTabId)
  }
  const portOnDisconnect = () => {
    port.proxy.onMessage.removeListener(proxyOnMessage)
    port.onMessage.removeListener(portOnMessage)
    port.proxy.onDisconnect.removeListener(proxyOnDisconnect)
    port.onDisconnect.removeListener(portOnDisconnect)
  }
  port.proxy.onMessage.addListener(proxyOnMessage)
  port.onMessage.addListener(portOnMessage)
  port.proxy.onDisconnect.addListener(proxyOnDisconnect)
  port.onDisconnect.addListener(portOnDisconnect)
}

async function executeApi(session, port, config) {
  console.debug('modelName', session.modelName)
  console.debug('apiMode', session.apiMode)
  if (isUsingCustomModel(session)) {
    if (!session.apiMode)
      await generateAnswersWithCustomApi(
        port,
        session.question,
        session,
        config.customModelApiUrl.trim() || 'http://localhost:8000/v1/chat/completions',
        config.customApiKey,
        config.customModelName,
      )
    else
      await generateAnswersWithCustomApi(
        port,
        session.question,
        session,
        session.apiMode.customUrl.trim() ||
          config.customModelApiUrl.trim() ||
          'http://localhost:8000/v1/chat/completions',
        session.apiMode.apiKey.trim() || config.customApiKey,
        session.apiMode.customName,
      )
  } else if (isUsingChatgptWebModel(session)) {
    let tabId
    if (
      config.chatgptTabId &&
      config.customChatGptWebApiUrl === defaultConfig.customChatGptWebApiUrl
    ) {
      const tab = await Browser.tabs.get(config.chatgptTabId).catch(() => {})
      if (tab) tabId = tab.id
    }
    if (tabId) {
      if (!port.proxy) {
        setPortProxy(port, tabId)
        port.proxy.postMessage({ session })
      }
    } else {
      const accessToken = await getChatGptAccessToken()
      await generateAnswersWithChatgptWebApi(port, session.question, session, accessToken)
    }
  } else if (isUsingClaudeWebModel(session)) {
    const sessionKey = await getClaudeSessionKey()
    await generateAnswersWithClaudeWebApi(port, session.question, session, sessionKey)
  } else if (isUsingMoonshotWebModel(session)) {
    await generateAnswersWithMoonshotWebApi(port, session.question, session, config)
  } else if (isUsingBingWebModel(session)) {
    const accessToken = await getBingAccessToken()
    if (isUsingModelName('bingFreeSydney', session))
      await generateAnswersWithBingWebApi(port, session.question, session, accessToken, true)
    else await generateAnswersWithBingWebApi(port, session.question, session, accessToken)
  } else if (isUsingGeminiWebModel(session)) {
    const cookies = await getBardCookies()
    await generateAnswersWithBardWebApi(port, session.question, session, cookies)
  } else if (isUsingChatgptApiModel(session)) {
    await generateAnswersWithChatgptApi(port, session.question, session, config.apiKey)
  } else if (isUsingClaudeApiModel(session)) {
    await generateAnswersWithClaudeApi(port, session.question, session)
  } else if (isUsingMoonshotApiModel(session)) {
    await generateAnswersWithMoonshotCompletionApi(
      port,
      session.question,
      session,
      config.moonshotApiKey,
    )
  } else if (isUsingChatGLMApiModel(session)) {
    await generateAnswersWithChatGLMApi(port, session.question, session)
  } else if (isUsingOllamaApiModel(session)) {
    await generateAnswersWithOllamaApi(port, session.question, session)
  } else if (isUsingAzureOpenAiApiModel(session)) {
    await generateAnswersWithAzureOpenaiApi(port, session.question, session)
  } else if (isUsingGptCompletionApiModel(session)) {
    await generateAnswersWithGptCompletionApi(port, session.question, session, config.apiKey)
  } else if (isUsingGithubThirdPartyApiModel(session)) {
    await generateAnswersWithWaylaidwandererApi(port, session.question, session)
  }
}

Browser.runtime.onMessage.addListener(async (message, sender) => {
  console.log('🚀 ~ Browser.runtime.onMessage.addListener ~ message:', message, sender)
  switch (message.type) {
    case 'FEEDBACK': {
      const token = await getChatGptAccessToken()
      await sendMessageFeedback(token, message.data)
      break
    }
    case 'DELETE_CONVERSATION': {
      const token = await getChatGptAccessToken()
      await deleteConversation(token, message.data.conversationId)
      break
    }
    case 'NEW_URL': {
      await Browser.tabs.create({
        url: message.data.url,
        pinned: message.data.pinned,
      })
      if (message.data.jumpBack) {
        await setUserConfig({
          notificationJumpBackTabId: sender.tab.id,
        })
      }
      break
    }
    case 'SET_CHATGPT_TAB': {
      await setUserConfig({
        chatgptTabId: sender.tab.id,
      })
      break
    }
    case 'ACTIVATE_URL':
      await Browser.tabs.update(message.data.tabId, { active: true })
      break
    case 'OPEN_URL':
      openUrl(message.data.url)
      break
    case 'OPEN_CHAT_WINDOW': {
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
      break
    }
    case 'REFRESH_MENU':
      refreshMenu()
      break
    case 'PIN_TAB': {
      let tabId
      if (message.data.tabId) tabId = message.data.tabId
      else tabId = sender.tab.id

      await Browser.tabs.update(tabId, { pinned: true })
      if (message.data.saveAsChatgptConfig) {
        await setUserConfig({ chatgptTabId: tabId })
      }
      break
    }
    case 'FETCH': {
      if (message.data.input.includes('bing.com')) {
        const accessToken = await getBingAccessToken()
        await setUserConfig({ bingAccessToken: accessToken })
      }

      try {
        const response = await fetch(message.data.input, message.data.init)
        const text = await response.text()
        return [
          {
            body: text,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers),
          },
          null,
        ]
      } catch (error) {
        return [null, error]
      }
    }
    case 'GET_COOKIE': {
      return (await Browser.cookies.get({ url: message.data.url, name: message.data.name }))?.value
    }
    case 'getTabUrl': {
      return sender.url
    }
  }
})

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'activeTabPort') {
    port.onMessage.addListener((message) => {
      if (message.action === 'queryActiveTab') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          console.log('🚀 ~ chrome.tabs.query ~ tabs:', tabs)
          if (tabs.length > 0) {
            const tabId = tabs[0].id
            port.postMessage({ tabId })
            chrome.tabs.sendMessage(tabId, { action: 'toggle-translation' })
          } else {
            port.postMessage({ tabId: null })
          }
        })
      }
    })
  }
})

try {
  Browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (
        details.url.includes('/public_key') &&
        !details.url.includes(defaultConfig.chatgptArkoseReqParams)
      ) {
        let formData = new URLSearchParams()
        for (const k in details.requestBody.formData) {
          formData.append(k, details.requestBody.formData[k])
        }
        setUserConfig({
          chatgptArkoseReqUrl: details.url,
          chatgptArkoseReqForm:
            formData.toString() ||
            new TextDecoder('utf-8').decode(new Uint8Array(details.requestBody.raw[0].bytes)),
        }).then(() => {
          console.log('Arkose req url and form saved')
        })
      }
    },
    {
      urls: ['https://*.openai.com/*', 'https://*.chatgpt.com/*'],
      types: ['xmlhttprequest'],
    },
    ['requestBody'],
  )

  Browser.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      const headers = details.requestHeaders
      for (let i = 0; i < headers.length; i++) {
        if (headers[i].name === 'Origin') {
          headers[i].value = 'https://www.bing.com'
        } else if (headers[i].name === 'Referer') {
          headers[i].value = 'https://www.bing.com/search?q=Bing+AI&showconv=1&FORM=hpcodx'
        }
      }
      return { requestHeaders: headers }
    },
    {
      urls: ['wss://sydney.bing.com/*', 'https://www.bing.com/*'],
      types: ['xmlhttprequest', 'websocket'],
    },
    ['requestHeaders'],
  )

  Browser.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (!tab.url) return
    // eslint-disable-next-line no-undef
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'IndependentPanel.html',
      enabled: true,
    })
  })
} catch (error) {
  console.log(error)
}

registerPortListener(async (session, port, config) => await executeApi(session, port, config))
registerCommands()
refreshMenu()

twpConfig.onReady(() => {
  if (platformInfo.isMobile.any) {
    chrome.tabs.query({}, (tabs) => tabs.forEach((tab) => chrome.pageAction.hide(tab.id)))

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status == 'loading') {
        chrome.pageAction.hide(tabId)
      }
    })

    chrome.action.onClicked.addListener((tab) => {
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: 'showPopupMobile',
        },
        {
          frameId: 0,
        },
        checkedLastError,
      )
    })
  } else {
    if (chrome.pageAction) {
      chrome.pageAction.onClicked.addListener((tab) => {
        if (twpConfig.get('translateClickingOnce') === 'yes') {
          chrome.tabs.sendMessage(
            tab.id,
            {
              action: 'toggle-translation',
            },
            checkedLastError,
          )
        }
      })
    }
    chrome.action.onClicked.addListener((tab) => {
      if (twpConfig.get('translateClickingOnce') === 'yes') {
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: 'toggle-translation',
          },
          checkedLastError,
        )
      }
    })

    resetBrowserAction()

    twpConfig.onChanged((name, newvalue) => {
      console.log('🚀 ~ twpConfig.onChanged ~ name:', name)
      switch (name) {
        case 'translateClickingOnce':
          resetBrowserAction()
          chrome.tabs.query(
            {
              currentWindow: true,
              active: true,
            },
            (tabs) => {
              resetPageAction(tabs[0].id)
            },
          )
          break
      }
    })

    if (chrome.pageAction && browser) {
      let pageLanguageState = 'original'

      let themeColorPopupText = null
      browser.theme.getCurrent().then((theme) => {
        themeColorPopupText = null
        if (theme.colors && (theme.colors.toolbar_field_text || theme.colors.popup_text)) {
          themeColorPopupText = theme.colors.toolbar_field_text || theme.colors.popup_text
        }
        updateIconInAllTabs()
      })

      chrome.theme.onUpdated.addListener((updateInfo) => {
        themeColorPopupText = null
        if (
          updateInfo.theme.colors &&
          (updateInfo.theme.colors.toolbar_field_text || updateInfo.theme.colors.popup_text)
        ) {
          themeColorPopupText =
            updateInfo.theme.colors.toolbar_field_text || updateInfo.theme.colors.popup_text
        }
        updateIconInAllTabs()
      })

      let darkMode = false
      darkMode = matchMedia('(prefers-color-scheme: dark)').matches
      updateIconInAllTabs()

      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        darkMode = matchMedia('(prefers-color-scheme: dark)').matches
        updateIconInAllTabs()
      })

      function getSVGIcon() {
        const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M 45 0 C 20.186 0 0 20.186 0 45 L 0 347 C 0 371.814 20.186 392 45 392 L 301 392 C 305.819 392 310.34683 389.68544 313.17383 385.77344 C 315.98683 381.84744 316.76261 376.82491 315.22461 372.25391 L 195.23828 10.269531 A 14.995 14.995 0 0 0 181 0 L 45 0 z M 114.3457 107.46289 L 156.19336 107.46289 C 159.49489 107.46289 162.41322 109.61359 163.39258 112.76367 L 163.38281 112.77539 L 214.06641 276.2832 C 214.77315 278.57508 214.35913 281.05986 212.93555 282.98828 C 211.52206 284.90648 209.27989 286.04688 206.87695 286.04688 L 179.28516 286.04688 C 175.95335 286.04687 173.01546 283.86624 172.06641 280.67578 L 159.92969 240.18945 L 108.77148 240.18945 L 97.564453 280.52344 C 96.655774 283.77448 93.688937 286.03711 90.306641 286.03711 L 64.347656 286.03711 C 61.954806 286.03711 59.71461 284.90648 58.291016 282.98828 C 56.867422 281.05986 56.442021 278.57475 57.138672 276.29297 L 107.14648 112.79492 C 108.11572 109.62465 111.03407 107.46289 114.3457 107.46289 z M 133.39648 137.70117 L 114.55664 210.03125 L 154.06445 210.03125 L 133.91211 137.70117 L 133.39648 137.70117 z " />
                  <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M226.882 378.932c28.35 85.716 26.013 84.921 34.254 88.658a14.933 14.933 0 0 0 6.186 1.342c5.706 0 11.16-3.274 13.67-8.809l36.813-81.19z" />
                  <g>
                  <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M467 121H247.043L210.234 10.268A15 15 0 0 0 196 0H45C20.187 0 0 20.187 0 45v301c0 24.813 20.187 45 45 45h165.297l36.509 110.438c2.017 6.468 7.999 10.566 14.329 10.566.035 0 .07-.004.105-.004h205.761c24.813 0 45-20.187 45-45V166C512 141.187 491.813 121 467 121zM45 361c-8.271 0-15-6.729-15-15V45c0-8.271 6.729-15 15-15h140.179l110.027 331H45zm247.729 30l-29.4 64.841L241.894 391zM482 467c0 8.271-6.729 15-15 15H284.408l45.253-99.806a15.099 15.099 0 0 0 .571-10.932L257.015 151H467c8.271 0 15 6.729 15 15z" />
                  <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M444.075 241h-45v-15c0-8.284-6.716-15-15-15-8.284 0-15 6.716-15 15v15h-45c-8.284 0-15 6.716-15 15 0 8.284 6.716 15 15 15h87.14c-4.772 14.185-15.02 30.996-26.939 47.174a323.331 323.331 0 0 1-7.547-10.609c-4.659-6.851-13.988-8.628-20.838-3.969-6.85 4.658-8.627 13.988-3.969 20.839 4.208 6.189 8.62 12.211 13.017 17.919-7.496 8.694-14.885 16.57-21.369 22.94-5.913 5.802-6.003 15.299-.2 21.212 5.777 5.889 15.273 6.027 21.211.201.517-.508 8.698-8.566 19.624-20.937 10.663 12.2 18.645 20.218 19.264 20.837 5.855 5.855 15.35 5.858 21.208.002 5.858-5.855 5.861-15.352.007-21.212-.157-.157-9.34-9.392-21.059-23.059 21.233-27.448 34.18-51.357 38.663-71.338h1.786c8.284 0 15-6.716 15-15 0-8.284-6.715-15-14.999-15z" />
                  </g>
              </svg>
              `

        let svg64
        if (
          pageLanguageState === 'translated' &&
          twpConfig.get('popupBlueWhenSiteIsTranslated') === 'yes'
        ) {
          svg64 = svgXml.replace(/\$\(fill\-opacity\)\;/g, '1.0')
          svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, '#45a1ff'))
        } else {
          svg64 = svgXml.replace(/\$\(fill\-opacity\)\;/g, '0.5')
          if (themeColorPopupText) {
            svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, themeColorPopupText))
          } else if (darkMode) {
            svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, 'white'))
          } else {
            svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, 'black'))
          }
        }

        const b64Start = 'data:image/svg+xml;base64,'
        return b64Start + svg64
      }

      function updateIcon(tabId) {
        resetPageAction(tabId)
        chrome.pageAction.setIcon({
          tabId: tabId,
          path: getSVGIcon(),
        })

        if (twpConfig.get('showButtonInTheAddressBar') == 'no') {
          chrome.pageAction.hide(tabId)
        } else {
          chrome.pageAction.show(tabId)
        }
      }

      function updateIconInAllTabs() {
        chrome.tabs.query({}, (tabs) => tabs.forEach((tab) => updateIcon(tab.id)))
      }

      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status == 'loading') {
          pageLanguageState = 'original'
          updateIcon(tabId)
        }
      })

      chrome.tabs.onActivated.addListener((activeInfo) => {
        pageLanguageState = 'original'
        updateIcon(activeInfo.tabId)
        chrome.tabs.sendMessage(
          activeInfo.tabId,
          {
            action: 'getCurrentPageLanguageState',
          },
          {
            frameId: 0,
          },
          (_pageLanguageState) => {
            checkedLastError()
            if (_pageLanguageState) {
              pageLanguageState = _pageLanguageState
              updateIcon(activeInfo.tabId)
            }
          },
        )
      })

      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('🚀 ~ chrome.runtime.onMessage.addListener ~ request:', request)
        if (request.action === 'setPageLanguageState') {
          pageLanguageState = request.pageLanguageState
          updateIcon(sender.tab.id)
        }
      })

      twpConfig.onChanged((name, newvalue) => {
        switch (name) {
          case 'showButtonInTheAddressBar':
            updateIconInAllTabs()
            break
        }
      })
    }
  }
})
