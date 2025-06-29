import { cloneElement, useCallback, useEffect, useState, useRef } from 'react'
import ConversationCard from '../ConversationCard'
import PropTypes from 'prop-types'
import { config as toolsConfig } from '../../content-script/selection-tools'
import { getClientPosition, isMobile, setElementPositionInViewport } from '../../utils'
import Draggable from 'react-draggable'
import { useTranslation } from 'react-i18next'
import { useConfig } from '../../hooks/use-config.mjs'
import { setUserConfig } from '../../config/index.mjs'
import { WINDOW_TYPE } from '../../constants'
import { message } from 'antd'
import Browser from 'webextension-polyfill'

const dropLogo = Browser.runtime.getURL('logo.png')
function FloatingToolbar(props) {
  const { t } = useTranslation()
  const { windowType } = props
  const [selection, setSelection] = useState(props.selection)
  const [prompt, setPrompt] = useState(props.prompt)
  const [triggered, setTriggered] = useState(props.triggered)
  const [render, setRender] = useState(false)
  const [closeable, setCloseable] = useState(props.closeable)
  const [position, setPosition] = useState(getClientPosition(props.container))
  const [virtualPosition, setVirtualPosition] = useState({ x: 0, y: 0 })
  const draggableRef = useRef(null)

  const config = useConfig(() => {
    if (!render) {
      setRender(true)
    }
    if (!triggered && selection) {
      props.container.style.position = 'absolute'
      setTimeout(() => {
        const left = Math.min(
          Math.max(0, window.innerWidth - props.container.offsetWidth - 30),
          Math.max(0, position.x),
        )
        props.container.style.left = left + 'px'
      })
    }
  })

  const updatePosition = useCallback(() => {
    const newPosition = setElementPositionInViewport(props.container, position.x, position.y)
    if (position.x !== newPosition.x || position.y !== newPosition.y) setPosition(newPosition) // clear extra virtual position offset
  }, [props.container, position.x, position.y])

  const handleClose = useCallback(() => {
    props.container.remove()
    if (windowType === WINDOW_TYPE.LEADS_MINING) {
      setUserConfig({
        casualMiningStatus: 'cStopped',
      })
      message.info('已停止挖掘')
    }
  }, [props.container])

  const handleMiniWindow = () => {
    setUserConfig({
      headless: true,
    })
    props.container.remove()
    message.info('已最小化窗口')
  }

  const onDock = useCallback(() => {
    props.container.className = 'chatgptbox-toolbar-container-not-queryable'
    setCloseable(true)
  }, [props.container])

  const onUpdate = useCallback(() => {
    updatePosition()
  }, [updatePosition])

  useEffect(() => {
    if (isMobile()) {
      const selectionListener = () => {
        const currentSelection = window.getSelection()?.toString()
        if (currentSelection) setSelection(currentSelection)
      }
      document.addEventListener('selectionchange', selectionListener)
      return () => {
        document.removeEventListener('selectionchange', selectionListener)
      }
    }
  }, [])

  if (!render) return <div />

  // 如果是划词场景，这里的triggered为true，prompt有值且selection有选中内容
  // 如果是聊天场景，这里的triggered为true，prompt无值且selection无选中内容
  if (triggered || (prompt && !selection)) {
    const dragEvent = {
      onDrag: (e, ui) => {
        setVirtualPosition({ x: virtualPosition.x + ui.deltaX, y: virtualPosition.y + ui.deltaY })
      },
      onStop: () => {
        setPosition({ x: position.x + virtualPosition.x, y: position.y + virtualPosition.y })
        setVirtualPosition({ x: 0, y: 0 })
      },
    }

    if (virtualPosition.x === 0 && virtualPosition.y === 0) {
      updatePosition() // avoid jitter
    }

    // if (config.alwaysPinWindow) onDock()
    return (
      <div data-theme={config.themeMode} style={{ height: '100%' }}>
        <Draggable
          nodeRef={draggableRef}
          handle=".draggable"
          onDrag={dragEvent.onDrag}
          onStop={dragEvent.onStop}
          position={virtualPosition}
        >
          <div
            ref={draggableRef}
            className="chatgptbox-selection-window"
            style={{ height: '100%' }}
          >
            <div className="chatgptbox-container" style={{ height: '100%' }}>
              <ConversationCard
                session={props.session}
                question={prompt}
                draggable={true}
                closeable={closeable}
                onClose={handleClose}
                onMiniWindow={handleMiniWindow}
                dockable={props.dockable}
                onDock={onDock}
                onUpdate={onUpdate}
                waitForTrigger={!!(prompt && !triggered && !selection)}
                windowType={windowType}
              />
            </div>
          </div>
        </Draggable>
      </div>
    )
  } else {
    if (
      config.activeSelectionTools.length === 0 &&
      config.customSelectionTools.reduce((count, tool) => count + (tool.active ? 1 : 0), 0) === 0
    )
      return <div />

    const tools = []
    const pushTool = (iconKey, name, genPrompt) => {
      tools.push(
        <div
          className="chatgptbox-selection-toolbar-button"
          key={name}
          onClick={async () => {
            const p = getClientPosition(props.container)
            props.container.style.position = 'fixed'
            setPosition(p)
            setPrompt(await genPrompt(selection))
            setTriggered(true)
          }}
        >
          <span className="chatgptbox-selection-toolbar-icon">
            {cloneElement(toolsConfig[iconKey].icon, { size: 14 })}
          </span>
          <span className="chatgptbox-selection-toolbar-text">{t(toolsConfig[iconKey].label)}</span>
        </div>,
      )
    }

    for (const key in toolsConfig) {
      if (config.activeSelectionTools.includes(key)) {
        const toolConfig = toolsConfig[key]

        // 检查是否有自定义prompt，如果有则使用自定义prompt，否则使用默认genPrompt
        const customPrompt = config.selectionToolsPrompts?.[key]
        const genPromptFunction = customPrompt
          ? async (selection) => customPrompt.replace('{{selection}}', selection)
          : toolConfig.genPrompt

        pushTool(key, t(toolConfig.label), genPromptFunction)
      }
    }
    for (const tool of config.customSelectionTools) {
      if (tool.active) {
        pushTool(tool.iconKey, tool.name, async (selection) => {
          return tool.prompt.replace('{{selection}}', selection)
        })
      }
    }

    return (
      <div data-theme={config.themeMode}>
        <div className="chatgptbox-selection-toolbar">
          <div className="chatgptbox-selection-toolbar-logo">
            <img src={dropLogo} alt="Logo" />
          </div>
          <div className="chatgptbox-selection-toolbar-buttons">{tools}</div>
        </div>
      </div>
    )
  }
}

FloatingToolbar.propTypes = {
  session: PropTypes.object.isRequired,
  selection: PropTypes.string.isRequired,
  container: PropTypes.object.isRequired,
  triggered: PropTypes.bool,
  closeable: PropTypes.bool,
  dockable: PropTypes.bool,
  prompt: PropTypes.string,
  windowType: PropTypes.string,
}

export default FloatingToolbar
