import './styles.scss'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Space, Typography } from 'antd'
import { RadarChartOutlined } from '@ant-design/icons'
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
import PropTypes from 'prop-types'

import { getPreferredLanguage } from '../config/language.mjs'
import '../_locales/i18n-react'
import { changeLanguage } from 'i18next'
import { initSession } from '../services/init-session.mjs'
import { getChatGptAccessToken, registerPortListener } from '../services/wrappers.mjs'
import { generateAnswersWithChatgptWebApi } from '../services/apis/chatgpt-web.mjs'
import WebJumpBackNotification from '../components/WebJumpBackNotification'
import { DraggableBar } from './draggable-bar'
import { WINDOW_TYPE, ELEMENT_ID } from '../constants'
import { UI_API } from '../services/messaging/ui'
import uiService from '../services/messaging/ui'
import i18nService, { I18N_API } from '../services/messaging/i18n'
import { isShowSidebar } from '../config/index.mjs'

const { Link } = Typography

const sideLogo = Browser.runtime.getURL('imgs/sider-logo.png')
const sideBarContainer = document.createElement('div')
sideBarContainer.id = 'chatgptbox-sidebar-container'
document.body.appendChild(sideBarContainer)

/**
 * @param {SiteConfig} siteConfig
 */
async function mountComponent(siteConfig) {
  const userConfig = await getUserConfig()
  const question = siteConfig.question || ''
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
  // 替换旧的卸载方式
  document.querySelectorAll('.chatgptbox-container,#chatgptbox-container').forEach((e) => {
    if (e._reactRootContainer) {
      e._reactRootContainer.unmount()
    }
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

    const root = createRoot(toolbarContainer)
    root.render(
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
    )
    return
  }

  const container = document.createElement('div')
  container.id = 'chatgptbox-container'
  const root = createRoot(container)
  root.render(
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

/**
 * 划词选中创建浮层
 * @param {HTMLElement} toolbarContainer 浮层容器
 * @param {string} selection 选中内容
 */
const createSelectionTools = async (toolbarContainer, selection) => {
  toolbarContainer.className = 'chatgptbox-toolbar-container'
  const userConfig = await getUserConfig()
  const root = createRoot(toolbarContainer)
  root.render(
    <FloatingToolbar
      session={initSession({
        modelName: userConfig.modelName,
        apiMode: userConfig.apiMode,
        extraCustomModelName: userConfig.customModelName,
      })}
      selection={selection}
      container={toolbarContainer}
      closeable={true}
      dockable={true}
    />,
  )
}

/**
 * 在PC端使用
 */
async function prepareForSelectionTools(userConfig) {
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

        const config = userConfig || (await getUserConfig())

        // 获取选中文本的位置和尺寸
        const selectionRange = window.getSelection().getRangeAt(0)
        const selectionRect = selectionRange.getBoundingClientRect()

        // 将浮条放在选中文本的底部5px处
        position = {
          x: selectionRect.left + window.scrollX,
          y: selectionRect.bottom + window.scrollY + 5, // 底部加5px
        }

        // 如果配置了在输入框旁边显示，保持原有逻辑
        if (config.selectionToolsNextToInputBox) {
          const inputElement = selectionElement.querySelector('input, textarea')
          if (inputElement) {
            position = getClientPosition(inputElement)
            position = {
              x: position.x + window.scrollX + inputElement.offsetWidth + 50,
              y: e.pageY + 30,
            }
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

  // 注册UI消息处理器
  uiService.registerHandlers({
    [UI_API.CREATE_CHAT]: async (data) => {
      console.log('接收到CREATE_CHAT消息', data)
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
      const root = createRoot(container)
      root.render(
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
      )
      return { success: true }
    },
    [UI_API.CLOSE_TOOLBAR]: () => {
      deleteToolbar()
      return { success: true }
    },
  })
}

async function prepareForStaticCard(config) {
  const userConfig = config || (await getUserConfig())
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

async function prepareForForegroundRequests(config) {
  if (location.hostname !== 'chatgpt.com' || location.pathname === '/auth/login') return

  const userConfig = config || (await getUserConfig())

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
    const root = createRoot(div)
    root.render(
      <WebJumpBackNotification container={div} chatgptMode={location.hostname === 'chatgpt.com'} />,
    )
  }
}

/**
 * 渲染浮层工具栏
 * @param {Object} options - 渲染选项
 * @param {number} options.x - 浮层容器的x坐标
 * @param {number} options.y - 浮层容器的y坐标
 * @param {string} options.windowType - 窗口类型
 */
async function renderFloatingToolbar({ x = 0, y = 0, windowType }) {
  // 先检查是否已存在容器
  let container = document.getElementById(ELEMENT_ID.FLOATING_TOOL_CONTAINER)

  // 如果存在容器，先清理旧的实例
  if (container) {
    const oldRoot = container._reactRoot
    if (oldRoot) {
      oldRoot.unmount()
    }
    container.remove()
  }

  // 创建新容器
  container = createElementAtPosition(x, y, windowType)
  container.id = ELEMENT_ID.FLOATING_TOOL_CONTAINER
  container.className = 'chatgptbox-toolbar-container-not-queryable'

  const userConfig = await getUserConfig()
  const session = initSession({
    modelName: userConfig.modelName,
    apiMode: userConfig.apiMode,
    extraCustomModelName: userConfig.customModelName,
  })

  // 创建新的 root 实例并保存引用
  const root = createRoot(container)
  container._reactRoot = root

  root.render(
    <FloatingToolbar
      session={session}
      selection=""
      container={container}
      triggered={true}
      closeable={true}
      windowType={windowType}
      prompt=""
    />,
  )
}

async function renderLeadsMining(windowType) {
  renderFloatingToolbar({ x: 0, y: 0, windowType: windowType || WINDOW_TYPE.LEADS_MINING })
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
function Sidebar({ close }) {
  const [activeTaskList, setActiveTaskList] = useState([])
  if (!isShowSidebar()) return null

  useEffect(() => {
    init()
    const handleStorageChange = (changes, area) => {
      if (area === 'local') {
        const config = changes
        if (config.casualMiningStatus) {
          const container = document.getElementById(ELEMENT_ID.FLOATING_TOOL_CONTAINER)
          if (config.casualMiningStatus.newValue === 'cStopped') {
            container?.remove()
            setActiveTaskList((prev) => {
              return prev.filter((task) => task.id !== 'casualMining')
            })
          } else if (config.casualMiningStatus.newValue === 'cRunning') {
            renderLeadsMining()
          }
        }
        if (config.headless?.newValue === true) {
          // 如果prev里没有 挖掘中 则添加
          setActiveTaskList((prev = []) => {
            if (!prev.some((task) => task.id === 'casualMining')) {
              return [
                ...prev,
                {
                  id: 'casualMining',
                  name: '挖掘中',
                  icon: <RadarChartOutlined />,
                  onClick: () => {
                    setUserConfig({
                      headless: false,
                    })
                    renderLeadsMining(WINDOW_TYPE.LEADS_MINING)
                  },
                },
              ]
            }
            return prev
          })
        } else if (config.headless?.newValue === false) {
          setActiveTaskList((prev) => {
            return prev.filter((task) => task.id !== 'casualMining')
          })
        }
      }
    }
    Browser.storage.onChanged.addListener(handleStorageChange)
    return () => {
      Browser.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])
  async function init() {
    const config = await getUserConfig()
    if (config.casualMiningStatus === 'cRunning') {
      if (config.headless === true) {
        renderLeadsMining(WINDOW_TYPE.LEADS_MINING_MINI_SIDE_WINDOW)
      } else {
        renderLeadsMining(WINDOW_TYPE.LEADS_MINING)
      }
      setActiveTaskList((prev) => [
        ...prev,
        {
          id: 'casualMining',
          name: '挖掘中',
          icon: <RadarChartOutlined />,
          onClick: () => {
            setUserConfig({
              headless: false,
            })
            renderLeadsMining(WINDOW_TYPE.LEADS_MINING)
          },
        },
      ])
    }
  }

  return (
    <DraggableBar
      activeTasks={<RenderActiveTasks activeTaskList={activeTaskList} />}
      openToolBar={async ({ windowType }) => {
        renderFloatingToolbar({ x: 0, y: 0, windowType })
      }}
      foldedIcon={sideLogo}
      setLiving={(bool) => {
        if (!bool) close()
      }}
    />
  )
}

function renderSidebar() {
  // 检查是否已存在root实例
  if (sideBarContainer._reactRoot) {
    try {
      sideBarContainer._reactRoot.unmount()
    } catch (e) {
      console.error('Error unmounting sidebar:', e)
    }
  }

  // 确保容器可见
  sideBarContainer.style.display = 'block'

  const root = createRoot(sideBarContainer)
  // 保存root引用
  sideBarContainer._reactRoot = root

  const close = () => {
    setUserConfig({
      alwaysShowToolSidebar: false,
    })
    // 卸载组件 - 安全地处理卸载
    if (sideBarContainer._reactRoot) {
      try {
        sideBarContainer._reactRoot.unmount()
      } catch (e) {
        console.error('Error unmounting sidebar:', e)
      } finally {
        sideBarContainer._reactRoot = null
      }
    }
    // 隐藏容器而不是移除
    sideBarContainer.style.display = 'none'
  }

  root.render(<Sidebar close={close} />)
}

function RenderActiveTasks({ activeTaskList = [] }) {
  return (
    <Space direction="vertical" gap={4}>
      {activeTaskList.map((task) => {
        return (
          <Link key={task.id} onClick={task.onClick} style={{ fontSize: '12px', margin: '0 6px' }}>
            {task.icon}
            {task.name}
          </Link>
        )
      })}
    </Space>
  )
}

RenderActiveTasks.propTypes = {
  activeTaskList: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      icon: PropTypes.node.isRequired,
      onClick: PropTypes.func.isRequired,
    }),
  ),
}

async function run() {
  const userConfig = await getUserConfig()

  await getPreferredLanguageKey(userConfig).then((lang) => {
    changeLanguage(lang)
  })

  // 使用i18n服务注册语言变更处理器
  i18nService.registerHandler(I18N_API.CHANGE_LANGUAGE, (data) => {
    if (data && data.lang) {
      changeLanguage(data.lang)
    }
    return { success: true }
  })

  // 只有在ChatGPT和Kimi的页面才执行
  await overwriteAccessToken()

  // 这个方法只有在chatgpt.com页面才会执行，后面要考虑是否干掉
  await prepareForForegroundRequests(userConfig)

  // pc 端划词准备
  prepareForSelectionTools(userConfig)

  // 移动端划词准备
  prepareForSelectionToolsTouch()

  // 网站适配准备
  prepareForStaticCard(userConfig)

  // 右键菜单准备
  prepareForRightClickMenu()

  // 顶部通知返回条
  prepareForJumpBackNotification()

  // 添加双击Ctrl/Command键检测
  let lastKeyDownTime = 0
  const DOUBLE_PRESS_DELAY = 300 // 双击间隔时间(毫秒)

  document.addEventListener('keydown', (e) => {
    // 检测是否按下的是单独的Ctrl键或Command键
    if ((e.key === 'Control' || e.key === 'Meta') && !e.shiftKey && !e.altKey) {
      // 检查当前标签页是否激活 visible hidden prerender
      if (document.visibilityState === 'visible') {
        const currentTime = new Date().getTime()

        if (currentTime - lastKeyDownTime < DOUBLE_PRESS_DELAY) {
          e.preventDefault()
          renderLeadsMining(WINDOW_TYPE.LEADS_MINING)
          // 重置计时器，防止连续多次触发
          lastKeyDownTime = 0
        } else {
          // 记录第一次按键时间
          lastKeyDownTime = currentTime
        }
      }
    }
  })
}

run()

// 渲染MonitConfigForView
const root = createRoot(document.createElement('div'))
root.render(<MonitConfigForView />)
function MonitConfigForView() {
  const [userConfig, setUserConfig] = useState(null)

  // 初始化配置并监听storage变更
  useEffect(() => {
    // 初始加载配置
    const initConfig = async () => {
      const config = await getUserConfig()
      setUserConfig(config)
    }
    initConfig()

    // 监听storage变更
    const handleStorageChange = (changes, area) => {
      if (area === 'local') {
        // 遍历变更的存储项
        const relevantChanges = Object.keys(changes).filter(
          (key) =>
            // 过滤出与userConfig相关的存储项
            key === 'alwaysShowToolSidebar' || key === 'alwaysFloatingSidebar',
        )

        // 如果有相关变更，重新获取完整的userConfig
        if (relevantChanges.length > 0) {
          getUserConfig().then((newConfig) => {
            setUserConfig(newConfig)
          })
        }
      }
    }

    // 添加监听器
    Browser.storage.onChanged.addListener(handleStorageChange)

    // 清理监听器
    return () => {
      Browser.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  useEffect(() => {
    // Use setTimeout to defer the sidebar rendering to the next tick
    // This prevents synchronous unmounting during React rendering
    if (userConfig?.alwaysShowToolSidebar !== false) {
      setTimeout(() => {
        renderSidebar()
      }, 0)
    }
  }, [userConfig?.alwaysShowToolSidebar])

  return null
}

Sidebar.propTypes = {
  close: PropTypes.func.isRequired,
}
