import './styles.scss'
import { unmountComponentAtNode } from 'react-dom'
import { render } from 'preact'
import DecisionCard from '../components/DecisionCard'
import { config as siteConfig } from './site-adapters'
import { config as toolsConfig } from './selection-tools'
import { config as menuConfig } from './menu-tools'
import {
  chatgptWebModelKeys,
  getPreferredLanguageKey,
  getUserConfig,
  isUsingChatgptWebModel,
  setAccessToken,
  setUserConfig,
} from '../config/index.mjs'
import {
  createElementAtPosition,
  cropText,
  endsWithQuestionMark,
  getApiModesStringArrayFromConfig,
  getClientPosition,
  getPossibleElementByQuerySelector,
} from '../utils'
import FloatingToolbar from '../components/FloatingToolbar'
import Browser from 'webextension-polyfill'
import { getPreferredLanguage } from '../config/language.mjs'
import '../_locales/i18n-react'
import { changeLanguage } from 'i18next'
import { initSession } from '../services/init-session.mjs'
import { getChatGptAccessToken, registerPortListener } from '../services/wrappers.mjs'
import { generateAnswersWithChatgptWebApi } from '../services/apis/chatgpt-web.mjs'
import WebJumpBackNotification from '../components/WebJumpBackNotification'
import { DraggableBar } from './draggable-bar'
import twpConfig from '../lib/config.mjs'
import { pageTranslatorReady } from './translate/index.mjs'

const sideLogo = Browser.runtime.getURL('imgs/sider-logo.png')
const sideBarContainer = document.createElement('div')
sideBarContainer.id = 'chatgptbox-sidebar-container'
document.body.appendChild(sideBarContainer)

/**
 * @param {SiteConfig} siteConfig
 */
async function mountComponent(siteConfig) {
  const userConfig = await getUserConfig()

  if (!userConfig.alwaysFloatingSidebar) {
    const retry = 10
    let oldUrl = location.href
    for (let i = 1; i <= retry; i++) {
      if (location.href !== oldUrl) {
        console.log(`SiteAdapters Retry ${i}/${retry}: stop`)
        return
      }
      const e =
        (siteConfig &&
          (getPossibleElementByQuerySelector(siteConfig.sidebarContainerQuery) ||
            getPossibleElementByQuerySelector(siteConfig.appendContainerQuery) ||
            getPossibleElementByQuerySelector(siteConfig.resultsContainerQuery))) ||
        getPossibleElementByQuerySelector([userConfig.prependQuery]) ||
        getPossibleElementByQuerySelector([userConfig.appendQuery])
      if (e) {
        console.log(`SiteAdapters Retry ${i}/${retry}: found`)
        console.log(e)
        break
      } else {
        console.log(`SiteAdapters Retry ${i}/${retry}: not found`)
        if (i === retry) return
        else await new Promise((r) => setTimeout(r, 500))
      }
    }
  }
  document.querySelectorAll('.chatgptbox-container,#chatgptbox-container').forEach((e) => {
    unmountComponentAtNode(e)
    e.remove()
  })

  let question
  if (userConfig.inputQuery) question = await getInput([userConfig.inputQuery])
  if (!question && siteConfig) question = await getInput(siteConfig.inputQuery)

  document.querySelectorAll('.chatgptbox-container,#chatgptbox-container').forEach((e) => {
    unmountComponentAtNode(e)
    e.remove()
  })

  if (userConfig.alwaysFloatingSidebar && question) {
    const position = {
      x: window.innerWidth - 300 - Math.floor((20 / 100) * window.innerWidth),
      y: window.innerHeight / 2 - 200,
    }
    const toolbarContainer = createElementAtPosition(position.x, position.y)
    toolbarContainer.className = 'chatgptbox-toolbar-container-not-queryable'

    let triggered = false
    if (userConfig.triggerMode === 'always') triggered = true
    else if (userConfig.triggerMode === 'questionMark' && endsWithQuestionMark(question.trim()))
      triggered = true

    render(
      <FloatingToolbar
        session={initSession({
          modelName: userConfig.modelName,
          apiMode: userConfig.apiMode,
          extraCustomModelName: userConfig.customModelName,
        })}
        selection=""
        container={toolbarContainer}
        triggered={triggered}
        closeable={true}
        prompt={question}
      />,
      toolbarContainer,
    )
    return
  }

  const container = document.createElement('div')
  container.id = 'chatgptbox-container'
  render(
    <DecisionCard
      session={initSession({
        modelName: userConfig.modelName,
        apiMode: userConfig.apiMode,
        extraCustomModelName: userConfig.customModelName,
      })}
      question={question}
      siteConfig={siteConfig}
      container={container}
    />,
    container,
  )
}

/**
 * @param {string[]|function} inputQuery
 * @returns {Promise<string>}
 */
async function getInput(inputQuery) {
  let input
  if (typeof inputQuery === 'function') {
    input = await inputQuery()
    const replyPromptBelow = `Reply in ${await getPreferredLanguage()}. Regardless of the language of content I provide below. !!This is very important!!`
    const replyPromptAbove = `Reply in ${await getPreferredLanguage()}. Regardless of the language of content I provide above. !!This is very important!!`
    if (input) return `${replyPromptBelow}\n\n` + input + `\n\n${replyPromptAbove}`
    return input
  }
  const searchInput = getPossibleElementByQuerySelector(inputQuery)
  if (searchInput) {
    if (searchInput.value) input = searchInput.value
    else if (searchInput.textContent) input = searchInput.textContent
    if (input)
      return (
        `Reply in ${await getPreferredLanguage()}.\nThe following is a search input in a search engine, ` +
        `giving useful content or solutions and as much information as you can related to it, ` +
        `use markdown syntax to make your answer more readable, such as code blocks, bold, list:\n` +
        input
      )
  }
}

let toolbarContainer
const deleteToolbar = () => {
  if (toolbarContainer && toolbarContainer.className === 'chatgptbox-toolbar-container')
    toolbarContainer.remove()
}

const createSelectionTools = async (toolbarContainer, selection) => {
  toolbarContainer.className = 'chatgptbox-toolbar-container'
  const userConfig = await getUserConfig()
  render(
    <FloatingToolbar
      session={initSession({
        modelName: userConfig.modelName,
        apiMode: userConfig.apiMode,
        extraCustomModelName: userConfig.customModelName,
      })}
      selection={selection}
      container={toolbarContainer}
      dockable={true}
    />,
    toolbarContainer,
  )
}

/**
 * 在PC端使用
 */
async function prepareForSelectionTools() {
  document.addEventListener('mouseup', (e) => {
    if (toolbarContainer && toolbarContainer.contains(e.target)) return
    const selectionElement =
      window.getSelection()?.rangeCount > 0 &&
      window.getSelection()?.getRangeAt(0).endContainer.parentElement
    if (toolbarContainer && selectionElement && toolbarContainer.contains(selectionElement)) return

    deleteToolbar()
    setTimeout(async () => {
      const selection = window
        .getSelection()
        ?.toString()
        .trim()
        .replace(/^-+|-+$/g, '')
      if (selection) {
        let position

        const config = await getUserConfig()
        if (!config.selectionToolsNextToInputBox) position = { x: e.pageX + 20, y: e.pageY + 20 }
        else {
          const inputElement = selectionElement.querySelector('input, textarea')
          if (inputElement) {
            position = getClientPosition(inputElement)
            position = {
              x: position.x + window.scrollX + inputElement.offsetWidth + 50,
              y: e.pageY + 30,
            }
          } else {
            position = { x: e.pageX + 20, y: e.pageY + 20 }
          }
        }
        toolbarContainer = createElementAtPosition(position.x, position.y)
        await createSelectionTools(toolbarContainer, selection)
      }
    })
  })
  document.addEventListener('mousedown', (e) => {
    if (toolbarContainer && toolbarContainer.contains(e.target)) return

    document.querySelectorAll('.chatgptbox-toolbar-container').forEach((e) => e.remove())
  })
  document.addEventListener('keydown', (e) => {
    if (
      toolbarContainer &&
      !toolbarContainer.contains(e.target) &&
      (e.target.nodeName === 'INPUT' || e.target.nodeName === 'TEXTAREA')
    ) {
      setTimeout(() => {
        if (!window.getSelection()?.toString().trim()) deleteToolbar()
      })
    }
  })
}

/**
 * 主要在移动设备上使用touch
 * 该函数主要用于在触摸设备上处理选择工具的准备和显示逻辑
 * 它通过监听触摸开始和结束的事件来管理工具栏的显示和隐藏
 * 以及更新用户的选中内容
 */
async function prepareForSelectionToolsTouch() {
  document.addEventListener('touchend', (e) => {
    if (toolbarContainer && toolbarContainer.contains(e.target)) return
    if (
      toolbarContainer &&
      window.getSelection()?.rangeCount > 0 &&
      toolbarContainer.contains(window.getSelection()?.getRangeAt(0).endContainer.parentElement)
    )
      return

    deleteToolbar()
    setTimeout(() => {
      const selection = window
        .getSelection()
        ?.toString()
        .trim()
        .replace(/^-+|-+$/g, '')
      if (selection) {
        toolbarContainer = createElementAtPosition(
          e.changedTouches[0].pageX + 20,
          e.changedTouches[0].pageY + 20,
        )
        createSelectionTools(toolbarContainer, selection)
      }
    })
  })
  document.addEventListener('touchstart', (e) => {
    if (toolbarContainer && toolbarContainer.contains(e.target)) return

    document.querySelectorAll('.chatgptbox-toolbar-container').forEach((e) => e.remove())
  })
}

let menuX, menuY

async function prepareForRightClickMenu() {
  // 鼠标右键的时候会触发下面的监听
  document.addEventListener('contextmenu', (e) => {
    console.log('contextmenucontextmenucontextmenu', e)
    menuX = e.clientX
    menuY = e.clientY
  })

  // 别的地方PostMessage过来的
  Browser.runtime.onMessage.addListener(async (message) => {
    console.log('messagemessagemessage', message)
    if (message.type === 'CREATE_CHAT') {
      const data = message.data
      let prompt = ''
      if (data.itemId in toolsConfig) {
        prompt = await toolsConfig[data.itemId].genPrompt(data.selectionText)
      } else if (data.itemId in menuConfig) {
        const menuItem = menuConfig[data.itemId]
        if (!menuItem.genPrompt) return
        else prompt = await menuItem.genPrompt()
        if (prompt) prompt = await cropText(`Reply in ${await getPreferredLanguage()}.\n` + prompt)
      }
      const position = data.useMenuPosition
        ? { x: menuX, y: menuY }
        : { x: window.innerWidth / 2 - 300, y: window.innerHeight / 2 - 200 }
      const container = createElementAtPosition(position.x, position.y, data.containerType)
      container.className = 'chatgptbox-toolbar-container-not-queryable'
      const userConfig = await getUserConfig()
      render(
        <FloatingToolbar
          session={initSession({
            modelName: userConfig.modelName,
            apiMode: userConfig.apiMode,
            extraCustomModelName: userConfig.customModelName,
          })}
          selection={data.selectionText}
          container={container}
          triggered={true}
          closeable={true}
          prompt={prompt}
        />,
        container,
      )
    } else if (message.type === 'CLOSE_TOOLBAR') {
      deleteToolbar()
    }
  })
}

async function prepareForStaticCard() {
  const userConfig = await getUserConfig()
  let siteRegex
  if (userConfig.useSiteRegexOnly) siteRegex = userConfig.siteRegex
  else
    siteRegex = new RegExp(
      (userConfig.siteRegex && userConfig.siteRegex + '|') + Object.keys(siteConfig).join('|'),
    )

  const matches = location.hostname.match(siteRegex)
  if (matches) {
    const siteName = matches[0]

    if (
      userConfig.siteAdapters.includes(siteName) &&
      !userConfig.activeSiteAdapters.includes(siteName)
    )
      return

    let initSuccess = true
    if (siteName in siteConfig) {
      const siteAction = siteConfig[siteName].action
      if (siteAction && siteAction.init) {
        initSuccess = await siteAction.init(location.hostname, userConfig, getInput, mountComponent)
      }
    }

    if (initSuccess) mountComponent(siteConfig[siteName])
  }
}

// 借助chatgpt.com和kimi原有的token覆盖accessToken
async function overwriteAccessToken() {
  if (location.hostname !== 'chatgpt.com') {
    if (location.hostname === 'kimi.moonshot.cn') {
      setUserConfig({
        kimiMoonShotRefreshToken: window.localStorage.refresh_token,
      })
    }
    return
  }

  let data
  if (location.pathname === '/api/auth/session') {
    const response = document.querySelector('pre').textContent
    try {
      data = JSON.parse(response)
    } catch (error) {
      console.error('json error', error)
    }
  } else {
    const resp = await fetch('https://chatgpt.com/api/auth/session')
    data = await resp.json().catch(() => ({}))
  }
  if (data && data.accessToken) {
    await setAccessToken(data.accessToken)
    console.log(data.accessToken)
  }
}

async function prepareForForegroundRequests() {
  if (location.hostname !== 'chatgpt.com' || location.pathname === '/auth/login') return

  const userConfig = await getUserConfig()

  if (
    !chatgptWebModelKeys.some((model) =>
      getApiModesStringArrayFromConfig(userConfig, true).includes(model),
    )
  )
    return

  if (location.pathname === '/') {
    const input = document.querySelector('#prompt-textarea')
    if (input) {
      input.textContent = ' '
      input.dispatchEvent(new Event('input', { bubbles: true }))
      setTimeout(() => {
        input.textContent = ''
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }, 300)
    }
  }

  await Browser.runtime.sendMessage({
    type: 'SET_CHATGPT_TAB',
    data: {},
  })

  registerPortListener(async (session, port) => {
    if (isUsingChatgptWebModel(session)) {
      const accessToken = await getChatGptAccessToken()
      await generateAnswersWithChatgptWebApi(port, session.question, session, accessToken)
    }
  })
}

async function getClaudeSessionKey() {
  return Browser.runtime.sendMessage({
    type: 'GET_COOKIE',
    data: { url: 'https://claude.ai/', name: 'sessionKey' },
  })
}

async function prepareForJumpBackNotification() {
  if (
    location.hostname === 'chatgpt.com' &&
    document.querySelector('button[data-testid=login-button]')
  ) {
    console.log('chatgpt not logged in')
    return
  }

  const url = new URL(window.location.href)
  if (url.searchParams.has('chatgptbox_notification')) {
    if (location.hostname === 'claude.ai' && !(await getClaudeSessionKey())) {
      console.log('claude not logged in')

      await new Promise((resolve) => {
        const timer = setInterval(async () => {
          const token = await getClaudeSessionKey()
          if (token) {
            clearInterval(timer)
            resolve()
          }
        }, 500)
      })
    }

    if (location.hostname === 'kimi.moonshot.cn' && !window.localStorage.refresh_token) {
      console.log('kimi not logged in')
      setTimeout(() => {
        document.querySelectorAll('button').forEach((button) => {
          if (button.textContent === '立即登录') {
            button.click()
          }
        })
      }, 1000)

      await new Promise((resolve) => {
        const timer = setInterval(() => {
          const token = window.localStorage.refresh_token
          if (token) {
            setUserConfig({
              kimiMoonShotRefreshToken: token,
            })
            clearInterval(timer)
            resolve()
          }
        }, 500)
      })
    }

    const div = document.createElement('div')
    document.body.append(div)
    render(
      <WebJumpBackNotification container={div} chatgptMode={location.hostname === 'chatgpt.com'} />,
      div,
    )
  }
}

/**
 * 渲染侧边栏
 *
 * 此函数负责渲染一个可拖动的工具栏到指定的容器中这个工具栏可以展开或折叠，
 * 并且可以通过回调函数来传递当前工具栏的折叠或展开状态此外，它还接收一个
 * 图标作为折叠状态的显示，以及一个回调函数来设置工具栏的是否活着的状态
 * @param {React.Element} DraggableBar - 要渲染的可拖动工具栏组件
 * @param {HTMLElement} sideBarContainer - 工具栏要被渲染进去的DOM容器
 * @param {function} setLiving - 是否活着 暂未实现
 */
function renderSidebar() {
  const port = chrome.runtime.connect({ name: 'activeTabPort' })

  render(
    <DraggableBar
      openToolBar={async () => {
        const container = createElementAtPosition(0, 0, 'sideWindow')
        container.className = 'chatgptbox-toolbar-container-not-queryable'
        const userConfig = await getUserConfig()
        const session = initSession({
          modelName: userConfig.modelName,
          apiMode: userConfig.apiMode,
          extraCustomModelName: userConfig.customModelName,
        })
        render(
          <FloatingToolbar
            session={session}
            selection=""
            container={container}
            triggered={true}
            closeable={true}
            prompt=""
          />,
          container,
        )
      }}
      foldedIcon={sideLogo}
      setLiving={(living) => {}}
      handleTranslate={async () => {
        pageTranslatorReady()
        console.log('🚀 ~ handleTranslate={ ~ twpConfig:', twpConfig.get('translateClickingOnce'))
        // 获取当前活动标签页的 tabId
        port.postMessage({ action: 'queryActiveTab' })
        port.onMessage.addListener((response) => {
          console.log('🚀 ~ port.onMessage.addListener ~ response:', response)
          if (response && response.tabId) {
            console.log('Current Tab ID:', response.tabId)
            // 使用 tabId 执行其他操作
            console.log('🚀 ~ port.onMessage.addListener ~ tabs:', chrome, chrome.tabs)
            // chrome.tabs.sendMessage(response.tabId, { action: 'toggle-translation' })
          } else {
            console.error('No response or tabId received:', response)
          }
        })
      }}
    />,
    sideBarContainer,
  )
}

async function run() {
  await getPreferredLanguageKey().then((lang) => {
    changeLanguage(lang)
  })
  Browser.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'CHANGE_LANG') {
      const data = message.data
      changeLanguage(data.lang)
    }
  })

  // 只有在ChatGPT和Kimi的页面才执行
  await overwriteAccessToken()

  // 这个方法只有在chatgpt.com页面才会执行，后面要考虑是否干掉
  await prepareForForegroundRequests()

  // 渲染侧边Bar
  renderSidebar()

  // pc 端划词准备
  prepareForSelectionTools()

  // 移动端划词准备
  prepareForSelectionToolsTouch()

  // 网站适配准备
  prepareForStaticCard()

  // 右键菜单准备
  prepareForRightClickMenu()

  // 顶部通知返回条
  prepareForJumpBackNotification()
}

run()
