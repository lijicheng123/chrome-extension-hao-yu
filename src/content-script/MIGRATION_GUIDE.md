# Content Script 架构迁移指南

## 迁移完成状态

✅ **当前状态**: 基础架构重构完成，核心功能正常运行

### 已完成的工作

1. **✅ 核心架构搭建**
   - LifecycleManager: 统一生命周期管理
   - EventManager: 事件监听器管理
   - ComponentManager: React组件管理

2. **✅ 功能模块重构**
   - SelectionToolsModule: 划词工具模块化 
   - SiteAdapterModule: 网站适配模块化

3. **✅ 入口文件精简**
   - 从 928 行缩减到约 100 行
   - 模块化导入和注册
   - 统一的初始化流程

### 当前可用功能

- ✅ 划词工具 (SelectionToolsModule)
- ✅ 网站适配 (SiteAdapterModule) 
- ✅ 事件管理 (EventManager)
- ✅ 组件管理 (ComponentManager)

### 待迁移功能

以下功能在旧版本中存在，需要逐步迁移到新架构：

- ⏳ 右键菜单功能 (ContextMenuModule)
- ⏳ 侧边栏功能 (SidebarModule)
- ⏳ 翻译功能 (TranslationModule)
- ⏳ 挖掘功能 (MiningModule)
- ⏳ 消息服务 (MessageService)

## 使用新架构

### 1. 文件结构
```
src/content-script/
├── index.jsx                    # 新的精简入口 (100行)
├── index-backup.jsx             # 原始文件备份 (928行)
├── config/modules.js            # 模块配置
├── core/                        # 核心管理器
├── modules/                     # 功能模块
└── services/                    # 服务层
```

### 2. 启用/禁用模块

在 `config/modules.js` 中配置：

```javascript
export const MODULE_CONFIG = {
  features: {
    selectionTools: true,    // 启用划词工具
    siteAdapter: true,       // 启用网站适配
    contextMenu: false,      // 禁用右键菜单
    // ...
  }
}
```

### 3. 调试和监控

在浏览器控制台中：

```javascript
// 获取应用实例
window.contentScriptApp

// 查看已注册的模块
window.contentScriptApp.lifecycleManager.modules

// 查看事件监听器
window.contentScriptApp.eventManager.getListenersInfo()

// 查看React组件
window.contentScriptApp.componentManager.getComponentsInfo()
```

## 回滚方案

如果需要回滚到原始版本：

1. 将 `index.jsx` 重命名为 `index-new.jsx`
2. 将 `index-backup.jsx` 重命名为 `index.jsx`
3. 重新构建项目

## 下一步开发

### 优先级1: 完善现有模块
1. 测试 SelectionToolsModule 的所有功能
2. 测试 SiteAdapterModule 的网站适配
3. 修复任何发现的问题

### 优先级2: 迁移其他功能
1. 实现 ContextMenuModule
2. 实现 SidebarModule  
3. 实现 TranslationModule
4. 实现 MiningModule
5. 实现 MessageService

### 优先级3: 性能优化
1. 模块按需加载
2. 事件防抖优化
3. 内存使用优化

## 技术要点

### 模块接口规范
每个模块都必须实现：
```javascript
class ModuleTemplate {
  async init(config) { /* 初始化 */ }
  async destroy() { /* 清理 */ }
  async onConfigChange(newConfig) { /* 配置变更 */ }
}
```

### 错误处理
- 模块初始化失败会自动回滚
- 错误会被隔离，不会影响其他模块
- 统一的错误日志记录

### 性能优势
- 统一的事件监听器管理，避免内存泄漏
- React组件的自动清理
- 模块化加载，减少初始化时间

## 验证清单

部署前请确认：

- [ ] 划词功能正常工作
- [ ] 网站适配功能正常工作  
- [ ] 无JavaScript错误
- [ ] 内存使用正常
- [ ] 各种网站兼容性测试
- [ ] 与原版功能对比测试

## 联系方式

如有问题，请检查：
1. 浏览器控制台错误信息
2. `window.contentScriptApp` 调试信息
3. 模块初始化日志 