/**
 * 自动化日志管理器
 * 提供统一的日志记录功能，便于调试和问题排查
 */
class AutomationLogger {
  constructor() {
    this.logHistory = []
    this.maxLogSize = 1000 // 最大日志条数
    this.isEnabled = true
  }

  /**
   * 记录日志
   */
  log(level, module, message, data = null) {
    if (!this.isEnabled) return

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
      url: window.location.href
    }

    // 添加到历史记录
    this.logHistory.push(logEntry)
    
    // 限制日志大小
    if (this.logHistory.length > this.maxLogSize) {
      this.logHistory = this.logHistory.slice(-this.maxLogSize)
    }

    // 输出到控制台
    const logMessage = `[${module}] ${message}`
    
    switch (level) {
      case 'error':
        console.error(logMessage, data)
        break
      case 'warn':
        console.warn(logMessage, data)
        break
      case 'info':
        console.info(logMessage, data)
        break
      case 'debug':
      default:
        console.log(logMessage, data)
        break
    }
  }

  /**
   * 记录信息日志
   */
  info(module, message, data) {
    this.log('info', module, message, data)
  }

  /**
   * 记录警告日志
   */
  warn(module, message, data) {
    this.log('warn', module, message, data)
  }

  /**
   * 记录错误日志
   */
  error(module, message, data) {
    this.log('error', module, message, data)
  }

  /**
   * 记录调试日志
   */
  debug(module, message, data) {
    this.log('debug', module, message, data)
  }

  /**
   * 获取日志历史
   */
  getLogHistory(filterModule = null, filterLevel = null) {
    let logs = this.logHistory

    if (filterModule) {
      logs = logs.filter(log => log.module === filterModule)
    }

    if (filterLevel) {
      logs = logs.filter(log => log.level === filterLevel)
    }

    return logs
  }

  /**
   * 清除日志历史
   */
  clearHistory() {
    this.logHistory = []
    console.log('[AutomationLogger] 日志历史已清除')
  }

  /**
   * 导出日志
   */
  exportLogs() {
    const logs = this.getLogHistory()
    const logText = logs.map(log => 
      `${log.timestamp} [${log.level.toUpperCase()}] [${log.module}] ${log.message}${log.data ? ' | ' + JSON.stringify(log.data) : ''}`
    ).join('\n')
    
    return logText
  }

  /**
   * 启用/禁用日志
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
    console.log(`[AutomationLogger] 日志记录${enabled ? '已启用' : '已禁用'}`)
  }
}

// 创建全局实例
const automationLogger = new AutomationLogger()

// 导出便捷方法
export const logInfo = (module, message, data) => automationLogger.info(module, message, data)
export const logWarn = (module, message, data) => automationLogger.warn(module, message, data)
export const logError = (module, message, data) => automationLogger.error(module, message, data)
export const logDebug = (module, message, data) => automationLogger.debug(module, message, data)

export default automationLogger 