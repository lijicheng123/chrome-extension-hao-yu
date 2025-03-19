# 消息通信服务

## 设计概述

这个消息通信服务是为Chrome扩展提供的一个统一的、高内聚低耦合的消息通信框架。主要解决以下问题：

1. **高内聚低耦合**：将消息通信逻辑与业务逻辑分离，使各模块专注于自己的职责
2. **开闭原则**：通过接口扩展而非修改原有代码添加新功能
3. **命名空间隔离**：不同功能模块的消息通过命名空间隔离，避免冲突
4. **统一错误处理**：提供标准化的错误处理流程
5. **类型安全**：通过常量定义消息类型，避免硬编码和拼写错误

## 架构组件

### 1. 核心通信服务 (MessagingService)

位于`/src/services/messaging/index.js`，提供基础的消息发送、接收和处理框架。主要特性：

- 支持消息命名空间隔离
- Promise化的消息通信
- 统一的错误处理
- 一致的消息格式

### 2. 功能模块通信服务

如`/src/services/messaging/leadsMining.js`，基于核心服务封装特定模块的通信需求：

- 定义模块专用的消息类型常量
- 提供面向业务的API封装
- 分离Content Script和Background Script的API

## 使用方法

### 创建新的功能模块通信服务

1. 基于核心服务创建专用实例：

```js
import { MessagingService } from './index'

// 创建指定命名空间的服务实例
const myFeatureService = new MessagingService('MY_FEATURE')

export default myFeatureService
```

2. 定义消息类型常量：

```js
export const MY_FEATURE_API = {
  ACTION_ONE: 'ACTION_ONE',
  ACTION_TWO: 'ACTION_TWO',
  // ...
}
```

3. 封装Content Script API：

```js
export class MyFeatureContentAPI {
  static async actionOne(param) {
    return myFeatureService.sendMessage(MY_FEATURE_API.ACTION_ONE, { param })
  }
  
  // ...
}
```

4. 封装Background API：

```js
export class MyFeatureBackgroundAPI {
  static async notifyEvent(tabId, data) {
    return myFeatureService.sendMessageToTab(tabId, MY_FEATURE_API.EVENT, data)
  }
  
  // ...
}
```

### 在Background Script中注册处理器

```js
import myFeatureService, { MY_FEATURE_API } from '../services/messaging/myFeature'

function initMyFeature() {
  myFeatureService.registerHandlers({
    [MY_FEATURE_API.ACTION_ONE]: (data, sender) => {
      // 处理ACTION_ONE请求
      return { result: 'success' }
    },
    
    // ...其他处理器
  })
}
```

### 在Content Script中使用API

```js
import { MyFeatureContentAPI } from '../services/messaging/myFeature'

async function doSomething() {
  try {
    const result = await MyFeatureContentAPI.actionOne('test')
    // 处理结果
  } catch (error) {
    // 处理错误
  }
}
```

## 优势

1. **松耦合**：业务逻辑与通信逻辑分离
2. **可测试性**：可以轻松模拟消息通信，便于单元测试
3. **类型安全**：通过常量避免硬编码消息类型字符串
4. **可扩展性**：添加新消息类型不需要修改核心通信逻辑
5. **可维护性**：统一的错误处理和消息格式便于调试和维护
6. **向前兼容**：保留了对旧版通信方式的支持 