# 消息通信架构变更日志

## 2023-xx-xx: 初始版本 - 统一封装消息通信

### 新增

1. **核心消息服务**
   - 创建 `/src/services/messaging/index.js` 提供基础消息通信框架
   - 实现 `MessagingService` 类，支持命名空间、Promise化通信、错误处理等功能

2. **LeadsMining模块服务**
   - 创建 `/src/services/messaging/leadsMining.js` 封装LeadsMining模块的通信
   - 定义 `LEADS_MINING_API` 常量，规范消息类型
   - 实现 `LeadsMiningContentAPI` 和 `LeadsMiningBackgroundAPI` 类，分别封装content script和background的通信需求

### 更新

1. **Background脚本**
   - 修改 `/src/background/leadsMiningManager.mjs`，使用新的消息处理API
   - 保留对旧消息格式的向后兼容支持
   - 添加新的处理函数 `handlePauseTask`, `handleResumeTask`, `handleCompleteTask`
   - 优化现有处理函数，添加错误处理和返回值

2. **Content Script**
   - 修改 `/src/components/LeadsMining/hooks/useBackgroundState.js`，使用新的通信API
   - 移除旧的通信代码和回调处理
   - 优化错误处理

3. **初始化流程**
   - 更新 `/src/background/index.mjs`，确保消息服务在其他初始化之前加载

### 文档

1. 添加 `/src/services/messaging/README.md`，详细说明架构设计和使用方法
2. 添加本变更日志文件，记录重要更改

### 优势

1. **设计原则遵循**
   - 高内聚低耦合：将通信逻辑封装在专门的服务中
   - 开闭原则：新增功能通过扩展而非修改实现
   - 单一职责：每个组件专注于自己的任务

2. **代码质量提升**
   - 减少重复代码
   - 统一错误处理
   - 提高可测试性
   - 增强类型安全

3. **兼容性**
   - 保留对旧版通信方式的支持，确保平滑过渡 