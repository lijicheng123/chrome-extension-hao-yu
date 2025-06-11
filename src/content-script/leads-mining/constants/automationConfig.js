/**
 * Google搜索自动化配置常量
 */

// 自动化配置参数
export const AUTOMATION_CONFIG = {
  SERP_LINK_TIMEOUT: 30000,         // SERP链接超时时间(ms)
  LANDING_PAGE_TIMEOUT: 20000,      // LandingPage超时时间(ms)
  PAGE_TIMEOUT: 20000,              // 页面超时时间(ms)
  MAX_PAGES_PER_KEYWORD: 20,        // 单关键词最大翻页数
  SCROLL_DELAY: 1000,               // 滚动延迟时间(ms)
  EXTRACT_DELAY: 2000,              // 提取延迟时间(ms)
  CLICK_DELAY: 2000,                // 点击延迟时间(ms)
  SEARCH_DELAY: 2000,               // 搜索后等待时间(ms)
  CAPTCHA_CHECK_INTERVAL: 3000,     // 验证码检测间隔（毫秒）
}

// 自动化状态枚举
export const AUTOMATION_STATUS = {
  IDLE: 'idle',                     // 空闲状态
  PROCESSING: 'processing',         // 处理中
  PAUSED: 'paused',                // 暂停状态
  COMPLETED: 'completed'           // 完成状态
}

// 事件类型
export const EVENT_TYPES = {
  USER_START: "user_start",
  USER_PAUSE: "user_pause", 
  USER_RESUME: "user_resume",
  USER_STOP: "user_stop",
  SERP_READY: "serp_ready",
  LANDING_PROCESSED: "landing_processed",
  LANDING_TIMEOUT: "landing_timeout"
}

// 动作类型
export const ACTION_TYPES = {
  SEARCH_KEYWORD: "search_keyword",
  PROCESS_SERP: "process_serp",
  OPEN_NEXT_LINK: "open_next_link",
  GO_NEXT_PAGE: "go_next_page",
  SWITCH_KEYWORD: "switch_keyword",
  PAUSE_AUTOMATION: "pause_automation",
  RESUME_AUTOMATION: "resume_automation",
  STOP_AUTOMATION: "stop_automation",
  WAIT_CAPTCHA: "wait_captcha",
  SHOW_RESULTS: "show_results",
  CLEANUP: "cleanup"
}

// 页面深度层级定义
export const PAGE_DEPTH = {
  SERP: 1,           // Search Engine Results Page (搜索结果页)
  LANDING_PAGE: 2,   // 从SERP点击进入的目标页面
  LEVEL_3: 3,        // 从Landing Page进入的页面
  LEVEL_4: 4,        // 第四层页面
  LEVEL_5: 5         // 最大深度层级
}

// 页面标记Action枚举
export const PAGE_MARKER_ACTION = {
  EXTRACT: 'extract',             // 提取信息
  NEXT: 'next',                    // 继续下一个操作
  CLOSE_ALL: 'closeAll',          // 关闭所有相关页面
  WAIT: 'wait',                   // 等待进一步指示
  SWITCH_TAB: 'switchTab',        // 切换到指定标签页
  REFRESH: 'refresh'              // 刷新页面
}

// 结果状态枚举
export const RESULT_STATUS = {
  PENDING: 'pending',     // 待处理
  PROCESSING: 'processing', // 处理中  
  CLICKING: 'clicking',   // 点击中
  COMPLETED: 'completed', // 已完成
  FAILED: 'failed',      // 失败
  SKIPPED: 'skipped'     // 跳过
}

// 结果状态对应的CSS类名
export const RESULT_STATUS_CLASSES = {
  [RESULT_STATUS.PENDING]: 'haoyu-serp-result-pending',
  [RESULT_STATUS.PROCESSING]: 'haoyu-serp-result-processing', 
  [RESULT_STATUS.CLICKING]: 'haoyu-serp-result-clicking',
  [RESULT_STATUS.COMPLETED]: 'haoyu-serp-result-completed',
  [RESULT_STATUS.FAILED]: 'haoyu-serp-result-failed',
  [RESULT_STATUS.SKIPPED]: 'haoyu-serp-result-skipped'
}

// 所有结果状态的CSS类名数组（用于清除）
export const ALL_RESULT_STATUS_CLASSES = Object.values(RESULT_STATUS_CLASSES)

// SERP结果样式CSS
export const SERP_RESULT_STYLES_CSS = `
/* HaoYu SERP结果状态样式 */
.haoyu-serp-result-pending {
  border: 2px solid #1890ff !important;
  border-radius: 4px !important;
  background-color: rgba(24, 144, 255, 0.1) !important;
  transition: all 0.3s ease !important;
}

.haoyu-serp-result-clicking {
  border: 4px solid rgb(247, 1, 1) !important;
  border-radius: 4px !important; 
  background-color: rgba(211, 170, 89, 0.24) !important;
  position: relative !important;
  animation: haoyu-serp-clicking-pulse 1s infinite !important;
}

.haoyu-serp-result-processing {
  border: 4px solid rgb(247, 1, 1) !important;
  border-radius: 4px !important; 
  background-color: rgba(211, 170, 89, 0.24) !important;
  position: relative !important;
  animation: haoyu-serp-processing-pulse 1.5s infinite !important;
}

.haoyu-serp-result-completed {
  border: 2px solid #52c41a !important;
  border-radius: 4px !important;
  background-color: rgba(82, 196, 26, 0.1) !important;
  transition: all 0.3s ease !important;
}

.haoyu-serp-result-failed {
  border: 2px solid #ff4d4f !important;
  border-radius: 4px !important;
  background-color: rgba(255, 77, 79, 0.1) !important;
  opacity: 0.7 !important;
  transition: all 0.3s ease !important;
}

.haoyu-serp-result-skipped {
  border: 2px solid #d9d9d9 !important;
  border-radius: 4px !important;
  background-color: rgba(217, 217, 217, 0.1) !important;
  opacity: 0.6 !important;
  transition: all 0.3s ease !important;
}

/* 动画效果 */
@keyframes haoyu-serp-clicking-pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.02); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes haoyu-serp-processing-pulse {
  0% { opacity: 1; }
  33% { opacity: 0.6; }
  66% { opacity: 0.8; }
  100% { opacity: 1; }
}

/* 处理中状态的闪烁效果 */
.haoyu-serp-result-clicking::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid rgba(247, 1, 1, 0.3);
  border-radius: 6px;
  animation: haoyu-serp-border-flash 0.8s infinite;
}

@keyframes haoyu-serp-border-flash {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
`

// 样式定义 (保留用于向后兼容，建议使用CSS类)
export const RESULT_STYLES = {
  [RESULT_STATUS.PENDING]: {
    border: '2px solid #1890ff',
    borderRadius: '4px',
    backgroundColor: 'rgba(24, 144, 255, 0.1)'
  },
  [RESULT_STATUS.CLICKING]: {
    border: '4px solid rgb(247, 1, 1)',
    borderRadius: '4px', 
    backgroundColor: 'rgba(211, 170, 89, 0.24)',
    position: 'relative'
  },
  [RESULT_STATUS.PROCESSING]: {
    border: '4px solid rgb(247, 1, 1)',
    borderRadius: '4px', 
    backgroundColor: 'rgba(211, 170, 89, 0.24)',
    position: 'relative'
  },
  [RESULT_STATUS.COMPLETED]: {
    border: '2px solid #52c41a',
    borderRadius: '4px',
    backgroundColor: 'rgba(82, 196, 26, 0.1)'
  },
  [RESULT_STATUS.FAILED]: {
    border: '2px solid #ff4d4f',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 77, 79, 0.1)',
    opacity: '0.7'
  },
  [RESULT_STATUS.SKIPPED]: {
    border: '2px solid #d9d9d9',
    borderRadius: '4px',
    backgroundColor: 'rgba(217, 217, 217, 0.1)',
    opacity: '0.6'
  }
}

// Storage存储键
export const AUTOMATION_STORAGE_KEYS = {
  AUTOMATION_STATE: 'G_S_A_state',
  AUTOMATION_CONFIG: 'G_S_A_config',
  EXTRACTED_DATA: 'G_S_A_extracted_data',
  CURRENT_RESULTS: 'G_S_A_current_results',
  PAGE_MARKER: 'G_S_A_page_marker',
  SELECTED_TASK: 'selectedTask', // 以后提到外边去
}

// 选择器定义
export const SELECTORS = {
  // 搜索相关
  SEARCH_INPUT: 'textarea[name="q"]',
  SEARCH_BUTTON: 'div#searchform button[type="submit"]',
  
  // 搜索结果相关
  RESULT_CONTAINERS: 'div#rso > div div[jscontroller]:has(a):has(h3)',
  RESULT_LINKS: 'a[ping][href^="https://"]:not([class="fl"]):not([role="listitem"])',
  NEXT_PAGE_BUTTON: 'a#pnnext, [aria-label][id="pnnext"]',
  
  // 页面检测
  RESULTS_SECTION: 'div#rso'
} 