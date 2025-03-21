import { MessagingService } from './index'

/**
 * 线索挖掘模块API常量
 */
export const LEADS_MINING_API = {
  // 任务状态管理
  GET_STATE: 'leads-mining:get-state',
  SAVE_STATE: 'leads-mining:save-state',

  // 任务控制
  START_TASK: 'leads-mining:start-task',
  PAUSE_TASK: 'leads-mining:pause-task',
  RESUME_TASK: 'leads-mining:resume-task',
  STOP_TASK: 'leads-mining:stop-task',
  COMPLETE_TASK: 'leads-mining:complete-task',

  // 邮箱管理
  REGISTER_EMAIL: 'leads-mining:register-email',
  GET_EMAILS: 'leads-mining:get-emails',

  // URL管理
  CHECK_URL: 'leads-mining:check-url',
  REGISTER_URL: 'leads-mining:register-url',

  // 搜索结果页管理
  HAS_SEARCH_RESULT_PAGE: 'leads-mining:has-search-result-page',
}

/**
 * 线索挖掘服务实例
 * 用于content script与background script之间通信
 */
const leadsMiningService = new MessagingService('leads-mining')

/**
 * 线索挖掘Content API
 * 提供给content script使用的API
 */
export class LeadsMiningContentAPI {
  /**
   * 获取任务状态
   * @param {string} taskId 任务ID
   * @returns {Promise<object>} 任务状态
   */
  static async getState(taskId) {
    try {
      return await leadsMiningService.sendMessageWithResponse(LEADS_MINING_API.GET_STATE, {
        taskId,
      })
    } catch (error) {
      console.error('获取任务状态失败:', error)
      return null
    }
  }

  /**
   * 保存任务状态
   * @param {object} state 状态数据
   * @returns {Promise<boolean>} 是否成功
   */
  static async saveState(state) {
    try {
      await leadsMiningService.sendMessage(LEADS_MINING_API.SAVE_STATE, { payload: state })
      return true
    } catch (error) {
      console.error('保存任务状态失败:', error)
      return false
    }
  }

  /**
   * 开始任务
   * @param {string} taskId 任务ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async startTask(taskId) {
    try {
      await leadsMiningService.sendMessage(LEADS_MINING_API.START_TASK, { taskId })
      return true
    } catch (error) {
      console.error('开始任务失败:', error)
      return false
    }
  }

  /**
   * 暂停任务
   * @param {string} taskId 任务ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async pauseTask(taskId) {
    try {
      await leadsMiningService.sendMessage(LEADS_MINING_API.PAUSE_TASK, { taskId })
      return true
    } catch (error) {
      console.error('暂停任务失败:', error)
      return false
    }
  }

  /**
   * 恢复任务
   * @param {string} taskId 任务ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async resumeTask(taskId) {
    try {
      await leadsMiningService.sendMessage(LEADS_MINING_API.RESUME_TASK, { taskId })
      return true
    } catch (error) {
      console.error('恢复任务失败:', error)
      return false
    }
  }

  /**
   * 停止任务
   * @param {string} taskId 任务ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async stopTask(taskId) {
    try {
      await leadsMiningService.sendMessage(LEADS_MINING_API.STOP_TASK, { taskId })
      return true
    } catch (error) {
      console.error('停止任务失败:', error)
      return false
    }
  }

  /**
   * 完成任务
   * @param {string} taskId 任务ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async completeTask(taskId) {
    try {
      await leadsMiningService.sendMessage(LEADS_MINING_API.COMPLETE_TASK, { taskId })
      return true
    } catch (error) {
      console.error('完成任务失败:', error)
      return false
    }
  }

  /**
   * 注册邮箱
   * @param {string} taskId 任务ID
   * @param {string} email 邮箱地址
   * @returns {Promise<boolean>} 是否成功
   */
  static async registerEmail(taskId, email) {
    try {
      await leadsMiningService.sendMessage(LEADS_MINING_API.REGISTER_EMAIL, { taskId, email })
      return true
    } catch (error) {
      console.error('注册邮箱失败:', error)
      return false
    }
  }

  /**
   * 获取已收集的邮箱列表
   * @param {string} taskId 任务ID
   * @returns {Promise<string[]>} 邮箱列表
   */
  static async getEmails(taskId) {
    try {
      const response = await leadsMiningService.sendMessage(LEADS_MINING_API.GET_EMAILS, { taskId })
      return response?.emails || []
    } catch (error) {
      console.error('获取邮箱列表失败:', error)
      return []
    }
  }

  /**
   * 检查URL是否已处理
   * @param {string} taskId 任务ID
   * @param {string} url URL
   * @returns {Promise<boolean>} 是否已处理
   */
  static async checkUrl(taskId, url) {
    try {
      const response = await leadsMiningService.sendMessageWithResponse(
        LEADS_MINING_API.CHECK_URL,
        {
          taskId,
          url,
        },
      )
      return response?.isProcessed || false
    } catch (error) {
      console.error('检查URL失败:', error)
      return false
    }
  }

  /**
   * 注册URL为已处理
   * @param {string} taskId 任务ID
   * @param {string} url URL
   * @returns {Promise<boolean>} 是否成功
   */
  static async registerUrl(taskId, url) {
    try {
      await leadsMiningService.sendMessage(LEADS_MINING_API.REGISTER_URL, { taskId, url })
      return true
    } catch (error) {
      console.error('注册URL失败:', error)
      return false
    }
  }

  /**
   * 检查是否有其他标签页打开了搜索结果页
   * @returns {Promise<boolean>} 是否存在其他搜索结果页
   */
  static async hasSearchResultPage() {
    try {
      // 使用带响应的消息发送方法
      const result = await leadsMiningService.sendMessageWithResponse(
        LEADS_MINING_API.HAS_SEARCH_RESULT_PAGE,
        {
          currentUrl: window.location.href,
        },
      )
      console.log('获取搜索结果页状态结果:', result)
      return result
    } catch (error) {
      console.error('检查搜索结果页失败:', error)
      return false
    }
  }
}

export default leadsMiningService
