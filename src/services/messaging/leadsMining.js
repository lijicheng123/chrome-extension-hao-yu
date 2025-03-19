import { MessagingService } from './index'

/**
 * LeadsMining消息服务
 * 命名空间: LEADS_MINING
 */
const leadsMiningService = new MessagingService('LEADS_MINING')

// 导出服务实例
export default leadsMiningService

// 定义LeadsMining API常量，用于统一管理消息类型
export const LEADS_MINING_API = {
  // 状态管理
  GET_STATE: 'GET_STATE',
  SAVE_STATE: 'SAVE_STATE',

  // 任务控制
  START_TASK: 'START_TASK',
  PAUSE_TASK: 'PAUSE_TASK',
  RESUME_TASK: 'RESUME_TASK',
  STOP_TASK: 'STOP_TASK',
  COMPLETE_TASK: 'COMPLETE_TASK',

  // 邮箱管理
  REGISTER_EMAIL: 'REGISTER_EMAIL',
  GET_EMAILS: 'GET_EMAILS',

  // URL管理
  CHECK_URL: 'CHECK_URL',
  REGISTER_URL: 'REGISTER_URL',

  // 事件
  TASK_TAKEN_OVER: 'TASK_TAKEN_OVER',
  CAPTCHA_DETECTED: 'CAPTCHA_DETECTED',
}

/**
 * Content Script API封装
 * 在content script中使用
 */
export class LeadsMiningContentAPI {
  /**
   * 获取任务状态
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 任务状态
   */
  static async getState(taskId) {
    return leadsMiningService.sendMessage(LEADS_MINING_API.GET_STATE, { taskId })
  }

  /**
   * 保存任务状态
   * @param {Object} payload - 任务状态数据
   * @returns {Promise<Object>}
   */
  static async saveState(payload) {
    return leadsMiningService.sendMessage(LEADS_MINING_API.SAVE_STATE, { payload })
  }

  /**
   * 开始任务
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>}
   */
  static async startTask(taskId) {
    return leadsMiningService.sendMessage(LEADS_MINING_API.START_TASK, { taskId })
  }

  /**
   * 暂停任务
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>}
   */
  static async pauseTask(taskId) {
    return leadsMiningService.sendMessage(LEADS_MINING_API.PAUSE_TASK, { taskId })
  }

  /**
   * 继续任务
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>}
   */
  static async resumeTask(taskId) {
    return leadsMiningService.sendMessage(LEADS_MINING_API.RESUME_TASK, { taskId })
  }

  /**
   * 停止任务
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>}
   */
  static async stopTask(taskId) {
    return leadsMiningService.sendMessage(LEADS_MINING_API.STOP_TASK, { taskId })
  }

  /**
   * 完成任务
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>}
   */
  static async completeTask(taskId) {
    return leadsMiningService.sendMessage(LEADS_MINING_API.COMPLETE_TASK, { taskId })
  }

  /**
   * 获取邮箱列表
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 邮箱列表
   */
  static async getEmails(taskId) {
    return leadsMiningService.sendMessage(LEADS_MINING_API.GET_EMAILS, { taskId })
  }

  /**
   * 注册邮箱
   * @param {string} taskId - 任务ID
   * @param {string} email - 邮箱地址
   * @returns {Promise<Object>}
   */
  static async registerEmail(taskId, email) {
    return leadsMiningService.sendMessage(LEADS_MINING_API.REGISTER_EMAIL, { taskId, email })
  }

  /**
   * 检查URL是否已处理
   * @param {string} taskId - 任务ID
   * @param {string} url - URL地址
   * @returns {Promise<boolean>} 是否已处理
   */
  static async checkUrl(taskId, url) {
    const response = await leadsMiningService.sendMessage(LEADS_MINING_API.CHECK_URL, {
      taskId,
      url,
    })
    return response?.isProcessed || false
  }

  /**
   * 注册已处理的URL
   * @param {string} taskId - 任务ID
   * @param {string} url - URL地址
   * @returns {Promise<Object>}
   */
  static async registerUrl(taskId, url) {
    return leadsMiningService.sendMessage(LEADS_MINING_API.REGISTER_URL, { taskId, url })
  }
}

/**
 * Background API封装
 * 在background中使用
 */
export class LeadsMiningBackgroundAPI {
  /**
   * 通知任务被接管
   * @param {number} tabId - 标签页ID
   * @param {string} taskId - 任务ID
   * @returns {Promise<void>}
   */
  static async notifyTaskTakenOver(tabId, taskId) {
    return leadsMiningService.sendMessageToTab(tabId, LEADS_MINING_API.TASK_TAKEN_OVER, { taskId })
  }

  /**
   * 广播任务状态更新
   * @param {string} taskId - 任务ID
   * @param {Object} state - 任务状态
   * @returns {Promise<void>}
   */
  static async broadcastTaskUpdate(taskId, state) {
    return leadsMiningService.broadcastMessage(LEADS_MINING_API.TASK_UPDATE, { taskId, state })
  }
}
