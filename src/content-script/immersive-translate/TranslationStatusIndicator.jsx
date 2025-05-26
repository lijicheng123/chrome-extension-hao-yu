import React, { useState, useEffect } from 'react'
import { TranslationOutlined } from '@ant-design/icons'
import { getTranslationStatus, addTranslationStatusListener } from './index.jsx'
import { renderTranslatePanel } from './index.jsx'
import './TranslationStatusIndicator.scss'

export const TranslationStatusIndicator = () => {
  const [status, setStatus] = useState({
    enabled: false,
    isTranslating: false,
    translatedCount: 0,
    totalCount: 0,
  })

  useEffect(() => {
    // 初始化状态
    const initialStatus = getTranslationStatus()
    setStatus(initialStatus)

    // 监听状态变化
    const unsubscribe = addTranslationStatusListener((isTranslating, fullStatus) => {
      if (fullStatus) {
        // 如果提供了完整状态，直接使用
        setStatus(fullStatus)
      } else {
        // 否则获取当前状态
        const currentStatus = getTranslationStatus()
        setStatus({
          ...currentStatus,
          isTranslating,
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleClick = () => {
    renderTranslatePanel()
  }

  const getStatusText = () => {
    if (!status.enabled) {
      return '未翻译'
    }
    if (status.isTranslating) {
      return '翻译中...'
    }
    if (status.translatedCount > 0) {
      return `已翻译 ${status.translatedCount}/${status.totalCount}`
    }
    return '已启用'
  }

  const getStatusColor = () => {
    if (!status.enabled) {
      return '#999'
    }
    if (status.isTranslating) {
      return '#1890ff'
    }
    if (status.translatedCount > 0) {
      return '#52c41a'
    }
    return '#faad14'
  }

  return (
    <div
      className="translation-status-indicator"
      onClick={handleClick}
      title="点击打开沉浸式翻译面板"
    >
      <div className="status-icon" style={{ color: getStatusColor() }}>
        <TranslationOutlined />
      </div>
      <div className="status-text" style={{ color: getStatusColor() }}>
        {getStatusText()}
      </div>
      {status.isTranslating && (
        <div className="loading-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>
      )}
    </div>
  )
}
