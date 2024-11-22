import React, { useRef } from 'react'
import Browser from 'webextension-polyfill'

let mouseDownY = 0
let isMouseDown = false
let originalTransformY = 0
let transformY = 0

import './index.scss'

const translateIcon = Browser.runtime.getURL('imgs/icon-translate.png')

export const DraggableBar = ({ openToolBar, foldedIcon, setLiving, handleTranslate }) => {
  const containerRef = useRef(null)
  let innerHeight = window.innerHeight

  const onMouseDown = (e) => {
    e.preventDefault()
    mouseDownY = e.clientY
    isMouseDown = true
    innerHeight = window.innerHeight
  }

  const onMouseMove = (e) => {
    if (!containerRef.current || isMouseDown === false) return
    if (e.clientY <= 46 || e.clientY + 46 >= innerHeight) {
      console.log('stop moving')
      return
    }
    transformY = originalTransformY + e.clientY - mouseDownY
    containerRef.current.style.transform = `translateY(${transformY}px)`
  }

  const onMouseLeave = (e) => {
    isMouseDown = false
    originalTransformY = transformY
  }

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
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseUp={onMouseLeave}
    >
      <div className="bar-standby-container">
        <div className="tool">
          <img onClick={handleTranslate} className="folded-icon" src={translateIcon} />
        </div>
        <div className="tool">总结网页</div>
        <div className="tool">总结网页</div>
        <div className="tool-wrapper">
          <a>工具箱</a>
          <div className="tool-item-wrapper">
            <a onClick={openAIPic} className="tool-item">
              生成图片
            </a>
            <a className="tool-item">处理图片</a>
          </div>
        </div>
        <div className="bar-standby-icon-wrapper">
          <img onClick={openToolBar} className="folded-icon" src={foldedIcon} />
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
      </div>
    </div>
  )
}
