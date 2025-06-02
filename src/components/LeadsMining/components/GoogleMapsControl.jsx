import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import { Button, Tag, Space, Row, Col } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
import KeywordManager from './KeywordManager'
import useLeadMiner from '../hooks/useLeadMiner'
import googleMapsAdapter from '../adapters/googleMapsAdapter'
import { API_CONFIG } from '../../../constants/api'

/**
 * 谷歌地图获客操控面板 - 重构版本
 */
function GoogleMapsControl({ selectedTask, onDataExtracted }) {
  const keywordManagerRef = useRef(null)
  const wrapperRef = useRef(null) // 用于 z-index，保持不变

  // 使用新的线索挖掘 hook
  const { isMining, startMining, stopMining } = useLeadMiner(
    googleMapsAdapter,
    selectedTask,
    onDataExtracted,
    keywordManagerRef,
  )

  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.style.zIndex = 2147483647
    }
  }, [])

  const keywords = useMemo(() => {
    return googleMapsAdapter.getKeywords(selectedTask)
  }, [selectedTask?.id])

  // handleKeywordSelect 现在简化了，因为 hook/adapter 处理关键词输入进行搜索
  const handleKeywordSelect = async (keyword) => {
    try {
      await googleMapsAdapter.clearSearchInput()
      const success = await googleMapsAdapter.inputKeyword(keyword)
      if (success) {
        console.log(`已将关键词 "${keyword}" 填入搜索框 (via adapter)`)
      }
    } catch (error) {
      console.error('填入关键词失败 (via adapter):', error)
    }
  }

  // 关键词状态更改现在主要在 hook/adapter 内管理和记录
  // 如果需要，此回调可用于额外的 UI 更新，超出 KeywordManager
  const handleKeywordStatusChange = useCallback(() => {
    // console.log(\`GoogleMapsControl: Keyword status changed\`);
    // 保留用于调试结构。如果需要可以重新添加参数
  }, [])

  // startAutoMining 和 stopAutoMining 现在简化为对 hook 方法的调用
  const handleStartMining = async () => {
    await startMining(keywords)
  }

  const handleStopMining = async () => {
    await stopMining()
  }

  const buttonConfig = isMining
    ? {
        text: '停止自动挖掘',
        icon: <PauseCircleOutlined />,
        type: 'danger',
        onClick: handleStopMining,
      }
    : {
        text: '开始自动挖掘',
        icon: <PlayCircleOutlined />,
        type: 'primary',
        onClick: handleStartMining,
      }

  const customActions = (
    <>
      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Button
            {...buttonConfig}
            danger={buttonConfig.type === 'danger'}
            style={{ borderColor: buttonConfig.type === 'danger' ? 'red' : '', fontSize: '12px' }}
            size="middle"
            block
          >
            {buttonConfig.text}
          </Button>
        </Col>
      </Row>
    </>
  )

  return (
    <>
      <KeywordManager
        ref={keywordManagerRef}
        title={
          <Space>
            <Space>
              <a
                href={
                  selectedTask?.id
                    ? `${API_CONFIG.BASE_URL}/web#action=leads.action_mining_task/${selectedTask?.id}`
                    : `${API_CONFIG.BASE_URL}/web#action=leads.action_mining_task`
                }
                target="_blank"
                rel="noreferrer"
              >
                关键词组合
              </a>
              <Tag color="blue" style={{ fontWeight: 'normal', fontSize: 12 }}>
                {googleMapsAdapter.description}
              </Tag>
            </Space>
          </Space>
        }
        keywords={keywords}
        selectedTask={selectedTask}
        storagePrefix={googleMapsAdapter.platformId}
        onKeywordSelect={handleKeywordSelect}
        onKeywordStatusChange={handleKeywordStatusChange}
        isProcessing={isMining}
        customActions={customActions}
        showResetButton={true}
      />
      <div ref={wrapperRef} style={{ position: 'relative' }}></div>
    </>
  )
}

GoogleMapsControl.propTypes = {
  selectedTask: PropTypes.object,
  onDataExtracted: PropTypes.func,
}

export default GoogleMapsControl
