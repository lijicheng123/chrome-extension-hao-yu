import React, { useState, useEffect, useRef } from 'react'
import Browser from 'webextension-polyfill'
import Draggable from 'react-draggable'
import PropTypes from 'prop-types'
import { ToolOutlined } from '@ant-design/icons'
import './index.scss'
import { WINDOW_TYPE } from '../../constants'
import { setUserConfig, getUserConfig, isShowMiningPanel } from '../../config/index.mjs'
import { message } from 'antd'
import { renderTranslatePanel } from '../immersive-translate'
import { TranslationStatusIndicator } from '../immersive-translate/TranslationStatusIndicator.jsx'

export const DraggableBar = ({ openToolBar, foldedIcon, setLiving, activeTasks }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [bounds, setBounds] = useState({ top: 0, bottom: 0 })
  const draggableRef = useRef(null)

  const updateBounds = () => {
    const windowHeight = window.innerHeight
    setBounds({
      top: -windowHeight / 2 + 46, // 上边界保留46px
      bottom: windowHeight / 2 - 46, // 下边界保留46px
    })
  }
  // 计算拖动边界
  useEffect(() => {
    updateBounds()
    window.addEventListener('resize', updateBounds)
    return () => window.removeEventListener('resize', updateBounds)
  }, [])

  const openAIPic = () => {
    const url = Browser.runtime.getURL('AIPic.html')
    Browser.runtime.sendMessage({
      type: 'OPEN_URL',
      data: {
        url,
      },
    })
  }

  return (
    <Draggable
      nodeRef={draggableRef}
      axis="y" // 只允许垂直方向拖动
      position={position}
      bounds={bounds}
      onDrag={(e, data) => setPosition({ x: 0, y: data.y })}
    >
      <div ref={draggableRef} className="bar-standby-container">
        {/* <div className="tool">网页翻译</div>
        <div className="tool">网页总结</div> */}
        <TranslationStatusIndicator />
        {activeTasks}
        <div className="bar-standby-icon-wrapper">
          {/* 图片不能选中 */}
          <img
            draggable={false}
            onClick={() => {
              openToolBar({ windowType: WINDOW_TYPE.COMMON_CHAT })
            }}
            className="folded-icon"
            src={foldedIcon}
          />
          <>
            <span
              onClick={() => {
                setLiving(false)
              }}
              title="关闭"
              className="close-btn"
            >
              <svg
                width="8"
                height="10"
                viewBox="0 0 9 9"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                hanging="8"
              >
                <path
                  d="M7.83725 1.30615L1.30664 7.83676M1.30664 1.30615L7.83725 7.83676"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </span>
          </>
        </div>
        <div className="tool-wrapper">
          <a>
            <ToolOutlined />
          </a>
          <div className="tool-item-wrapper">
            <a onClick={openAIPic} className="tool-item">
              生成图片
            </a>
            <a className="tool-item">处理图片</a>
            <a
              className="tool-item"
              onClick={() => {
                renderTranslatePanel()
              }}
            >
              沉浸式翻译
            </a>
            <a
              className="tool-item"
              onClick={async () => {
                const userConfig = await getUserConfig()
                if (!isShowMiningPanel(userConfig)) {
                  message.warning('当前页面在挖掘面板黑名单中，如需使用请去设置页面删除黑名单', 10)
                  return
                }
                setUserConfig({
                  casualMiningStatus: 'cRunning',
                  headless: false,
                })
                openToolBar({ windowType: WINDOW_TYPE.LEADS_MINING })
              }}
            >
              客户开发
            </a>
          </div>
        </div>
      </div>
    </Draggable>
  )
}

DraggableBar.propTypes = {
  openToolBar: PropTypes.func.isRequired,
  foldedIcon: PropTypes.string.isRequired,
  setLiving: PropTypes.func.isRequired,
  activeTasks: PropTypes.node,
}
