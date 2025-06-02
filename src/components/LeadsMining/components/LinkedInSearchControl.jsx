import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button, Tag, Space, Row, Col, message } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
import Browser from 'webextension-polyfill'
import KeywordManager, { KEYWORD_STATUS } from './KeywordManager'
import { getPlatformConfig, getTaskKeywords } from '../../../utils/keywords'

// 配置message的zIndex
message.config({
  zIndex: 2147483647,
})

// 获取LinkedIn平台关键词配置
const LINKEDIN_CONFIG = getPlatformConfig('linkedin')

/**
 * LinkedIn搜索获客操控面板
 */
function LinkedInSearchControl({ selectedTask, onDataExtracted }) {
  // 只保留平台特定的状态
  const [allExtractedData, setAllExtractedData] = useState([])
  const [isSearchingDisplay, setIsSearchingDisplay] = useState(false)
  const keywordManagerRef = useRef(null)
  const wrapperRef = useRef(null)

  // 从任务中动态获取关键词
  const LINKEDIN_KEYWORDS = getTaskKeywords(selectedTask)

  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.style.zIndex = 2147483647
    }
  }, [])

  // 获取平台特定的storage存储键
  const getPlatformStorageKeys = useCallback(() => {
    const taskId = selectedTask?.id || 'default'
    return {
      extractedData: `linkedinSearch_extractedData_${taskId}`,
      searchState: `linkedinSearch_searchState_${taskId}`,
    }
  }, [selectedTask?.id])

  // 获取搜索状态
  const getSearchState = useCallback(async () => {
    try {
      const storageKeys = getPlatformStorageKeys()
      const result = await Browser.storage.local.get([storageKeys.searchState])
      return result[storageKeys.searchState] || false
    } catch (error) {
      console.error('获取LinkedIn搜索状态失败:', error)
      return false
    }
  }, [getPlatformStorageKeys])

  // 设置搜索状态
  const setSearchState = useCallback(
    async (isSearching) => {
      try {
        const storageKeys = getPlatformStorageKeys()
        await Browser.storage.local.set({
          [storageKeys.searchState]: isSearching,
        })

        setIsSearchingDisplay(isSearching)
        console.log(`LinkedIn搜索状态已设置为: ${isSearching}`)
      } catch (error) {
        console.error('设置LinkedIn搜索状态失败:', error)
      }
    },
    [getPlatformStorageKeys],
  )

  // 从storage加载提取的数据
  const loadExtractedData = useCallback(async () => {
    try {
      const storageKeys = getPlatformStorageKeys()
      const result = await Browser.storage.local.get([storageKeys.extractedData])
      const extractedData = result[storageKeys.extractedData] || []
      setAllExtractedData(extractedData)
    } catch (error) {
      console.error('从storage加载LinkedIn提取数据失败:', error)
    }
  }, [getPlatformStorageKeys])

  // 保存提取的数据到storage
  const saveExtractedData = useCallback(
    async (data) => {
      try {
        const storageKeys = getPlatformStorageKeys()
        await Browser.storage.local.set({
          [storageKeys.extractedData]: data,
        })
        setAllExtractedData(data)
      } catch (error) {
        console.error('保存LinkedIn提取数据失败:', error)
      }
    },
    [getPlatformStorageKeys],
  )

  // 组件挂载时加载状态
  useEffect(() => {
    const loadState = async () => {
      await loadExtractedData()
      const searchState = await getSearchState()
      setIsSearchingDisplay(searchState)
    }
    loadState()
  }, [loadExtractedData, getSearchState])

  // 处理关键词选择
  const handleKeywordSelect = useCallback(async (keyword) => {
    try {
      // 这里可以实现LinkedIn搜索逻辑
      console.log(`已选择LinkedIn关键词: "${keyword}"`)
      // 例如：填入LinkedIn搜索框或其他LinkedIn特定操作
    } catch (error) {
      console.error('处理LinkedIn关键词选择失败:', error)
    }
  }, [])

  // 关键词状态变化处理
  const handleKeywordStatusChange = useCallback((keyword, status, keywordState) => {
    console.log(`LinkedIn关键词 "${keyword}" 状态变更为: ${status}`, keywordState)
  }, [])

  // 更新关键词状态的辅助方法
  const updateKeywordStatus = useCallback((keyword, status, additionalData = {}) => {
    if (keywordManagerRef.current) {
      keywordManagerRef.current.updateKeywordStatus(keyword, status, additionalData)
    }
  }, [])

  // 获取当前选中的关键词
  const getSelectedKeyword = useCallback(() => {
    return keywordManagerRef.current?.getSelectedKeyword() || null
  }, [])

  // 开始自动搜索
  const startAutoSearch = async () => {
    await setSearchState(true)

    try {
      // 从KeywordManager获取当前选中的关键词
      const selectedKeyword = getSelectedKeyword()
      const startIndex = selectedKeyword ? LINKEDIN_KEYWORDS.indexOf(selectedKeyword) : 0

      const keywordsToProcess = LINKEDIN_KEYWORDS.slice(Math.max(0, startIndex))
      let totalExtracted = [...allExtractedData]

      for (const keyword of keywordsToProcess) {
        // 检查是否已停止
        const currentSearchState = await getSearchState()
        if (!currentSearchState) break

        // 通过KeywordManager更新状态
        updateKeywordStatus(keyword, KEYWORD_STATUS.PROCESSING)
        keywordManagerRef.current?.setSelectedKeyword(keyword)

        try {
          // 这里实现LinkedIn搜索逻辑
          console.log(`正在处理LinkedIn关键词: ${keyword}`)

          // 模拟搜索和提取过程
          const extractedContacts = [
            {
              name: `示例联系人 - ${keyword}`,
              position: keyword,
              company: '示例公司',
              email: 'example@linkedin.com',
              keyword: keyword,
              source: 'LinkedIn',
            },
          ]

          // 保存结果
          totalExtracted.push(...extractedContacts)
          await saveExtractedData(totalExtracted)
          updateKeywordStatus(keyword, KEYWORD_STATUS.COMPLETED, {
            processedCount: extractedContacts.length,
          })

          // 通知父组件
          if (onDataExtracted && extractedContacts.length > 0) {
            onDataExtracted(extractedContacts)
          }

          // 模拟延迟
          await new Promise((resolve) => setTimeout(resolve, 2000))
        } catch (error) {
          console.error(`处理LinkedIn关键词 "${keyword}" 时出错:`, error)
          updateKeywordStatus(keyword, KEYWORD_STATUS.PENDING)
        }
      }

      await setSearchState(false)
      message.success(`LinkedIn线索抓取完成！共提取 ${totalExtracted.length} 条线索。`)
    } catch (error) {
      console.error('LinkedIn自动搜索过程中出错:', error)
      await setSearchState(false)
    }
  }

  // 停止自动搜索
  const stopAutoSearch = async () => {
    await setSearchState(false)

    // 重置正在处理的关键词状态
    const selectedKeyword = getSelectedKeyword()
    if (selectedKeyword) {
      updateKeywordStatus(selectedKeyword, KEYWORD_STATUS.PENDING, {
        processedCount: 0,
      })
    }
  }

  // 调试功能
  const handleTestSearch = async () => {
    const selectedKeyword = getSelectedKeyword()
    if (!selectedKeyword) {
      message.warning('请先选择一个关键词')
      return
    }

    console.log(`🔍 开始测试LinkedIn搜索 - ${selectedKeyword}`)
    // 这里实现测试搜索逻辑
    message.info(`正在测试搜索关键词: ${selectedKeyword}`)
  }

  // 获取搜索按钮配置
  const buttonConfig = isSearchingDisplay
    ? {
        text: '停止自动搜索',
        icon: <PauseCircleOutlined />,
        type: 'danger',
        onClick: stopAutoSearch,
      }
    : {
        text: '开始自动搜索',
        icon: <PlayCircleOutlined />,
        type: 'primary',
        onClick: startAutoSearch,
      }

  // 自定义操作按钮
  const customActions = (
    <>
      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Button {...buttonConfig} size="large" block />
        </Col>
      </Row>

      {/* LinkedIn特定的调试按钮 */}
      <Row gutter={8}>
        <Col span={12}>
          <Button
            type="default"
            size="small"
            block
            disabled={isSearchingDisplay || !getSelectedKeyword()}
            onClick={handleTestSearch}
            title="测试选中的关键词搜索"
          >
            🔍 测试搜索
          </Button>
        </Col>
        <Col span={12}>
          <Button
            type="default"
            size="small"
            block
            onClick={() => {
              console.log('LinkedIn调试信息:', {
                selectedKeyword: getSelectedKeyword(),
                allExtractedData,
                isSearchingDisplay,
              })
              message.info('调试信息已输出到控制台')
            }}
            title="输出调试信息到控制台"
          >
            📋 调试信息
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
            {LINKEDIN_CONFIG.name}搜索操控
            <Tag color="blue">{LINKEDIN_CONFIG.description}</Tag>
          </Space>
        }
        keywords={LINKEDIN_KEYWORDS}
        selectedTask={selectedTask}
        storagePrefix="linkedinSearch"
        onKeywordSelect={handleKeywordSelect}
        onKeywordStatusChange={handleKeywordStatusChange}
        isProcessing={isSearchingDisplay}
        customActions={customActions}
        showResetButton={true}
      />
      <div ref={wrapperRef} style={{ position: 'relative' }}></div>
    </>
  )
}

LinkedInSearchControl.propTypes = {
  selectedTask: PropTypes.object,
  onDataExtracted: PropTypes.func,
}

export default LinkedInSearchControl
