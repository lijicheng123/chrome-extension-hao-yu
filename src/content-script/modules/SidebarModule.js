import { componentManager } from '../core/ComponentManager.js'
import { eventManager } from '../core/EventManager.js'
import { DraggableBar } from '../draggable-bar/index.jsx'
import { getUserConfig, setUserConfig } from '../../config/index.mjs'
import { createElementAtPosition } from '../../utils'
import FloatingToolbar from '../../components/FloatingToolbar/index.jsx'
import { initSession } from '../../services/init-session.mjs'
import { WINDOW_TYPE, ELEMENT_ID } from '../../constants'
import { isShowSidebar, isShowMiningPanel } from '../../config/index.mjs'
import { RadarChartOutlined } from '@ant-design/icons'
import { Space, Typography } from 'antd'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Browser from 'webextension-polyfill'
import sideLogo from '../../imgs/sider-logo.png'

const { Link } = Typography

/**
 * 侧边栏模块 - 单一职责：处理侧边栏和浮动工具栏
 * 高内聚：所有侧边栏相关的逻辑都在这里
 * 低耦合：通过事件和配置与其他模块通信
 */
export class SidebarModule {
  constructor() {
    this.config = null
    this.sideBarContainer = null
    this.floatingToolbarContainer = null
    this.componentId = null
  }

  /**
   * 初始化侧边栏模块
   * @param {Object} config - 用户配置
   */
  async init(config) {
    this.config = config
    
    // 创建侧边栏容器
    this.createSidebarContainer()
    
    // 渲染侧边栏
    await this.renderSidebar()
    
    // 设置键盘快捷键
    this.setupKeyboardShortcuts()
    
    // 设置配置监听
    this.setupConfigWatcher()
    
    console.log('SidebarModule initialized')
    
    return () => this.cleanup()
  }

  /**
   * 销毁模块
   */
  async destroy() {
    this.cleanup()
    this.config = null
    console.log('SidebarModule destroyed')
  }

  /**
   * 配置变更处理
   * @param {Object} newConfig - 新配置
   */
  async onConfigChange(newConfig) {
    this.config = newConfig
    await this.renderSidebar()
  }

  /**
   * 创建侧边栏容器 - 保持原有逻辑
   */
  createSidebarContainer() {
    this.sideBarContainer = document.createElement('div')
    this.sideBarContainer.id = 'chatgptbox-sidebar-container'
    document.body.appendChild(this.sideBarContainer)
  }

  /**
   * 渲染侧边栏 - 完全保持原有业务逻辑
   */
  async renderSidebar() {
    const userConfig = await getUserConfig()
    
    // 检查是否应该显示侧边栏 - 保持原逻辑
    if (!isShowSidebar(userConfig)) {
      this.hideSidebar()
      return null
    }
    
    if (userConfig?.alwaysShowToolSidebar === false) {
      this.hideSidebar()
      return null
    }

    // 清理旧的实例 - 保持原逻辑
    if (this.componentId) {
      componentManager.unmountComponent(this.componentId)
    }

    // 确保容器可见
    this.sideBarContainer.style.display = 'block'

    this.componentId = 'sidebar-draggable-bar'
    
    const close = () => {
      setUserConfig({
        alwaysShowToolSidebar: false,
      })
      this.hideSidebar()
    }

    const sidebar = (
      <Sidebar 
        close={close}
        renderFloatingToolbar={this.renderFloatingToolbar.bind(this)}
      />
    )

    componentManager.renderComponent(this.componentId, sidebar, this.sideBarContainer)
  }

  /**
   * 隐藏侧边栏
   */
  hideSidebar() {
    if (this.sideBarContainer) {
      this.sideBarContainer.style.display = 'none'
    }
    if (this.componentId) {
      componentManager.unmountComponent(this.componentId)
      this.componentId = null
    }
  }

  /**
   * 渲染浮动工具栏 - 完全保持原有业务逻辑
   * @param {Object} options - 渲染选项
   */
  async renderFloatingToolbar({ x = 0, y = 0, windowType } = {}) {
    // 清理旧的容器 - 保持原逻辑
    let container = document.getElementById(ELEMENT_ID.FLOATING_TOOL_CONTAINER)
    if (container) {
      const oldRoot = container._reactRoot
      if (oldRoot) {
        oldRoot.unmount()
      }
      container.remove()
    }
    
    const userConfig = await getUserConfig()

    // 处理特殊条件的渲染情况 - 保持原逻辑
    if (
      (windowType === WINDOW_TYPE.LEADS_MINING ||
        windowType === WINDOW_TYPE.LEADS_MINING_MINI_SIDE_WINDOW) &&
      !isShowMiningPanel(userConfig)
    ) {
      return null
    }

    // 创建新容器 - 保持原逻辑
    container = createElementAtPosition(x, y, windowType)
    container.id = ELEMENT_ID.FLOATING_TOOL_CONTAINER
    container.className = 'chatgptbox-toolbar-container-not-queryable'
    this.floatingToolbarContainer = container

    const session = initSession({
      modelName: userConfig.modelName,
      apiMode: userConfig.apiMode,
      extraCustomModelName: userConfig.customModelName,
    })

    // 使用ComponentManager管理组件
    const componentId = `floating-toolbar-${Date.now()}`
    const component = (
      <FloatingToolbar
        session={session}
        selection=""
        container={container}
        triggered={true}
        closeable={true}
        windowType={windowType}
        prompt=""
      />
    )

    componentManager.renderComponent(componentId, component, container)
  }

  /**
   * 渲染线索挖掘 - 保持原有逻辑
   * @param {string} windowType - 窗口类型
   */
  async renderLeadsMining(windowType) {
    await this.renderFloatingToolbar({ 
      x: 0, 
      y: 0, 
      windowType: windowType || WINDOW_TYPE.LEADS_MINING 
    })
  }

  /**
   * 设置键盘快捷键 - 保持原有逻辑
   */
  setupKeyboardShortcuts() {
    let lastKeyDownTime = 0
    const DOUBLE_PRESS_DELAY = 300 // 双击间隔时间(毫秒)

    const handleKeyDown = (e) => {
      // 检测是否按下的是单独的Ctrl键或Command键 - 保持原逻辑
      if ((e.key === 'Control' || e.key === 'Meta') && !e.shiftKey && !e.altKey) {
        // 检查当前标签页是否激活 - 保持原逻辑
        if (document.visibilityState === 'visible') {
          const currentTime = new Date().getTime()

          if (currentTime - lastKeyDownTime < DOUBLE_PRESS_DELAY) {
            e.preventDefault()
            this.renderLeadsMining(WINDOW_TYPE.LEADS_MINING)
            setUserConfig({
              casualMiningStatus: 'cRunning',
            })
            // 重置计时器，防止连续多次触发
            lastKeyDownTime = 0
          } else {
            // 记录第一次按键时间
            lastKeyDownTime = currentTime
          }
        }
      }
    }

    eventManager.addListener('sidebar-keydown', document, 'keydown', handleKeyDown)
  }

  /**
   * 设置配置监听器 - 保持原有逻辑
   */
  setupConfigWatcher() {
    const handleStorageChange = (changes, area) => {
      if (area === 'local') {
        const relevantChanges = Object.keys(changes).filter(
          (key) => key === 'alwaysShowToolSidebar' || key === 'alwaysFloatingSidebar'
        )

        if (relevantChanges.length > 0) {
          getUserConfig().then(() => {
            this.renderSidebar()
          })
        }
      }
    }

    Browser.storage.onChanged.addListener(handleStorageChange)
    
    // 保存引用以便清理
    this.storageChangeHandler = handleStorageChange
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.sideBarContainer) {
      this.sideBarContainer.remove()
      this.sideBarContainer = null
    }
    
    if (this.floatingToolbarContainer) {
      this.floatingToolbarContainer.remove()
      this.floatingToolbarContainer = null
    }
    
    if (this.componentId) {
      componentManager.unmountComponent(this.componentId)
      this.componentId = null
    }
    
    if (this.storageChangeHandler) {
      Browser.storage.onChanged.removeListener(this.storageChangeHandler)
      this.storageChangeHandler = null
    }
  }
}

/**
 * 侧边栏组件 - 完全保持原有业务逻辑
 */
function Sidebar({ close, renderFloatingToolbar }) {
  const [activeTaskList, setActiveTaskList] = useState([])

  useEffect(() => {
    init()
    
    // 监听storage变化 - 保持原逻辑
    const handleStorageChange = (changes, area) => {
      if (area === 'local') {
        const config = changes
        
        // 处理挖掘状态变化 - 保持原逻辑
        if (config.casualMiningStatus) {
          const container = document.getElementById(ELEMENT_ID.FLOATING_TOOL_CONTAINER)
          if (config.casualMiningStatus.newValue === 'cStopped') {
            container?.remove()
            setActiveTaskList((prev) => {
              return prev.filter((task) => task.id !== 'casualMining')
            })
          } else if (config.casualMiningStatus.newValue === 'cRunning') {
            renderFloatingToolbar({ x: 0, y: 0, windowType: WINDOW_TYPE.LEADS_MINING })
          }
        }
        
        // 处理headless模式变化 - 保持原逻辑
        if (config.headless?.newValue === true && isShowMiningPanel(config)) {
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
                    renderFloatingToolbar({ x: 0, y: 0, windowType: WINDOW_TYPE.LEADS_MINING })
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
  }, [renderFloatingToolbar])

  // 初始化函数 - 保持原逻辑
  async function init() {
    const config = await getUserConfig()
    if (config.casualMiningStatus === 'cRunning' && isShowMiningPanel(config)) {
      if (config.headless === true) {
        renderFloatingToolbar({ 
          x: 0, 
          y: 0, 
          windowType: WINDOW_TYPE.LEADS_MINING_MINI_SIDE_WINDOW 
        })
      } else {
        renderFloatingToolbar({ 
          x: 0, 
          y: 0, 
          windowType: WINDOW_TYPE.LEADS_MINING 
        })
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
            renderFloatingToolbar({ x: 0, y: 0, windowType: WINDOW_TYPE.LEADS_MINING })
          },
        },
      ])
    }
  }

  return (
    <DraggableBar
      activeTasks={<RenderActiveTasks activeTaskList={activeTaskList} />}
      openToolBar={async ({ windowType }) => {
        // 这个容器的宽度是450px，x的值应该是屏幕宽度减去450px - 保持原逻辑
        const x = window.innerWidth - 450
        renderFloatingToolbar({ x, y: 0, windowType })
      }}
      foldedIcon={sideLogo}
      setLiving={(bool) => {
        if (!bool) close()
      }}
    />
  )
}

/**
 * 渲染活动任务组件 - 完全保持原有逻辑
 */
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

// PropTypes验证
Sidebar.propTypes = {
  close: PropTypes.func.isRequired,
  renderFloatingToolbar: PropTypes.func.isRequired,
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