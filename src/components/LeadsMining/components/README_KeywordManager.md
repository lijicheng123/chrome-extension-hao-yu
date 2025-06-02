# KeywordManager 组件

KeywordManager 是一个通用的关键词管理组件，支持多平台的关键词处理、状态追踪和操作管理。

## 主要功能

- 关键词列表展示
- 关键词状态管理（待处理、处理中、已完成）
- 进度追踪
- 持久化存储
- 自定义操作按钮支持

## 基本用法

### 1. 配置关键词

首先在 `src/utils/keywords.js` 中配置你的平台关键词和生成策略：

```javascript
// 定义平台特定的关键词生成逻辑
export const generateYourPlatformKeywords = (task) => {
  const baseKeywords = parseKeywords(task.keywords)
  const extraKeywords = parseKeywords(task.extra_keywords)
  
  // 根据平台特点组装关键词
  // ... 自定义逻辑
  
  return keywords
}
```

### 2. 在组件中使用

```jsx
import { getTaskKeywords, getPlatformConfig } from '../../../utils/keywords'

function YourPlatformControl({ selectedTask, onDataExtracted }) {
  const [selectedKeyword, setSelectedKeyword] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const keywordManagerRef = useRef(null)

  // 从任务动态获取关键词
  const keywords = getTaskKeywords(selectedTask)

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

  const PLATFORM_CONFIG = getPlatformConfig('yourPlatform')

  return (
    <KeywordManager
      ref={keywordManagerRef}
      title={
        <Space>
          {PLATFORM_CONFIG.name}操控
          <Tag color="blue">{PLATFORM_CONFIG.description}</Tag>
        </Space>
      }
      keywords={keywords}
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
import { isYourPlatform } from '../../utils/platformDetector'

// 在组件中使用
const isYourPlatformPage = isYourPlatform()

// 在render中
{isYourPlatformPage && (
  <YourPlatformControl
    selectedTask={selectedTask}
    onDataExtracted={handleYourPlatformDataExtracted}
  />
)}
```

## API 参考

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| title | React.ReactNode | - | 组件标题 |
| keywords | Array<string> | [] | 关键词列表 |
| selectedTask | Object | null | 选中的任务 |
| storagePrefix | string | 'keyword' | 存储前缀 |
| onKeywordSelect | Function | - | 关键词选择回调 |
| onKeywordStatusChange | Function | - | 关键词状态变化回调 |
| isProcessing | boolean | false | 是否正在处理 |
| customActions | React.ReactNode | - | 自定义操作按钮 |
| showResetButton | boolean | true | 是否显示重置按钮 |

### 关键词状态

```javascript
export const KEYWORD_STATUS = {
  PENDING: 'pending',      // 待处理
  PROCESSING: 'processing', // 处理中
  COMPLETED: 'completed'   // 已完成
}
```

### Ref 方法

| 方法 | 参数 | 说明 |
|------|------|------|
| updateKeywordStatus | (keyword, status, data) | 更新关键词状态 |
| resetAllKeywords | () | 重置所有关键词状态 |
| getKeywordState | (keyword) | 获取关键词状态 |

## 使用场景

1. **Google Maps 搜索控制** - 处理地理位置相关搜索
2. **LinkedIn 搜索控制** - 处理职业社交网络搜索  
3. **Reddit 社区搜索** - 处理社区内容搜索
4. **Facebook/Instagram 搜索** - 处理社交媒体搜索

## 最佳实践

1. **状态持久化** - 利用 storage 功能保存处理进度
2. **错误处理** - 在关键词处理失败时适当回退状态
3. **用户反馈** - 使用状态指示器提供清晰的进度反馈
4. **性能优化** - 合理控制并发处理的关键词数量

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