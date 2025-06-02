import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react'
import { Card, List, Button, Tag, Space, Typography, Row, Col, message, Modal } from 'antd'
import { LoadingOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
import Browser from 'webextension-polyfill'

const { Text, Title } = Typography

// 关键词状态枚举
export const KEYWORD_STATUS = {
  PENDING: 'pending', // 待处理
  PROCESSING: 'processing', // 处理中
  COMPLETED: 'completed', // 已完成
}

// 状态标签配置
export const STATUS_CONFIG = {
  [KEYWORD_STATUS.PENDING]: { color: 'default', text: '待处理' },
  [KEYWORD_STATUS.PROCESSING]: { color: 'processing', text: '处理中' },
  [KEYWORD_STATUS.COMPLETED]: { color: 'success', text: '已完成' },
}

/**
 * 通用关键词管理组件
 * 支持多种搜索平台的关键词管理
 */
const KeywordManager = forwardRef(function KeywordManager(
  {
    title,
    keywords = [],
    selectedTask,
    storagePrefix = 'keyword_manager',
    onKeywordSelect,
    onKeywordStatusChange,
    showStats = true,
    showResetButton = true,
    isProcessing = false,
    customActions = null,
    allowSelection = true,
  },
  ref,
) {
  const [keywordStates, setKeywordStates] = useState({})
  const [selectedKeyword, setSelectedKeyword] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const listContainerRef = useRef(null)

  // 常量定义
  const COLLAPSED_VISIBLE_COUNT = 2 // 收起时显示的行数
  const SELECTED_CENTER_INDEX = 1 // 选中项在收起状态下的位置（从0开始，2表示第3行）

  // 获取storage存储键
  const getStorageKeys = useCallback(() => {
    const taskId = selectedTask?.id || 'default'
    return {
      keywordStates: `${storagePrefix}_keywords_${taskId}`,
      globalState: `${storagePrefix}_globalState_${taskId}`,
    }
  }, [selectedTask?.id, storagePrefix])

  // 从storage读取状态
  const loadStateFromStorage = useCallback(async () => {
    try {
      const storageKeys = getStorageKeys()
      const result = await Browser.storage.local.get([
        storageKeys.keywordStates,
        storageKeys.globalState,
      ])

      // 加载关键词状态
      const savedKeywordStates = result[storageKeys.keywordStates] || {}
      const initialKeywordStates = {}
      keywords.forEach((keyword) => {
        initialKeywordStates[keyword] = savedKeywordStates[keyword] || {
          status: KEYWORD_STATUS.PENDING,
          processedCount: 0,
          lastUpdate: null,
        }
      })

      // 加载全局状态
      const savedGlobalState = result[storageKeys.globalState] || {}
      const { selectedKeyword: savedSelectedKeyword = null } = savedGlobalState

      // 如果没有选中关键词，默认选中第一个未处理的
      const finalSelectedKeyword =
        savedSelectedKeyword ||
        keywords.find(
          (keyword) => initialKeywordStates[keyword].status === KEYWORD_STATUS.PENDING,
        ) ||
        null

      setKeywordStates(initialKeywordStates)
      setSelectedKeyword(finalSelectedKeyword)

      // 触发初始回调
      if (finalSelectedKeyword && onKeywordSelect) {
        onKeywordSelect(finalSelectedKeyword)
      }
    } catch (error) {
      console.error('从storage加载关键词状态失败:', error)
    }
  }, [getStorageKeys, keywords, onKeywordSelect])

  // 保存状态到storage
  const saveStateToStorage = useCallback(
    async (newKeywordStates, newSelectedKeyword) => {
      try {
        const storageKeys = getStorageKeys()
        const dataToSave = {}

        if (newKeywordStates) {
          dataToSave[storageKeys.keywordStates] = newKeywordStates
        }

        if (newSelectedKeyword !== undefined) {
          dataToSave[storageKeys.globalState] = {
            selectedKeyword: newSelectedKeyword,
            lastUpdate: new Date().toISOString(),
          }
        }

        await Browser.storage.local.set(dataToSave)
      } catch (error) {
        console.error('保存关键词状态到storage失败:', error)
      }
    },
    [getStorageKeys],
  )

  // 更新单个关键词状态
  const updateKeywordStatus = useCallback(
    async (keyword, status, additionalData = {}) => {
      const newKeywordStates = {
        ...keywordStates,
        [keyword]: {
          ...keywordStates[keyword],
          status,
          lastUpdate: new Date().toISOString(),
          ...additionalData,
        },
      }

      setKeywordStates(newKeywordStates)
      await saveStateToStorage(newKeywordStates)

      // 触发状态变化回调
      if (onKeywordStatusChange) {
        onKeywordStatusChange(keyword, status, newKeywordStates[keyword])
      }
    },
    [keywordStates, saveStateToStorage, onKeywordStatusChange],
  )

  // 计算在收起状态下需要显示的关键词范围
  const getCollapsedRange = useCallback(() => {
    if (!selectedKeyword || keywords.length <= COLLAPSED_VISIBLE_COUNT) {
      return { startIndex: 0, endIndex: Math.min(COLLAPSED_VISIBLE_COUNT, keywords.length) }
    }

    const selectedIndex = keywords.indexOf(selectedKeyword)
    const startIndex = Math.max(0, selectedIndex - SELECTED_CENTER_INDEX)
    const endIndex = Math.min(keywords.length, startIndex + COLLAPSED_VISIBLE_COUNT)

    // 如果末尾不够，调整开始位置
    const adjustedStartIndex = Math.max(0, endIndex - COLLAPSED_VISIBLE_COUNT)

    return {
      startIndex: adjustedStartIndex,
      endIndex,
    }
  }, [selectedKeyword, keywords])

  // 获取当前显示的关键词列表
  const getDisplayKeywords = useCallback(() => {
    if (isExpanded || keywords.length <= COLLAPSED_VISIBLE_COUNT) {
      return keywords
    }

    const { startIndex, endIndex } = getCollapsedRange()
    return keywords.slice(startIndex, endIndex)
  }, [isExpanded, keywords, getCollapsedRange])

  // 切换展开/收起状态
  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded)

    // 如果是收起操作，需要滚动到正确位置
    if (isExpanded) {
      setTimeout(() => {
        scrollToSelectedKeyword()
      }, 100)
    }
  }, [isExpanded])

  // 滚动到选中的关键词
  const scrollToSelectedKeyword = useCallback(() => {
    if (!selectedKeyword || !listContainerRef.current) return

    const { startIndex } = getCollapsedRange()
    const selectedIndex = keywords.indexOf(selectedKeyword)
    const relativeIndex = selectedIndex - startIndex

    // 计算目标滚动位置（让选中项在中间）
    const itemHeight = 40 // 估算的每行高度
    const targetScrollTop = (relativeIndex - SELECTED_CENTER_INDEX) * itemHeight

    listContainerRef.current.scrollTop = Math.max(0, targetScrollTop)
  }, [selectedKeyword, getCollapsedRange, keywords])

  // 处理关键词选择
  const handleKeywordSelect = useCallback(
    async (keyword) => {
      if (!allowSelection || isProcessing) return

      const keywordState = keywordStates[keyword]
      if (keywordState?.status !== KEYWORD_STATUS.PENDING) return

      setSelectedKeyword(keyword)
      await saveStateToStorage(null, keyword)

      // 如果在收起状态下选择了关键词，需要重新计算显示范围
      if (!isExpanded) {
        setTimeout(() => {
          scrollToSelectedKeyword()
        }, 100)
      }

      if (onKeywordSelect) {
        onKeywordSelect(keyword)
      }
    },
    [
      allowSelection,
      isProcessing,
      keywordStates,
      saveStateToStorage,
      onKeywordSelect,
      isExpanded,
      scrollToSelectedKeyword,
    ],
  )

  // 重置所有状态
  const resetAllStates = useCallback(async () => {
    Modal.confirm({
      title: '重置关键词状态',
      content: '确定要重置所有关键词状态吗？这将清除所有进度。',
      okText: '确定重置',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const initialKeywordStates = {}
          keywords.forEach((keyword) => {
            initialKeywordStates[keyword] = {
              status: KEYWORD_STATUS.PENDING,
              processedCount: 0,
              lastUpdate: null,
            }
          })

          const firstKeyword = keywords[0] || null
          setKeywordStates(initialKeywordStates)
          setSelectedKeyword(firstKeyword)

          await saveStateToStorage(initialKeywordStates, firstKeyword)

          if (firstKeyword && onKeywordSelect) {
            onKeywordSelect(firstKeyword)
          }

          message.success('所有关键词状态已重置！')
        } catch (error) {
          console.error('重置状态失败:', error)
          message.error('重置状态失败，请重试')
        }
      },
    })
  }, [keywords, saveStateToStorage, onKeywordSelect])

  // 暴露方法给父组件
  useImperativeHandle(
    ref,
    () => ({
      updateKeywordStatus,
      resetAllStates,
      getSelectedKeyword: () => selectedKeyword,
      getKeywordStates: () => keywordStates,
      setSelectedKeyword: (keyword) => {
        setSelectedKeyword(keyword)
        saveStateToStorage(null, keyword)
      },
      // 暴露存储相关方法
      getStorageKeys,
      saveToStorage: saveStateToStorage,
      loadFromStorage: loadStateFromStorage,
    }),
    [
      updateKeywordStatus,
      resetAllStates,
      selectedKeyword,
      keywordStates,
      getStorageKeys,
      saveStateToStorage,
      loadStateFromStorage,
    ],
  )

  // 组件挂载时从storage加载状态
  useEffect(() => {
    if (keywords.length > 0) {
      loadStateFromStorage()
    }
  }, [loadStateFromStorage, keywords.length])

  // 统计信息
  const stats = {
    total: keywords.length,
    pending: Object.values(keywordStates).filter((state) => state.status === KEYWORD_STATUS.PENDING)
      .length,
    processing: Object.values(keywordStates).filter(
      (state) => state.status === KEYWORD_STATUS.PROCESSING,
    ).length,
    completed: Object.values(keywordStates).filter(
      (state) => state.status === KEYWORD_STATUS.COMPLETED,
    ).length,
    totalProcessed: Object.values(keywordStates).reduce(
      (sum, state) => sum + (state.processedCount || 0),
      0,
    ),
  }

  // 检查是否需要显示折叠功能
  const shouldShowCollapse = keywords.length > COLLAPSED_VISIBLE_COUNT

  if (keywords.length === 0) {
    return (
      <Card title={title} size="small">
        <Text type="secondary">暂无关键词配置</Text>
      </Card>
    )
  }

  const displayKeywords = getDisplayKeywords()

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            {title || '关键词组合'}
          </Title>
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {/* 统计信息 */}
      {showStats && (
        <Row gutter={16} style={{ marginBottom: 16, fontSize: '12px !important' }}>
          <Col span={6}>
            <Text type="secondary">总数: {stats.total}</Text>
          </Col>
          <Col span={6}>
            <Text type="warning">待处理: {stats.pending}</Text>
          </Col>
          <Col span={6}>
            <Text type="success">已完成: {stats.completed}</Text>
          </Col>
          <Col span={6}>
            <Text type="primary">已挖掘: {stats.totalProcessed}</Text>
          </Col>
        </Row>
      )}

      {/* 自定义操作按钮 */}
      {customActions && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={18}>{customActions}</Col>
          {showResetButton && (
            <Col span={6}>
              <Button
                type="default"
                size="middle"
                style={{ fontSize: '12px' }}
                block
                disabled={isProcessing}
                onClick={resetAllStates}
                title="重置所有关键词状态"
              >
                重置
              </Button>
            </Col>
          )}
        </Row>
      )}

      {/* 只有重置按钮的情况 */}
      {!customActions && showResetButton && (
        <Row style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Button
              type="default"
              size="large"
              block
              disabled={isProcessing}
              onClick={resetAllStates}
              title="重置所有关键词状态"
            >
              重置关键词状态
            </Button>
          </Col>
        </Row>
      )}

      {/* 关键词列表容器 */}
      <div style={{ position: 'relative' }}>
        {/* 渐变遮罩 */}
        {!isExpanded && shouldShowCollapse && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '40px',
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), transparent)',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: shouldShowCollapse ? '40px' : 0,
                left: 0,
                right: 0,
                height: '40px',
                background: 'linear-gradient(to top, rgba(255,255,255,0.9), transparent)',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
          </>
        )}

        {/* 关键词列表 */}
        <div
          ref={listContainerRef}
          style={{
            maxHeight: isExpanded ? 'none' : `${COLLAPSED_VISIBLE_COUNT * 40}px`,
            overflow: isExpanded ? 'visible' : 'hidden',
            transition: 'max-height 0.3s ease-in-out',
          }}
        >
          <List
            size="small"
            dataSource={displayKeywords}
            renderItem={(keyword) => {
              const state = keywordStates[keyword] || { status: KEYWORD_STATUS.PENDING }
              const statusConfig = STATUS_CONFIG[state.status]
              const isSelected = selectedKeyword === keyword
              const canSelect =
                allowSelection && state.status === KEYWORD_STATUS.PENDING && !isProcessing

              return (
                <List.Item
                  style={{
                    cursor: canSelect ? 'pointer' : 'default',
                    backgroundColor: isSelected ? '#f0f2f5' : 'transparent',
                    padding: '8px 12px',
                    border: '1px solid transparent',
                    boxShadow: isSelected ? '0px 0px 2px 0px #1890ff' : 'none',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onClick={() => {
                    if (canSelect) {
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
                      {state.status === KEYWORD_STATUS.PROCESSING && (
                        <LoadingOutlined style={{ color: '#1890ff' }} />
                      )}
                      {state.processedCount > 0 && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {state.processedCount} 条
                        </Text>
                      )}
                    </Space>
                  </Space>
                </List.Item>
              )
            }}
          />
        </div>

        {/* 展开/收起按钮 */}
        {shouldShowCollapse && (
          <div
            style={{
              textAlign: 'center',
              padding: '8px 0',
              borderTop: '1px solid #f0f0f0',
              backgroundColor: '#fff',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onClick={toggleExpanded}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f5f5f5'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#fff'
            }}
          >
            {isExpanded ? (
              <Space>
                <UpOutlined style={{ fontSize: '12px', color: '#666' }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  收起
                </Text>
              </Space>
            ) : (
              <Space>
                <DownOutlined style={{ fontSize: '12px', color: '#666' }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  展开更多 ({keywords.length - COLLAPSED_VISIBLE_COUNT} 个)
                </Text>
              </Space>
            )}
          </div>
        )}
      </div>

      {/* {allowSelection && (
        <Text type="secondary" style={{ fontSize: '12px', marginTop: 8, display: 'block' }}>
          💡 点击&ldquo;待处理&rdquo;状态的关键词可选中使用
        </Text>
      )} */}
    </Card>
  )
})

KeywordManager.propTypes = {
  title: PropTypes.node,
  keywords: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedTask: PropTypes.object,
  storagePrefix: PropTypes.string,
  onKeywordSelect: PropTypes.func,
  onKeywordStatusChange: PropTypes.func,
  showStats: PropTypes.bool,
  showResetButton: PropTypes.bool,
  isProcessing: PropTypes.bool,
  customActions: PropTypes.node,
  allowSelection: PropTypes.bool,
}

export default KeywordManager
