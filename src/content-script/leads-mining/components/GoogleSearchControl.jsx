import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import { Tag, Space } from 'antd'
import PropTypes from 'prop-types'
import KeywordManager, { KEYWORD_STATUS } from './KeywordManager'
import googleSearchAdapter from '../adapters/googleSearchAdapter'
import { API_CONFIG } from '../../../constants/api'

/**
 * 谷歌搜索获客操控面板 - 关键词组合控制（简化版）
 * 功能：关键词组合生成、选择、输入搜索框
 */
function GoogleSearchControl({ selectedTask }) {
  const keywordManagerRef = useRef(null)
  const wrapperRef = useRef(null)
  const processingRef = useRef(false) // 防重复执行
  const cachedKeywordsRef = useRef([])

  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.style.zIndex = 2147483647
    }
  }, [])

  const keywords = useMemo(() => {
    const newKeywords = googleSearchAdapter.getKeywords(selectedTask)

    // 深度比较，如果内容相同则返回缓存的数组引用
    const currentCached = cachedKeywordsRef.current
    if (
      currentCached.length === newKeywords.length &&
      currentCached.every((keyword, index) => keyword === newKeywords[index])
    ) {
      return currentCached
    }

    // 内容有变化才更新缓存
    cachedKeywordsRef.current = newKeywords
    return newKeywords
  }, [selectedTask?.id])

  const handleKeywordSelect = useCallback(async (keyword) => {
    // 防重复执行
    if (processingRef.current) {
      console.log('GoogleSearchControl: 防重复执行，跳过关键词:', keyword)
      return
    }

    try {
      processingRef.current = true
      console.log('GoogleSearchControl: 开始处理关键词:', keyword)

      await googleSearchAdapter.clearSearchInput()
      const success = await googleSearchAdapter.inputKeyword(keyword)
      if (success) {
        // 将关键词标记为已使用
        if (keywordManagerRef.current) {
          keywordManagerRef.current.updateKeywordStatus(keyword, KEYWORD_STATUS.COMPLETED)
        }
      }
    } catch (error) {
      console.error('填入关键词失败:', error)
    } finally {
      processingRef.current = false
    }
  }, [])

  const handleKeywordStatusChange = useCallback(() => {
    // 状态变化处理（静默）
  }, [])

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
              <Tag color="orange" style={{ fontWeight: 'normal', fontSize: 12 }}>
                {googleSearchAdapter.displayName}
              </Tag>
            </Space>
          </Space>
        }
        keywords={keywords}
        selectedTask={selectedTask}
        storagePrefix={googleSearchAdapter.platformId}
        onKeywordSelect={handleKeywordSelect}
        onKeywordStatusChange={handleKeywordStatusChange}
        isProcessing={false}
        customActions={null}
        showResetButton={true}
        allowSelection={true}
      />
      <div ref={wrapperRef} style={{ position: 'relative' }}></div>
    </>
  )
}

GoogleSearchControl.propTypes = {
  selectedTask: PropTypes.object,
}

export default GoogleSearchControl
