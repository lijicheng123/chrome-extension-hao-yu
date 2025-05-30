import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, List, Button, Tag, Space, Typography, Row, Col, message, Modal } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
import Browser from 'webextension-polyfill'
import {
  performGoogleMapsSearch,
  processAllResultsForKeyword,
  clearSearchInput,
  inputSearchKeyword,
  getSearchResults,
  isResultListAtBottom,
} from '../utils/googleMapsAutomation'

const { Text, Title } = Typography

// 配置message的zIndex
message.config({
  zIndex: 2147483647,
})
Modal.config({
  zIndex: 2147483647,
})

// 预定义的关键词列表
const DEFAULT_KEYWORDS = [
  'water bottle wholesale new york',
  'bulk buy water bottles New York',
  'custom water bottles NYC',
  'reusable water bottles supplier NY',
  'wholesale sports water bottles NYC',
  'eco-friendly water bottles New York',
  'insulated water bottle distributor NY',
  'glass water bottle wholesale NYC',
  'promotional water bottles New York',
  'hydration pack supplier NYC',
]

// 关键词状态枚举
const KEYWORD_STATUS = {
  PENDING: 'pending', // 待挖掘
  MINING: 'mining', // 挖掘中
  COMPLETED: 'completed', // 已挖掘
}

// 状态标签配置
const STATUS_CONFIG = {
  [KEYWORD_STATUS.PENDING]: { color: 'default', text: '待挖掘' },
  [KEYWORD_STATUS.MINING]: { color: 'processing', text: '挖掘中' },
  [KEYWORD_STATUS.COMPLETED]: { color: 'success', text: '已挖掘' },
}

/**
 * 谷歌地图获客操控面板
 */
function GoogleMapsControl({ selectedTask, onDataExtracted }) {
  const [uiState, setUiState] = useState({
    keywordStates: {},
    selectedKeyword: null,
    allExtractedData: [],
    isMiningDisplay: false, // 仅用于UI显示，不参与逻辑控制
  })
  const wrapperRef = useRef(null)
  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.style.zIndex = 2147483647
    }
  }, [])

  // 获取storage存储键
  const getStorageKeys = useCallback(() => {
    const taskId = selectedTask?.id || 'default'
    return {
      keywordStates: `googleMaps_keywords_${taskId}`,
      globalState: `googleMaps_globalState_${taskId}`,
      extractedData: `googleMaps_extractedData_${taskId}`,
      miningState: `googleMaps_miningState_${taskId}`, // 单独存储挖掘状态
    }
  }, [selectedTask?.id])

  // 从storage读取状态
  const loadStateFromStorage = useCallback(async () => {
    try {
      const storageKeys = getStorageKeys()
      const result = await Browser.storage.local.get([
        storageKeys.keywordStates,
        storageKeys.globalState,
        storageKeys.extractedData,
      ])

      // 加载关键词状态
      const savedKeywordStates = result[storageKeys.keywordStates] || {}
      const initialKeywordStates = {}
      DEFAULT_KEYWORDS.forEach((keyword) => {
        initialKeywordStates[keyword] = savedKeywordStates[keyword] || {
          status: KEYWORD_STATUS.PENDING,
          extractedCount: 0,
          lastUpdate: null,
        }
      })

      // 加载全局状态
      const savedGlobalState = result[storageKeys.globalState] || {}
      const { selectedKeyword = null } = savedGlobalState

      // 加载提取的数据
      const allExtractedData = result[storageKeys.extractedData] || []

      // 如果没有选中关键词，默认选中第一个未挖掘的
      const finalSelectedKeyword =
        selectedKeyword ||
        DEFAULT_KEYWORDS.find(
          (keyword) => initialKeywordStates[keyword].status === KEYWORD_STATUS.PENDING,
        ) ||
        null

      setUiState({
        keywordStates: initialKeywordStates,
        selectedKeyword: finalSelectedKeyword,
        allExtractedData,
      })
    } catch (error) {
      console.error('从storage加载状态失败:', error)
    }
  }, [getStorageKeys])

  // 保存状态到storage
  const saveStateToStorage = useCallback(
    async (newState) => {
      try {
        const storageKeys = getStorageKeys()
        const dataToSave = {}

        if (newState.keywordStates) {
          dataToSave[storageKeys.keywordStates] = newState.keywordStates
        }

        if (newState.selectedKeyword !== undefined) {
          dataToSave[storageKeys.globalState] = {
            selectedKeyword: newState.selectedKeyword ?? uiState.selectedKeyword,
            lastUpdate: new Date().toISOString(),
          }
        }

        if (newState.allExtractedData) {
          dataToSave[storageKeys.extractedData] = newState.allExtractedData
        }

        await Browser.storage.local.set(dataToSave)
      } catch (error) {
        console.error('保存状态到storage失败:', error)
      }
    },
    [getStorageKeys, uiState.selectedKeyword],
  )

  // 更新状态
  const updateState = useCallback(
    async (newState) => {
      setUiState((prevState) => ({ ...prevState, ...newState }))
      await saveStateToStorage(newState)
    },
    [saveStateToStorage],
  )

  // 更新单个关键词状态
  const updateKeywordStatus = useCallback(
    async (keyword, status, additionalData = {}) => {
      const newKeywordStates = {
        ...uiState.keywordStates,
        [keyword]: {
          ...uiState.keywordStates[keyword],
          status,
          lastUpdate: new Date().toISOString(),
          ...additionalData,
        },
      }
      await updateState({ keywordStates: newKeywordStates })
    },
    [uiState.keywordStates, updateState],
  )

  // 获取挖掘状态
  const getMiningState = useCallback(async () => {
    try {
      const storageKeys = getStorageKeys()
      const result = await Browser.storage.local.get([storageKeys.miningState])
      return result[storageKeys.miningState] || false
    } catch (error) {
      console.error('获取挖掘状态失败:', error)
      return false
    }
  }, [getStorageKeys])

  // 设置挖掘状态
  const setMiningState = useCallback(
    async (isMining) => {
      try {
        const storageKeys = getStorageKeys()
        await Browser.storage.local.set({
          [storageKeys.miningState]: isMining,
        })

        // 同步更新UI显示状态
        setUiState((prevState) => ({ ...prevState, isMiningDisplay: isMining }))

        console.log(`挖掘状态已设置为: ${isMining}`)
      } catch (error) {
        console.error('设置挖掘状态失败:', error)
      }
    },
    [getStorageKeys],
  )

  // 组件挂载时从storage加载状态
  useEffect(() => {
    const loadState = async () => {
      await loadStateFromStorage()
      // 加载挖掘状态用于UI显示
      const miningState = await getMiningState()
      setUiState((prevState) => ({ ...prevState, isMiningDisplay: miningState }))
    }
    loadState()
  }, [loadStateFromStorage, getMiningState])

  // 手动选择关键词并填入搜索框
  const handleKeywordSelect = async (keyword) => {
    const isMining = await getMiningState()
    if (isMining) return

    await updateState({ selectedKeyword: keyword })

    try {
      clearSearchInput()
      const success = inputSearchKeyword(keyword)
      if (success) {
        console.log(`已将关键词 "${keyword}" 填入搜索框`)
      }
    } catch (error) {
      console.error('填入关键词失败:', error)
    }
  }

  // 开始自动挖掘
  const startAutoMining = async () => {
    await setMiningState(true)

    try {
      // 找到起始关键词
      let startKeyword =
        uiState.selectedKeyword ||
        DEFAULT_KEYWORDS.find(
          (keyword) => uiState.keywordStates[keyword]?.status === KEYWORD_STATUS.PENDING,
        )

      if (!startKeyword) {
        message.warning('所有关键词都已挖掘完成！')
        await setMiningState(false)
        return
      }

      // 处理关键词列表
      const startIndex = DEFAULT_KEYWORDS.indexOf(startKeyword)
      const keywordsToProcess = DEFAULT_KEYWORDS.slice(startIndex)
      let totalExtracted = [...uiState.allExtractedData]

      for (const keyword of keywordsToProcess) {
        // 检查是否已停止
        const currentMiningState = await getMiningState()
        if (!currentMiningState) break

        // 检查是否已完成
        if (uiState.keywordStates[keyword]?.status === KEYWORD_STATUS.COMPLETED) continue

        // 设置为挖掘中
        await updateKeywordStatus(keyword, KEYWORD_STATUS.MINING)
        await updateState({ selectedKeyword: keyword })

        try {
          // 执行搜索和处理
          const searchSuccess = await performGoogleMapsSearch(keyword)
          if (!searchSuccess) {
            await updateKeywordStatus(keyword, KEYWORD_STATUS.PENDING)
            continue
          }

          // 传递taskId以便状态检查
          const taskId = selectedTask?.id || 'default'
          const extractedContacts = await processAllResultsForKeyword(keyword, taskId)

          // 保存结果
          totalExtracted.push(...extractedContacts)
          await updateState({ allExtractedData: totalExtracted })
          await updateKeywordStatus(keyword, KEYWORD_STATUS.COMPLETED, {
            extractedCount: extractedContacts.length,
          })

          // 通知父组件
          if (onDataExtracted && extractedContacts.length > 0) {
            onDataExtracted(extractedContacts)
          }
        } catch (error) {
          console.error(`处理关键词 "${keyword}" 时出错:`, error)
          await updateKeywordStatus(keyword, KEYWORD_STATUS.PENDING)
        }
      }

      await setMiningState(false)
      message.success(`线索抓取完成！共提取 ${totalExtracted.length} 条线索。`)
    } catch (error) {
      console.error('自动挖掘过程中出错:', error)
      await setMiningState(false)
    }
  }

  // 停止自动挖掘
  const stopAutoMining = async () => {
    await setMiningState(false)

    // 重置正在挖掘的关键词状态
    if (
      uiState.selectedKeyword &&
      uiState.keywordStates[uiState.selectedKeyword]?.status === KEYWORD_STATUS.MINING
    ) {
      await updateKeywordStatus(uiState.selectedKeyword, KEYWORD_STATUS.PENDING, {
        extractedCount: 0,
      })
    }
  }

  // 重置所有状态
  const resetAllStates = async () => {
    Modal.confirm({
      title: '重置挖掘状态',
      content: '确定要重置所有挖掘状态吗？这将清除所有进度和数据。',
      okText: '确定重置',
      cancelText: '取消',
      okType: 'danger',
      getContainer: () => wrapperRef.current,
      onOk: async () => {
        try {
          const initialKeywordStates = {}
          DEFAULT_KEYWORDS.forEach((keyword) => {
            initialKeywordStates[keyword] = {
              status: KEYWORD_STATUS.PENDING,
              extractedCount: 0,
              lastUpdate: null,
            }
          })

          await updateState({
            keywordStates: initialKeywordStates,
            selectedKeyword: DEFAULT_KEYWORDS[0],
            allExtractedData: [],
          })

          // 清空搜索框并清除页面状态
          clearSearchInput()

          message.success('所有挖掘状态已重置！')
        } catch (error) {
          console.error('重置状态失败:', error)
          message.error('重置状态失败，请重试')
        }
      },
    })
  }

  // 调试按钮处理函数
  const handleDebugSearch = async () => {
    if (!uiState.selectedKeyword) {
      message.warning('请先选择一个关键词')
      return
    }

    console.log(`🔍 开始调试：输入关键词并搜索 - ${uiState.selectedKeyword}`)
    const success = await performGoogleMapsSearch(uiState.selectedKeyword)
    console.log(`搜索结果: ${success ? '成功' : '失败'}`)
    message.info(`关键词搜索${success ? '成功' : '失败'}，请查看控制台`)
  }

  const handleDebugGetResults = () => {
    console.log(`📋 开始调试：获取搜索结果`)
    const results = getSearchResults()
    console.log(`找到的搜索结果:`, results)
    console.log(`结果数量: ${results.length}`)

    // 打印每个结果的基本信息
    results.forEach((result, index) => {
      const text = result.textContent?.trim() || '无文本'
      const href = result.href || '无链接'
      console.log(`结果 ${index + 1}:`, { text: text.substring(0, 100), href })
    })

    // 检查是否到达底部
    const isAtBottom = isResultListAtBottom()
    console.log(`是否已到达结果列表底部: ${isAtBottom}`)

    message.info(
      `找到 ${results.length} 个搜索结果，${
        isAtBottom ? '已到底部' : '可能还有更多'
      }，详情请查看控制台`,
    )
  }

  const handleDebugScrollLoad = async () => {
    console.log(`📜 开始调试：滚动加载更多结果`)

    const beforeCount = getSearchResults().length
    console.log(`滚动前结果数量: ${beforeCount}`)

    const isAtBottom = isResultListAtBottom()
    console.log(`滚动前是否已到底部: ${isAtBottom}`)

    if (isAtBottom) {
      message.info('已经到达结果列表底部，无更多结果可加载')
      return
    }

    try {
      // 模拟滚动加载过程
      const resultsContainer = document.querySelector('div[role="feed"][tabindex="-1"]')
      if (resultsContainer) {
        resultsContainer.scrollTop = resultsContainer.scrollHeight
        console.log('已滚动结果列表到底部')
      } else {
        window.scrollTo(0, document.body.scrollHeight)
        console.log('已滚动页面到底部')
      }

      message.info('正在加载更多结果，请稍候...')

      // 等待加载
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const afterCount = getSearchResults().length
      const newCount = afterCount - beforeCount
      const newIsAtBottom = isResultListAtBottom()

      console.log(`滚动后结果数量: ${afterCount}`)
      console.log(`新增结果数量: ${newCount}`)
      console.log(`滚动后是否已到底部: ${newIsAtBottom}`)

      if (newCount > 0) {
        message.success(`成功加载了 ${newCount} 个新结果！`)
      } else if (newIsAtBottom) {
        message.info('已到达结果列表底部，无更多结果')
      } else {
        message.warning('未检测到新结果，可能需要更长等待时间')
      }
    } catch (error) {
      console.error('滚动加载过程中出错:', error)
      message.error(`滚动加载失败: ${error.message}`)
    }
  }

  const handleDebugProcessResults = async () => {
    if (!uiState.selectedKeyword) {
      message.warning('请先选择一个关键词')
      return
    }

    console.log(`⚡ 开始调试：逐个点击结果并提取信息 - ${uiState.selectedKeyword}`)

    try {
      // 传递taskId以便状态检查（调试模式下使用'debug'）
      const extractedContacts = await processAllResultsForKeyword(uiState.selectedKeyword, 'debug')
      console.log(`提取完成，共获得 ${extractedContacts.length} 条联系人信息:`, extractedContacts)
      message.success(`处理完成，提取了 ${extractedContacts.length} 条信息，详情请查看控制台`)
    } catch (error) {
      console.error('处理结果时出错:', error)
      message.error(`处理出错: ${error.message}`)
    }
  }

  // 获取挖掘按钮配置
  const buttonConfig = uiState.isMiningDisplay
    ? {
        text: '停止自动挖掘',
        icon: <PauseCircleOutlined />,
        type: 'danger',
        onClick: stopAutoMining,
      }
    : {
        text: '开始自动挖掘',
        icon: <PlayCircleOutlined />,
        type: 'primary',
        onClick: startAutoMining,
      }

  // 统计信息
  const stats = {
    total: DEFAULT_KEYWORDS.length,
    pending: Object.values(uiState.keywordStates).filter(
      (state) => state.status === KEYWORD_STATUS.PENDING,
    ).length,
    mining: Object.values(uiState.keywordStates).filter(
      (state) => state.status === KEYWORD_STATUS.MINING,
    ).length,
    completed: Object.values(uiState.keywordStates).filter(
      (state) => state.status === KEYWORD_STATUS.COMPLETED,
    ).length,
    totalExtracted: uiState.allExtractedData.length,
  }

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            谷歌地图获客操控
          </Title>
          <Tag color="blue">水瓶批发关键词</Tag>
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Text type="secondary">总关键词: {stats.total}</Text>
        </Col>
        <Col span={6}>
          <Text type="warning">待挖掘: {stats.pending}</Text>
        </Col>
        <Col span={6}>
          <Text type="success">已完成: {stats.completed}</Text>
        </Col>
        <Col span={6}>
          <Text type="primary">已提取: {stats.totalExtracted}</Text>
        </Col>
      </Row>

      {/* 操控按钮 */}
      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col span={18}>
          <Button
            {...buttonConfig}
            size="large"
            block
            // loading={buttonConfig.type === 'primary'}
          />
        </Col>
        <Col span={6}>
          <Button
            type="default"
            size="large"
            block
            disabled={uiState.isMiningDisplay}
            onClick={resetAllStates}
            title="重置所有挖掘状态和数据"
          >
            重置
          </Button>
        </Col>
      </Row>

      {/* 调试按钮区域 */}
      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Button
            type="default"
            size="small"
            block
            disabled={uiState.isMiningDisplay || !uiState.selectedKeyword}
            onClick={handleDebugSearch}
            title="输入选中的关键词并执行搜索"
          >
            🔍 调试搜索
          </Button>
        </Col>
        <Col span={6}>
          <Button
            type="default"
            size="small"
            block
            onClick={handleDebugGetResults}
            title="获取当前页面的搜索结果并在控制台打印"
          >
            📋 获取结果
          </Button>
        </Col>
        <Col span={6}>
          <Button
            type="default"
            size="small"
            block
            onClick={handleDebugScrollLoad}
            title="滚动到底部加载更多结果"
          >
            📜 加载更多
          </Button>
        </Col>
        <Col span={6}>
          <Button
            type="default"
            size="small"
            block
            disabled={uiState.isMiningDisplay || !uiState.selectedKeyword}
            onClick={handleDebugProcessResults}
            title="逐个点击结果并提取详细信息"
          >
            ⚡ 处理结果
          </Button>
        </Col>
      </Row>

      {/* 关键词列表 */}
      <List
        size="small"
        dataSource={DEFAULT_KEYWORDS}
        renderItem={(keyword) => {
          const state = uiState.keywordStates[keyword] || { status: KEYWORD_STATUS.PENDING }
          const statusConfig = STATUS_CONFIG[state.status]
          const isSelected = uiState.selectedKeyword === keyword

          return (
            <List.Item
              style={{
                cursor: state.status === KEYWORD_STATUS.PENDING ? 'pointer' : 'default',
                backgroundColor: isSelected ? '#f0f2f5' : 'transparent',
                padding: '8px 12px',
                border: isSelected ? '1px solid #1890ff' : '1px solid transparent',
              }}
              onClick={() => {
                if (state.status === KEYWORD_STATUS.PENDING && !uiState.isMiningDisplay) {
                  handleKeywordSelect(keyword)
                }
              }}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
                  <Text
                    style={{
                      fontWeight: isSelected ? 'bold' : 'normal',
                      color: isSelected ? '#1890ff' : undefined,
                    }}
                  >
                    {keyword}
                  </Text>
                </Space>

                <Space>
                  {state.status === KEYWORD_STATUS.MINING && (
                    <LoadingOutlined style={{ color: '#1890ff' }} />
                  )}
                  {state.extractedCount > 0 && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {state.extractedCount} 条
                    </Text>
                  )}
                </Space>
              </Space>
            </List.Item>
          )
        }}
      />

      <Text type="secondary" style={{ fontSize: '12px', marginTop: 8, display: 'block' }}>
        💡
        点击&ldquo;待挖掘&rdquo;状态的关键词可填入搜索框，然后点击&ldquo;开始自动挖掘&rdquo;按钮开始处理
      </Text>
      <div ref={wrapperRef} style={{ position: 'relative' }}></div>
    </Card>
  )
}

GoogleMapsControl.propTypes = {
  selectedTask: PropTypes.object,
  onDataExtracted: PropTypes.func,
}

export default GoogleMapsControl
