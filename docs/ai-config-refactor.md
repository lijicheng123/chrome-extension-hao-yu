# AI配置重构文档

## 重构背景

原先沉浸式翻译和线索挖掘共用豆包API接口，但两者的需求不同：
- **线索挖掘**：需要AI返回JSON数组格式，所以在prompt中添加了`{ role: 'assistant', content: '[' }`
- **沉浸式翻译**：只需要纯文本翻译结果，不需要数组格式

原来的实现通过字符串匹配来判断请求类型，存在以下问题：
- 不够灵活，难以扩展
- 耦合度高，修改困难
- 无法支持复杂的参数配置

## 重构方案

### 1. 扩展Session结构

在`src/services/init-session.mjs`中添加了`aiConfig`参数：

```javascript
// AI配置参数
aiConfig: aiConfig || {
  responseFormat: 'text', // 'text' | 'json_array' | 'json_object'
  temperature: 0.7,
  top_k: 0.9,
  top_p: 0.9,
  stream: true,
  assistantPrefix: null, // 助手回复前缀，如 '[' 用于JSON数组
}
```

### 2. 修改豆包API实现

在`src/services/apis/doubao-api.mjs`中：

#### 非流式API
```javascript
// 使用aiConfig配置来决定是否添加助手前缀
const aiConfig = session.aiConfig || {}
if (aiConfig.assistantPrefix) {
  prompt.push({ role: 'assistant', content: aiConfig.assistantPrefix })
}

// 构建请求体，使用aiConfig中的参数
const requestBody = {
  provider_id: 1,
  model: 'doubao-1-5-lite-32k-250115',
  messages: prompt,
  temperature: aiConfig.temperature || 0.7,
  top_k: aiConfig.top_k || 0.9,
  top_p: aiConfig.top_p || 0.9,
}

// 根据responseFormat配置来处理回答
const responseFormat = aiConfig.responseFormat || 'text'
const rawContent = responseData?.choices?.[0]?.message?.content || ''

if (responseFormat === 'json_array' && aiConfig.assistantPrefix) {
  answer = `${aiConfig.assistantPrefix}${rawContent}`
} else {
  answer = rawContent
}
```

#### 流式API
同样支持aiConfig配置，包括助手前缀和AI参数。

#### 主入口函数
```javascript
// 优先使用session.aiConfig.stream，其次使用options.stream
const useStream = session.aiConfig?.stream !== undefined 
  ? session.aiConfig.stream 
  : (options.stream !== undefined ? options.stream : true)
```

### 3. 更新调用方

#### 线索挖掘配置
```javascript
const session = initSession({
  question: prompt + "\n\n网页信息：\n" + JSON.stringify(pageInfo, null, 2),
  conversationRecords: [],
  modelName: 'doubao-1-5-lite-32k-250115',
  aiConfig: {
    responseFormat: 'json_array', // 指定返回JSON数组格式
    temperature: 0.01, // 低温度确保结果稳定
    top_k: 0.9,
    top_p: 0.9,
    stream: false, // 使用非流式响应
    assistantPrefix: '[', // 添加数组前缀引导AI返回数组
  }
})
```

#### 沉浸式翻译配置
```javascript
const session = {
  question: prompt,
  conversationRecords: [],
  modelName: 'doubao-1-5-lite-32k-250115',
  aiConfig: {
    responseFormat: 'text', // 指定返回纯文本格式
    temperature: 0.1, // 较低的温度确保翻译一致性
    top_k: 0.9,
    top_p: 0.9,
    stream: false, // 非流式响应
    assistantPrefix: null, // 不添加前缀，直接返回翻译文本
  },
  apiMode: null
}
```

## 重构优势

### 1. 配置驱动
- ✅ 通过配置参数区分不同使用场景，而非字符串匹配
- ✅ 支持灵活的AI参数配置（temperature、top_k、top_p等）
- ✅ 支持不同的响应格式（text、json_array、json_object）

### 2. 高度可扩展
- ✅ 易于添加新的响应格式
- ✅ 可以轻松添加新的AI参数
- ✅ 支持自定义助手前缀，适应不同的输出需求

### 3. 低耦合高内聚
- ✅ 符合开放封闭原则，对扩展开放，对修改封闭
- ✅ 各模块职责清晰，易于维护
- ✅ 配置与实现分离

### 4. 向后兼容
- ✅ 保持原有API接口不变
- ✅ 默认配置确保现有功能正常工作
- ✅ 渐进式升级，不影响现有代码

## 使用示例

### 基础文本生成
```javascript
const session = initSession({
  question: '请介绍一下人工智能',
  modelName: 'doubao-1-5-lite-32k-250115',
  aiConfig: {
    responseFormat: 'text',
    temperature: 0.7,
    stream: true,
  }
})
```

### JSON数组生成
```javascript
const session = initSession({
  question: '请列出三个编程语言',
  modelName: 'doubao-1-5-lite-32k-250115',
  aiConfig: {
    responseFormat: 'json_array',
    temperature: 0.1,
    stream: false,
    assistantPrefix: '[',
  }
})
```

### JSON对象生成
```javascript
const session = initSession({
  question: '请生成用户信息',
  modelName: 'doubao-1-5-lite-32k-250115',
  aiConfig: {
    responseFormat: 'json_object',
    temperature: 0.3,
    stream: false,
    assistantPrefix: '{"result":',
  }
})
```

### 高创意度生成
```javascript
const session = initSession({
  question: '写一首诗',
  modelName: 'doubao-1-5-lite-32k-250115',
  aiConfig: {
    responseFormat: 'text',
    temperature: 0.9,
    top_p: 0.95,
    stream: true,
  }
})
```

## 未来扩展

这个配置方案为未来扩展提供了良好的基础：

1. **新的响应格式**：可以轻松添加如`xml`、`markdown`等格式
2. **更多AI参数**：可以添加`max_tokens`、`frequency_penalty`等参数
3. **模型特定配置**：可以为不同模型添加特定的配置选项
4. **预设配置模板**：可以创建常用场景的配置模板

## 总结

这次重构将原来基于字符串匹配的硬编码逻辑，改为基于配置参数的灵活方案。不仅解决了沉浸式翻译和线索挖掘的冲突问题，还为未来的功能扩展奠定了良好的基础。新方案符合软件设计的最佳实践，提高了代码的可维护性和可扩展性。 