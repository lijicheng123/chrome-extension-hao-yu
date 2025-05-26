// UI配置文件 - 统一管理所有UI相关的配置
// 包括z-index、主题、样式等配置

/**
 * 高优先级z-index配置
 * 用于确保扩展的UI组件始终显示在页面内容之上
 */
export const HIGH_Z_INDEX_CONFIG = {
  theme: {
    components: {
      Select: {
        zIndexPopup: 2147483647,
      },
      Tooltip: {
        zIndexPopup: 2147483647,
      },
      Dropdown: {
        zIndexPopup: 2147483647,
      },
      Modal: {
        zIndexPopup: 2147483647,
      },
      Drawer: {
        zIndexPopup: 2147483647,
      },
      Popover: {
        zIndexPopup: 2147483647,
      },
      Popconfirm: {
        zIndexPopup: 2147483647,
      },
      DatePicker: {
        zIndexPopup: 2147483647,
      },
      TimePicker: {
        zIndexPopup: 2147483647,
      },
      Cascader: {
        zIndexPopup: 2147483647,
      },
      TreeSelect: {
        zIndexPopup: 2147483647,
      },
      AutoComplete: {
        zIndexPopup: 2147483647,
      },
      ColorPicker: {
        zIndexPopup: 2147483647,
      },
      Tour: {
        zIndexPopup: 2147483647,
      },
      FloatButton: {
        zIndexPopup: 2147483647,
      },
    },
  },
}

/**
 * 最高z-index值
 * 用于需要最高优先级显示的元素
 */
export const MAX_Z_INDEX = 2147483647

/**
 * 常用z-index层级
 */
export const Z_INDEX_LEVELS = {
  // 基础层级
  BASE: 1000,
  // 悬浮元素
  FLOATING: 1100,
  // 下拉菜单
  DROPDOWN: 1200,
  // 模态框
  MODAL: 1300,
  // 提示信息
  TOOLTIP: 1400,
  // 最高优先级（扩展专用）
  EXTENSION_MAX: MAX_Z_INDEX,
}

/**
 * 扩展专用样式类名前缀
 */
export const EXTENSION_CLASS_PREFIX = 'haoyu'

/**
 * 通用UI配置
 */
export const UI_CONFIG = {
  // 动画持续时间
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },

  // 断点配置
  BREAKPOINTS: {
    MOBILE: 480,
    TABLET: 768,
    DESKTOP: 1024,
    LARGE: 1200,
  },

  // 颜色配置
  COLORS: {
    PRIMARY: '#1890ff',
    SUCCESS: '#52c41a',
    WARNING: '#faad14',
    ERROR: '#ff4d4f',
    INFO: '#1890ff',
    TEXT: '#333',
    TEXT_SECONDARY: '#666',
    TEXT_DISABLED: '#999',
    BORDER: '#d9d9d9',
    BACKGROUND: '#fff',
    BACKGROUND_SECONDARY: '#f5f5f5',
  },

  // 间距配置
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
  },

  // 圆角配置
  BORDER_RADIUS: {
    SM: 2,
    MD: 4,
    LG: 6,
    XL: 8,
    ROUND: 50,
  },
}

/**
 * 获取带前缀的CSS类名
 * @param {string} className - 类名
 * @returns {string} 带前缀的类名
 */
export function getExtensionClassName(className) {
  return `${EXTENSION_CLASS_PREFIX}-${className}`
}

/**
 * 获取高z-index的内联样式
 * @param {number} level - z-index层级，默认使用最高级
 * @returns {object} 样式对象
 */
export function getHighZIndexStyle(level = MAX_Z_INDEX) {
  return {
    zIndex: level,
    position: 'fixed',
  }
}

/**
 * 创建扩展专用的容器样式
 * @param {object} additionalStyles - 额外的样式
 * @returns {object} 完整的容器样式
 */
export function createExtensionContainerStyle(additionalStyles = {}) {
  return {
    position: 'fixed',
    zIndex: MAX_Z_INDEX,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    lineHeight: 1.5,
    color: UI_CONFIG.COLORS.TEXT,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND,
    border: `1px solid ${UI_CONFIG.COLORS.BORDER}`,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    ...additionalStyles,
  }
}

/**
 * CSS变量定义
 * 用于在SCSS文件中使用统一的配置值
 */
export const CSS_VARIABLES = `
:root {
  --haoyu-max-z-index: ${MAX_Z_INDEX};
  --haoyu-primary-color: ${UI_CONFIG.COLORS.PRIMARY};
  --haoyu-success-color: ${UI_CONFIG.COLORS.SUCCESS};
  --haoyu-warning-color: ${UI_CONFIG.COLORS.WARNING};
  --haoyu-error-color: ${UI_CONFIG.COLORS.ERROR};
  --haoyu-text-color: ${UI_CONFIG.COLORS.TEXT};
  --haoyu-text-secondary: ${UI_CONFIG.COLORS.TEXT_SECONDARY};
  --haoyu-border-color: ${UI_CONFIG.COLORS.BORDER};
  --haoyu-background-color: ${UI_CONFIG.COLORS.BACKGROUND};
  --haoyu-spacing-xs: ${UI_CONFIG.SPACING.XS}px;
  --haoyu-spacing-sm: ${UI_CONFIG.SPACING.SM}px;
  --haoyu-spacing-md: ${UI_CONFIG.SPACING.MD}px;
  --haoyu-spacing-lg: ${UI_CONFIG.SPACING.LG}px;
  --haoyu-spacing-xl: ${UI_CONFIG.SPACING.XL}px;
  --haoyu-border-radius-sm: ${UI_CONFIG.BORDER_RADIUS.SM}px;
  --haoyu-border-radius-md: ${UI_CONFIG.BORDER_RADIUS.MD}px;
  --haoyu-border-radius-lg: ${UI_CONFIG.BORDER_RADIUS.LG}px;
}
`

/**
 * 注入CSS变量到页面
 */
export function injectCSSVariables() {
  const existingStyle = document.getElementById('haoyu-css-variables')
  if (existingStyle) return

  const style = document.createElement('style')
  style.id = 'haoyu-css-variables'
  style.textContent = CSS_VARIABLES
  document.head.appendChild(style)
}
