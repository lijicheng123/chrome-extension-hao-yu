# 谷歌地图自动化获客功能使用说明

## 功能概述

谷歌地图自动化获客功能是一个强大的客户线索挖掘工具，专门为水瓶批发业务场景设计。该功能能够自动化执行以下操作：

1. 自动搜索预定义的关键词
2. 逐一点击搜索结果
3. 自动提取商户联系信息
4. 保存数据到指定任务中

## 核心特性

### 🎯 智能关键词管理
- **预定义关键词列表**：包含10个精心挑选的水瓶批发相关关键词
- **状态管理**：每个关键词有三种状态（待挖掘、挖掘中、已挖掘）
- **断点续传**：支持从中断的位置继续挖掘
- **数据持久化**：状态和数据自动保存到 Chrome Storage

### 🤖 全自动化流程
- **一键启动**：点击"开始自动挖掘"即可开始
- **智能延迟**：内置1-2秒随机延迟，避免被检测为机器人
- **懒加载处理**：自动滚动页面加载更多搜索结果
- **容错机制**：遇到错误自动跳过，不影响整体进度

### 📊 实时进度监控
- **可视化进度条**：实时显示当前关键词处理进度
- **统计面板**：显示总关键词数、待挖掘数、已完成数、已提取数据量
- **详细日志**：控制台输出详细的操作日志

## 使用方法

### 1. 页面检测与显示
- 功能仅在谷歌地图页面自动显示
- 位置：在"总是展开"和"AI优先"开关下方

### 2. 手动操作模式
1. **选择关键词**：点击列表中"待挖掘"状态的关键词
2. **自动填入**：关键词会自动填入谷歌地图搜索框
3. **手动搜索**：用户需要手动点击搜索按钮
4. **开始挖掘**：点击"开始自动挖掘"按钮

### 3. 全自动模式
1. **选择起始关键词**：如未选择，从第一个待挖掘关键词开始
2. **一键启动**：点击"开始自动挖掘"按钮
3. **自动执行**：系统自动完成搜索→点击结果→提取数据的完整流程
4. **监控进度**：通过进度条和统计面板监控执行状态

### 4. 停止与恢复
- **随时停止**：点击"停止自动挖掘"按钮
- **状态保存**：中断的关键词状态重置为"待挖掘"
- **断点续传**：重新开始时从上次中断位置继续

## 预定义关键词列表

```javascript
[
  "water bottle wholesale new york",
  "bulk buy water bottles New York", 
  "custom water bottles NYC",
  "reusable water bottles supplier NY",
  "wholesale sports water bottles NYC",
  "eco-friendly water bottles New York",
  "insulated water bottle distributor NY",
  "glass water bottle wholesale NYC",
  "promotional water bottles New York",
  "hydration pack supplier NYC"
]
```

## 提取的数据字段

每个商户会提取以下信息：
- **商户名称**：作为联系人姓名
- **电话号码**：商户联系电话
- **网站地址**：官方网站
- **地址信息**：详细地址
- **Plus Code**：谷歌地图定位码
- **商户类别**：业务类型
- **评分信息**：星级评分
- **标签信息**：自动生成的分类标签

## 技术特点

### 🔧 元素定位策略
- 使用稳定的属性（`jstcache`、`tabindex`、`aria-label`）定位元素
- 避免依赖易变的CSS类名
- 多重选择器备用方案

### ⏱️ 智能延迟机制
```javascript
// 随机延迟函数
export const randomDelay = (min = 1000, max = 2000) => {
  const delay = getRandomDelay(min, max)
  return new Promise(resolve => setTimeout(resolve, delay))
}
```

### 💾 数据持久化 - 已优化
- **全状态存储**：所有关键状态（`isMining`、`selectedKeyword`、`currentProgress`等）都存储在Chrome Storage中
- **实时同步**：状态变更立即同步到storage，避免React state不稳定导致的问题
- **多层存储**：按任务ID分别存储关键词状态、全局状态和提取数据
- **断点续传**：支持从任意中断点恢复挖掘进程
- **状态验证**：挖掘过程中实时从storage验证状态，确保操作的一致性

#### Storage存储结构
```javascript
// 关键词状态存储
googleMaps_keywords_${taskId} = {
  "keyword1": {
    status: "pending|mining|completed",
    progress: 0-100,
    extractedCount: 0,
    lastUpdate: "2024-01-01T00:00:00.000Z"
  }
}

// 全局状态存储
googleMaps_globalState_${taskId} = {
  selectedKeyword: "current keyword",
  isMining: true|false,
  currentProgress: {...},
  lastUpdate: "2024-01-01T00:00:00.000Z"
}

// 提取数据存储
googleMaps_extractedData_${taskId} = [
  { name: "商户名", phone: "电话", ... }
]
```

### 🚫 容错处理
- 搜索失败自动跳过
- 元素定位失败跳过当前结果
- 网络错误重试机制
- **状态回滚**：操作失败时自动恢复到稳定状态

## 注意事项

### ⚠️ 使用限制
1. **仅限谷歌地图页面**：功能只在谷歌地图页面显示和工作
2. **需要登录**：必须先登录系统才能使用挖掘功能
3. **网络依赖**：需要稳定的网络连接
4. **浏览器要求**：需要支持Chrome扩展的浏览器

### 📝 最佳实践
1. **适度使用**：避免过于频繁的自动化操作
2. **监控进度**：定期检查挖掘进度和结果质量
3. **数据备份**：重要数据及时备份到服务器
4. **错误处理**：遇到问题及时停止并检查日志

### 🔄 故障排除
1. **搜索框找不到**：刷新页面重试
2. **结果不加载**：检查网络连接
3. **挖掘卡住**：点击停止后重新开始
4. **数据丢失**：检查Chrome Storage权限

## 开发扩展

### 🛠️ 自定义关键词
将来可通过修改 `DEFAULT_KEYWORDS` 数组自定义关键词：

```javascript
const DEFAULT_KEYWORDS = [
  // 添加你的关键词
  "your custom keyword 1",
  "your custom keyword 2"
]
```

### 🔌 集成其他平台
该架构也支持扩展到其他搜索平台：
- Google搜索结果页面
- LinkedIn搜索
- 其他B2B平台

### 📊 数据分析
提取的数据可用于：
- 客户画像分析
- 市场趋势研究
- 竞争对手分析
- 销售线索管理

---

**注意**：本功能仅用于合法的商业开发目的，请遵守相关法律法规和平台使用条款。 