# KeywordManager 通用关键词管理组件

## 概述

`KeywordManager` 是一个通用的关键词管理组件，从原来的 `GoogleMapsControl` 中提取出来，现在可以被多个搜索平台复用，包括：

- 谷歌地图搜索 (Google Maps)
- LinkedIn搜索
- Facebook搜索  
- Reddit搜索
- 谷歌搜索
- 等等...

## 主要特性

### 📋 关键词状态管理
- **待处理** (PENDING): 关键词尚未开始处理
- **处理中** (PROCESSING): 关键词正在处理中
- **已完成** (COMPLETED): 关键词处理完成

### 💾 持久化存储
- 支持将关键词状态存储到浏览器 `localStorage`
- 按任务ID和平台前缀分别存储
- 支持页面刷新后恢复状态

### 🎨 可定制界面
- 支持自定义标题和描述
- 支持自定义操作按钮
- 支持显示/隐藏统计信息和重置按钮
- 支持启用/禁用关键词选择功能

### 📊 统计信息
- 显示总关键词数量
- 显示各状态关键词数量
- 显示已处理的数据总数

## 使用方式

### 1. 配置关键词

首先在 `src/components/LeadsMining/config/keywords.js` 中配置你的平台关键词：

```javascript
// 新增平台关键词
export const YOUR_PLATFORM_KEYWORDS = [
  '关键词1',
  '关键词2',
  // ...
]

// 添加到平台配置中
export const PLATFORM_KEYWORDS = {
  yourPlatform: {
    name: '你的平台',
    keywords: YOUR_PLATFORM_KEYWORDS,
    description: '平台描述',
  },
  // ...
}
```

### 2. 创建平台控制器组件

参考 `LinkedInSearchControl.jsx` 创建你的平台控制器：

```jsx
import React, { useState, useCallback, useRef } from 'react'
import KeywordManager, { KEYWORD_STATUS } from './KeywordManager'
import { getPlatformConfig } from '../config/keywords'

// 获取平台配置
const PLATFORM_CONFIG = getPlatformConfig('yourPlatform')
const PLATFORM_KEYWORDS = PLATFORM_CONFIG.keywords

function YourPlatformControl({ selectedTask, onDataExtracted }) {
  const [selectedKeyword, setSelectedKeyword] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const keywordManagerRef = useRef(null)

  // 关键词选择处理
  const handleKeywordSelect = useCallback(async (keyword) => {
    setSelectedKeyword(keyword)
    // 实现你的平台特定逻辑
  }, [])

  // 关键词状态变化处理  
  const handleKeywordStatusChange = useCallback((keyword, status, keywordState) => {
    console.log(`关键词 "${keyword}" 状态变更为: ${status}`, keywordState)
  }, [])

  // 更新关键词状态的辅助方法
  const updateKeywordStatus = useCallback((keyword, status, additionalData = {}) => {
    if (keywordManagerRef.current) {
      keywordManagerRef.current.updateKeywordStatus(keyword, status, additionalData)
    }
  }, [])

  // 自定义操作按钮
  const customActions = (
    <Button onClick={startProcessing} disabled={isProcessing}>
      开始处理
    </Button>
  )

  return (
    <KeywordManager
      ref={keywordManagerRef}
      title={
        <Space>
          {PLATFORM_CONFIG.name}操控
          <Tag color="blue">{PLATFORM_CONFIG.description}</Tag>
        </Space>
      }
      keywords={PLATFORM_KEYWORDS}
      selectedTask={selectedTask}
      storagePrefix="yourPlatform"
      onKeywordSelect={handleKeywordSelect}
      onKeywordStatusChange={handleKeywordStatusChange}
      isProcessing={isProcessing}
      customActions={customActions}
      showResetButton={true}
    />
  )
}
```

### 3. 在主模块中使用

在 `LeadsMining/index.jsx` 中集成你的控制器：

```jsx
import YourPlatformControl from './components/YourPlatformControl'

// 页面检测
const isYourPlatform = () => {
  return window.location.hostname.includes('yourplatform.com')
}

// 在组件中使用
{isYourPlatform() && (
  <YourPlatformControl
    selectedTask={selectedTask}
    onDataExtracted={handleYourPlatformDataExtracted}
  />
)}
```

## API 文档

### KeywordManager Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string\|ReactNode` | `'关键词管理'` | 组件标题 |
| `keywords` | `string[]` | `[]` | 关键词数组 |
| `selectedTask` | `object` | - | 当前选中的任务对象 |
| `storagePrefix` | `string` | `'keyword_manager'` | 存储前缀，用于区分不同平台 |
| `onKeywordSelect` | `function` | - | 关键词选择回调 `(keyword) => void` |
| `onKeywordStatusChange` | `function` | - | 关键词状态变化回调 `(keyword, status, keywordState) => void` |
| `showStats` | `boolean` | `true` | 是否显示统计信息 |
| `showResetButton` | `boolean` | `true` | 是否显示重置按钮 |
| `isProcessing` | `boolean` | `false` | 是否正在处理中 |
| `customActions` | `ReactNode` | - | 自定义操作按钮区域 |
| `allowSelection` | `boolean` | `true` | 是否允许关键词选择 |

### 导出的常量

```javascript
// 关键词状态枚举
export const KEYWORD_STATUS = {
  PENDING: 'pending',      // 待处理
  PROCESSING: 'processing', // 处理中  
  COMPLETED: 'completed'    // 已完成
}

// 状态标签配置
export const STATUS_CONFIG = {
  [KEYWORD_STATUS.PENDING]: { color: 'default', text: '待处理' },
  [KEYWORD_STATUS.PROCESSING]: { color: 'processing', text: '处理中' },
  [KEYWORD_STATUS.COMPLETED]: { color: 'success', text: '已完成' },
}
```

### 导出的方法

KeywordManager通过ref暴露以下方法：

```javascript
// 通过ref调用KeywordManager的方法
const keywordManagerRef = useRef(null)

// 更新关键词状态
keywordManagerRef.current?.updateKeywordStatus(keyword, status, additionalData)

// 重置所有状态  
keywordManagerRef.current?.resetAllStates()

// 获取当前选中的关键词
const selectedKeyword = keywordManagerRef.current?.getSelectedKeyword()

// 获取所有关键词状态
const keywordStates = keywordManagerRef.current?.getKeywordStates()
```

## 存储结构

关键词状态存储在浏览器的 `localStorage` 中，结构如下：

```javascript
// 关键词状态存储键：{storagePrefix}_keywords_{taskId}
{
  "keyword1": {
    "status": "completed",
    "processedCount": 5,
    "lastUpdate": "2024-01-01T12:00:00.000Z"
  },
  "keyword2": {
    "status": "pending", 
    "processedCount": 0,
    "lastUpdate": null
  }
}

// 全局状态存储键：{storagePrefix}_globalState_{taskId}
{
  "selectedKeyword": "keyword1",
  "lastUpdate": "2024-01-01T12:00:00.000Z"
}
```

## 最佳实践

### 1. 合理的存储前缀
为不同平台使用不同的 `storagePrefix`，避免数据冲突：
- 谷歌地图: `"googleMaps"`
- LinkedIn: `"linkedinSearch"`  
- Facebook: `"facebookSearch"`

### 2. 状态更新
使用ref方式更新关键词状态：

```javascript
// 在你的平台控制器中
const keywordManagerRef = useRef(null)

const updateKeywordStatus = useCallback((keyword, status, additionalData = {}) => {
  if (keywordManagerRef.current) {
    keywordManagerRef.current.updateKeywordStatus(keyword, status, additionalData)
  }
}, [])

// 使用
updateKeywordStatus('关键词1', KEYWORD_STATUS.PROCESSING)
updateKeywordStatus('关键词1', KEYWORD_STATUS.COMPLETED, { processedCount: 10 })
```

### 3. 错误处理
在平台特定逻辑中添加适当的错误处理：

```javascript
try {
  updateKeywordStatus(keyword, KEYWORD_STATUS.PROCESSING)
  const results = await processKeyword(keyword)
  updateKeywordStatus(keyword, KEYWORD_STATUS.COMPLETED, { 
    processedCount: results.length 
  })
} catch (error) {
  console.error(`处理关键词失败:`, error)
  updateKeywordStatus(keyword, KEYWORD_STATUS.PENDING)
}
```

## 架构优势

### 🔄 可复用性
- 一个组件支持多个平台
- 统一的关键词管理逻辑
- 减少代码重复

### 🏗️ 高内聚低耦合  
- 关键词管理逻辑独立封装
- 平台特定逻辑分离
- 清晰的组件边界

### 📈 可扩展性
- 新增平台只需添加配置和控制器
- 不影响现有平台功能
- 支持功能定制

### 🔧 易维护性
- 集中的关键词配置管理
- 统一的状态管理模式
- 清晰的组件职责分工 