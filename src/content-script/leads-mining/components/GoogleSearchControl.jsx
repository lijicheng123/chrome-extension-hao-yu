import React, { useRef, useEffect, useCallback, useState } from 'react'
import { Button, Tag, Space, Row, Col, Badge } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined, StopOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
import KeywordManager from './KeywordManager'
import googleSearchAutomationAdapter from '../adapters/googleSearchAutomationAdapter'
import { AUTOMATION_STATUS } from '../constants/automationConfig'

/**
 * 谷歌搜索获客操控面板 - 纯自动化模式
 */
function GoogleSearchControl({ selectedTask }) {
  const keywordManagerRef = useRef(null)
  const wrapperRef = useRef(null)
  const logPrefix = '[GoogleSearchControl]'

  // UI状态：只用于界面显示，实际状态存储在storage中
  const [uiState, setUIState] = useState({
    isProcessing: false,
    isPaused: false,
    statusText: '待开始',
    progress: {
      currentKeyword: '',
      currentPage: 0,
      processedLinks: 0,
      extractedInfo: 0,
    },
    keywords: [],
    currentKeywordIndex: 0,
  })

  // 初始化
  useEffect(() => {
    console.log(`${logPrefix} 组件初始化`)

    // 设置样式
    if (wrapperRef.current) {
      wrapperRef.current.style.zIndex = 2147483647
    }

    const initialize = async () => {
      try {
        // 初始化适配器
        await googleSearchAutomationAdapter.initialize()

        // 同步状态
        await syncStateFromStorage()

        console.log(`${logPrefix} 初始化完成`)
      } catch (error) {
        console.error(`${logPrefix} 初始化失败`, error)
      }
    }

    initialize()
  }, [])

  // 定期同步状态
  useEffect(() => {
    const intervalId = setInterval(syncStateFromStorage, 1000)
    return () => clearInterval(intervalId)
  }, [])

  /**
   * 从Storage同步状态到UI
   */
  const syncStateFromStorage = useCallback(async () => {
    try {
      const state = googleSearchAutomationAdapter.getState()

      if (state) {
        const newUIState = {
          isProcessing: state.status === AUTOMATION_STATUS.PROCESSING,
          isPaused: state.status === AUTOMATION_STATUS.PAUSED,
          statusText: getStatusText(state),
          progress: {
            currentKeyword: getCurrentKeywordText(state),
            currentPage: state.currentPage || 0,
            processedLinks: state.processedLinksCount || 0,
            extractedInfo: state.extractedInfoCount || 0,
          },
          keywords: state.keywords || [],
          currentKeywordIndex: state.currentKeywordIndex || 0,
        }

        setUIState((prevState) => {
          if (JSON.stringify(prevState) !== JSON.stringify(newUIState)) {
            console.log(`${logPrefix} UI状态更新`, {
              from: prevState,
              to: newUIState,
            })
            return newUIState
          }
          return prevState
        })
      } else {
        // 无状态时重置UI
        setUIState({
          isProcessing: false,
          isPaused: false,
          statusText: '待开始',
          progress: {
            currentKeyword: '',
            currentPage: 0,
            processedLinks: 0,
            extractedInfo: 0,
          },
          keywords: [],
          currentKeywordIndex: 0,
        })
      }
    } catch (error) {
      console.error(`${logPrefix} 同步状态失败`, error)
    }
  }, [])

  /**
   * 获取状态文本
   */
  const getStatusText = (state) => {
    if (!state) return '待开始'

    switch (state.status) {
      case AUTOMATION_STATUS.PROCESSING:
        return '进行中'
      case AUTOMATION_STATUS.PAUSED:
        return '已暂停'
      case AUTOMATION_STATUS.COMPLETED:
        return '已完成'
      default:
        return '待开始'
    }
  }

  /**
   * 获取当前关键词文本
   */
  const getCurrentKeywordText = (state) => {
    if (!state || !state.keywords || state.currentKeywordIndex === undefined) {
      return ''
    }

    const keyword = state.keywords[state.currentKeywordIndex]
    return keyword ? `${keyword} (${state.currentKeywordIndex + 1}/${state.keywords.length})` : ''
  }

  /**
   * 点击按钮开始自动化
   */
  const handleStart = useCallback(async () => {
    console.log(`${logPrefix} 用户点击开始`)

    if (!selectedTask) {
      console.warn(`${logPrefix} 没有选择任务`)
      return
    }
    // 删除storage里的contactList

    try {
      await googleSearchAutomationAdapter.startAutomation(selectedTask)
      console.log(`${logPrefix} 自动化已启动`)
    } catch (error) {
      console.error(`${logPrefix} 启动自动化失败`, error)
    }
  }, [selectedTask])

  /**
   * 暂停自动化
   */
  const handlePause = useCallback(async () => {
    console.log(`${logPrefix} 用户点击暂停`)

    try {
      await googleSearchAutomationAdapter.pauseAutomation()
      console.log(`${logPrefix} 自动化已暂停`)
    } catch (error) {
      console.error(`${logPrefix} 暂停自动化失败`, error)
    }
  }, [])

  /**
   * 恢复自动化
   */
  const handleResume = useCallback(async () => {
    console.log(`${logPrefix} 用户点击恢复`)

    try {
      await googleSearchAutomationAdapter.resumeAutomation()
      console.log(`${logPrefix} 自动化已恢复`)
    } catch (error) {
      console.error(`${logPrefix} 恢复自动化失败`, error)
    }
  }, [])

  /**
   * 停止自动化
   */
  const handleStop = useCallback(async () => {
    console.log(`${logPrefix} 用户点击停止`)

    try {
      await googleSearchAutomationAdapter.stopAutomation()
      console.log(`${logPrefix} 自动化已停止`)
    } catch (error) {
      console.error(`${logPrefix} 停止自动化失败`, error)
    }
  }, [])

  const renderTitle = () => {
    const { isProcessing, isPaused, statusText } = uiState
    return (
      <Space>
        <h3 style={{ margin: 0, color: '#1890ff' }}>谷歌搜索自动档</h3>
        <Badge
          count={
            <Tag color={isProcessing ? 'processing' : isPaused ? 'warning' : 'default'}>
              {statusText}
            </Tag>
          }
        ></Badge>
      </Space>
    )
  }
  /**
   * 渲染控制按钮
   */
  const renderControlButtons = () => {
    if (uiState.isProcessing) {
      return (
        <Space>
          <Button
            type="default"
            icon={<PauseCircleOutlined />}
            onClick={handlePause}
            loading={false}
          >
            暂停
          </Button>
          <Button type="default" icon={<StopOutlined />} onClick={handleStop} danger>
            停止
          </Button>
        </Space>
      )
    }

    if (uiState.isPaused) {
      return (
        <Space>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleResume}>
            恢复
          </Button>
          <Button type="default" icon={<StopOutlined />} onClick={handleStop} danger>
            停止
          </Button>
        </Space>
      )
    }

    return (
      <Button
        type="primary"
        icon={<PlayCircleOutlined />}
        onClick={handleStart}
        disabled={!selectedTask}
      >
        开启自动化
      </Button>
    )
  }

  /**
   * 渲染状态信息
   */
  const renderStatusInfo = () => {
    const { progress } = uiState

    return (
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* 横向排列的状态信息 */}
        {(progress.currentKeyword ||
          progress.currentPage > 0 ||
          progress.processedLinks > 0 ||
          progress.extractedInfo > 0) && (
          <Row gutter={16}>
            <Col span={24} style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>
                <strong>关键词：</strong>
                {progress.currentKeyword}
              </span>
            </Col>
            <Col span={8}>
              <span style={{ fontSize: '12px', color: '#666' }}>
                <strong>当前页：</strong>第 {progress.currentPage} 页
              </span>
            </Col>
            <Col span={8}>
              <span style={{ fontSize: '12px', color: '#666' }}>
                <strong>已处理：</strong>
                {progress.processedLinks} 个链接
              </span>
            </Col>
            <Col span={8}>
              <span style={{ fontSize: '12px', color: '#666' }}>
                <strong>已提取：</strong>
                {progress.extractedInfo} 条信息
              </span>
            </Col>
          </Row>
        )}
      </Space>
    )
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        padding: '16px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        marginBottom: '16px',
      }}
    >
      <Row gutter={[16, 16]} align="middle">
        <Col span={24}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            {renderTitle()}
            {renderControlButtons()}
          </div>
        </Col>

        <Col span={24}>{renderStatusInfo()}</Col>

        <Col span={24}>
          <KeywordManager
            ref={keywordManagerRef}
            selectedTask={selectedTask}
            platform="googleSearch"
            keywords={uiState.keywords}
            currentKeywordIndex={uiState.currentKeywordIndex}
            automationMode={true}
            isProcessing={uiState.isProcessing}
            onKeywordSelect={(keyword, index) => {
              console.log(`${logPrefix} 用户选择关键词`, { keyword, index })
              // 在自动化模式下，关键词选择主要用于显示，不直接操作
            }}
            onKeywordStatusChange={(changes) => {
              console.log(`${logPrefix} 关键词状态变化`, changes)
              // 关键词状态变化回调
            }}
            showResetButton={false}
            customActions={null}
          />
        </Col>
      </Row>
    </div>
  )
}

GoogleSearchControl.propTypes = {
  selectedTask: PropTypes.string,
}

export default GoogleSearchControl
