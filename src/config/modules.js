/**
 * 模块配置
 * 控制哪些模块启用，便于逐步迁移
 */
export const MODULE_CONFIG = {
  // 核心模块（必须启用）
  core: {
    eventManager: true,
    componentManager: true,
  },

  // 功能模块（可选启用）
  features: {
    selectionTools: true,    // 划词工具
    siteAdapter: true,       // 网站适配
    contextMenu: true,      // 右键菜单
    sidebar: true,          // 侧边栏
    translation: true,      // 翻译
    mining: true,           // 挖掘
  },

  // 服务模块（可选启用）
  services: {
    messageService: false,   // 消息服务（开发中）
  }
}

/**
 * 检查模块是否启用
 * @param {string} category - 模块类别 (core|features|services)
 * @param {string} moduleName - 模块名称
 * @returns {boolean} 是否启用
 */
export function isModuleEnabled(category, moduleName) {
  return MODULE_CONFIG[category]?.[moduleName] ?? false
} 