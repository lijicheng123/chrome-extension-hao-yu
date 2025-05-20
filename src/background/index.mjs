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
import { generateAnswersWithDoubaoApi } from '../services/apis/doubao-api.mjs'
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
  isUsingDoubaoApiModel,
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
import { registerCookieListener } from './syncCookies.mjs'
import leadsMiningService from '../services/messaging/leadsMining'
import { ApiBackgroundHandlers } from '../services/messaging/api'
import { UiBackgroundHandlers } from '../services/messaging/ui'
import i18nService from '../services/messaging/i18n'
import { AuthBackgroundHandlers } from '../services/messaging/auth'
import { fetchOdooUserSessionInfo, clearUserSessionInfo } from './userSessionInfo.mjs'

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
  if (isUsingDoubaoApiModel(session)) {
    // 判断是否使用流式响应
    const useStream = session.stream === true
    await generateAnswersWithDoubaoApi(port, session.question, session, { stream: useStream })
  } else if (isUsingCustomModel(session)) {
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
    case 'LOGOUT': {
      return await clearUserSessionInfo()
    }
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
} catch (error) {
  console.log(error)
}

// 初始化消息服务
console.log('初始化消息服务...')

// 注册API处理器
ApiBackgroundHandlers.registerHandlers()

// 注册UI处理器
UiBackgroundHandlers.registerHandlers()

// 注册i18n处理器
i18nService.registerHandlers({
  // 示例：获取当前语言
  GET_LANGUAGE: async () => {
    const storage = await Browser.storage.local.get('language')
    return storage.language || 'zh-CN'
  },
})

// 确保在初始化leadsMiningManager之前正确加载leadsMiningService
// console.log('初始化LeadsMining消息服务...')
// leadsMiningService

// 继续正常初始化
registerPortListener(async (session, port, config) => await executeApi(session, port, config))
registerCommands()
refreshMenu()
// TODO: 貌似关闭也能正常运行，观察一下是否靠谱
// registerCookieListener()

// 注册认证处理器
AuthBackgroundHandlers.registerHandlers()

// 初始化Odoo用户会话跟踪
fetchOdooUserSessionInfo().catch((error) => {
  console.error('初始化Odoo用户会话跟踪失败:', error)
})
