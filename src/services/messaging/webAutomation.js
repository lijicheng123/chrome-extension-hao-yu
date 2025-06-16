import { MessagingService } from './index'
import Browser from 'webextension-polyfill'

/**
 * Web自动化消息服务
 * 命名空间: WEB_AUTOMATION
 */
const webAutomationService = new MessagingService('WEB_AUTOMATION')

/**
 * Web自动化API常量
 */
export const WEB_AUTOMATION_API = {
  START_BATCH_TASK: 'START_BATCH_TASK',
  STOP_TASK: 'STOP_TASK',
  GET_TASK_STATUS: 'GET_TASK_STATUS',
  PAGE_READY: 'PAGE_READY',
  PAGE_DATA_EXTRACTED: 'PAGE_DATA_EXTRACTED',
  PAGE_TAB_ACTIVE: 'PAGE_TAB_ACTIVE',
  TASK_COMPLETED: 'TASK_COMPLETED'
}

/**
 * Web自动化 Content API
 * 提供给content script使用的API
 */
export class WebAutomationContentAPI {
  /**
   * 开始批量任务
   * @param {Array<Object>} taskConfigs - 任务配置数组
   * @returns {Promise<Object>} 任务结果
   */
  static async startBatchTask(taskConfigs, taskId) {
    try {
      return await webAutomationService.sendMessageWithResponse(
        WEB_AUTOMATION_API.START_BATCH_TASK,
        { taskConfigs, taskId }
      )
    } catch (error) {
      console.error('启动批量任务失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 停止任务
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 操作结果
   */
  static async stopTask(taskId) {
    try {
      return await webAutomationService.sendMessageWithResponse(
        WEB_AUTOMATION_API.STOP_TASK,
        { taskId }
      )
    } catch (error) {
      console.error('停止任务失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取任务状态
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 任务状态
   */
  static async getTaskStatus(taskId) {
    try {
      return await webAutomationService.sendMessageWithResponse(
        WEB_AUTOMATION_API.GET_TASK_STATUS,
        { taskId }
      )
    } catch (error) {
      console.error('获取任务状态失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 通知background script当前激活的标签页
   * @param {string} url - 当前激活的标签页URL
   */
  static async notifyPageTabActive(options) {
    webAutomationService.sendMessage(WEB_AUTOMATION_API.PAGE_TAB_ACTIVE, options)
  }

  /**
   * 通知页面准备就绪
   * @param {Object} pageInfo - 页面信息
   * @returns {Promise<void>}
   */
  static async notifyPageReady(pageInfo) {
    webAutomationService.sendMessage(WEB_AUTOMATION_API.PAGE_READY, pageInfo)
  }

  /**
   * 通知页面数据已提取
   * @param {Object} extractedData - 提取的数据
   * @returns {Promise<void>}
   */
  static async notifyPageDataExtracted(extractedData) {
    webAutomationService.sendMessage(WEB_AUTOMATION_API.PAGE_DATA_EXTRACTED, extractedData)
  }
}

/**
 * Web自动化 Background 处理器
 * 在background script中运行
 */
export class WebAutomationBackgroundHandlers {
  // 任务存储
  static tasks = new Map()

  /**
   * 开始批量任务
   * @param {Object} data - 任务数据 
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} 任务结果
   */
  static async handleStartBatchTask(data, sender) {
    try {
      const { taskConfigs, taskId } = data
      
      // 创建任务
      const task = {
        id: taskId,
        configs: taskConfigs,
        status: 'running',
        progress: 0,
        totalCount: taskConfigs.length,
        completedCount: 0,
        results: [],
        sourceTab: sender.tab,
        createdAt: Date.now()
      }
      
      WebAutomationBackgroundHandlers.tasks.set(taskId, task)
      
      // 异步执行任务处理
      WebAutomationBackgroundHandlers.processTasksWithPreload(taskId, taskConfigs)
        .catch(error => {
          console.error('任务处理失败:', error)
          task.status = 'failed'
          task.error = error.message
        })
      
      return { success: true, taskId }
    } catch (error) {
      console.error('启动批量任务失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 停止任务
   * @param {Object} data - 任务数据
   * @returns {Promise<Object>} 操作结果
   */
  static async handleStopTask(data) {
    try {
      const { taskId } = data
      const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
      
      if (!task) {
        return { success: false, error: '任务不存在' }
      }
      
      task.status = 'stopped'
      
      // 关闭相关标签页
      WebAutomationBackgroundHandlers.closeTaskTabs(taskId)
      
      return { success: true }
    } catch (error) {
      console.error('停止任务失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取任务状态
   * @param {Object} data - 请求数据
   * @returns {Promise<Object>} 任务状态
   */
  static async handleGetTaskStatus(data) {
    try {
      const { taskId } = data
      const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
      
      if (!task) {
        return { success: false, error: '任务不存在' }
      }
      
      return {
        success: true,
        task: {
          id: task.id,
          status: task.status,
          progress: task.progress,
          totalCount: task.totalCount,
          completedCount: task.completedCount,
          error: task.error
        }
      }
    } catch (error) {
      console.error('获取任务状态失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 处理页面准备就绪
   * @param {Object} data - 页面信息
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} 处理结果
   */
  static async handlePageReady(data, sender) {
    try {
      const { taskId, configIndex, url, title } = data
      console.log('页面准备就绪:', { taskId, configIndex, url, title })
      
      const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
      if (!task) {
        console.error('任务不存在:', taskId)
        return { success: false, error: '任务不存在' }
      }

      const config = task.configs[configIndex]
      if (!config) {
        console.error('配置不存在:', configIndex)
        return { success: false, error: '配置不存在' }
      }

      // 等待一会让页面完全加载
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 发送自动化执行命令到目标标签页
      const response = await Browser.tabs.sendMessage(sender.tab.id, {
        type: 'EXECUTE_AUTOMATION',
        config,
        taskId,
        configIndex
      })

      console.log('自动化执行响应:', response)
      return { success: true }
    } catch (error) {
      console.error('处理页面准备失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 处理页面数据已提取
   * @param {Object} data - 提取的数据
   * @returns {Promise<Object>} 处理结果
   */
  static async handlePageDataExtracted(data) {
    try {
      const { taskId, configIndex, extractedData, error, url } = data
      console.log('页面数据提取完成:', { taskId, configIndex, extractedData, error, url })
      
      const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
      if (!task) {
        return { success: false, error: '任务不存在' }
      }

      // 记录结果
      task.results[configIndex] = {
        success: !error,
        data: extractedData,
        error,
        url,
        completedAt: Date.now()
      }

      task.completedCount++
      task.progress = Math.round((task.completedCount / task.totalCount) * 100)

      console.log('任务进度更新:', {
        taskId,
        completedCount: task.completedCount,
        totalCount: task.totalCount,
        progress: task.progress
      })

      // 检查是否所有任务都完成
      if (task.completedCount >= task.totalCount) {
        await WebAutomationBackgroundHandlers.handleTaskCompleted(taskId)
      }

      return { success: true }
    } catch (error) {
      console.error('处理页面数据提取失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 并行打开页面+串行自动化处理（更像人类操作）
   * @param {string} taskId - 任务ID
   * @param {Array} taskConfigs - 任务配置
   */
  static async processTasksWithPreload(taskId, taskConfigs) {
    console.log('开始并行打开页面+串行自动化处理:', taskConfigs.length)
    
    // 第一步：并行快速打开所有页面（预加载）
    const openedTabs = await WebAutomationBackgroundHandlers.openAllPagesParallel(taskId, taskConfigs)
    
    // 第二步：串行激活并处理每个页面（像人类操作）
    for (let index = 0; index < taskConfigs.length; index++) {
      const config = taskConfigs[index]
      const tab = openedTabs[index]
      
      if (!tab || !tab.success) {
        console.error(`页面 ${index + 1} 打开失败，跳过处理`)
        continue
      }
      
      console.log(`开始处理任务 ${index + 1}/${taskConfigs.length}: ${config.name}`)
      
      try {
        // 激活当前页面
        await Browser.tabs.update(tab.tabId, { active: true })
        console.log(`已激活页面 ${index + 1}: ${config.name}`)
        
        // 等待页面处理完成
        await WebAutomationBackgroundHandlers.waitForPageCompletion(taskId, index)
        
        console.log(`任务 ${index + 1} 完成`)
        
        // 关闭当前页面
        await Browser.tabs.remove(tab.tabId).catch(console.error)
        
      } catch (error) {
        console.error(`处理任务 ${index + 1} 失败:`, error)
        
        // 标记失败
        const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
        if (task) {
          task.results[index] = {
            success: false,
            error: error.message,
            completedAt: Date.now()
          }
          task.completedCount++
        }
      }
    }
    
    // 所有页面处理完成，激活原始LandingPage并处理最终结果
    await WebAutomationBackgroundHandlers.activateOriginalPageAndComplete(taskId)
  }

  /**
   * 并行打开所有页面
   * @param {string} taskId - 任务ID  
   * @param {Array<Object>} taskConfigs - 任务配置数组
   */
  static async openAllPagesParallel(taskId, taskConfigs) {
    const openPromises = taskConfigs.map((config, index) => {
      const targetUrl = `${config.url}${config.url.includes('?') ? '&' : '?'}__h_task=${taskId}&__h_index=${index}&__h_d=2`
      
      console.log(`打开页面 ${index}:`, targetUrl)
      
      return Browser.tabs.create({
        url: targetUrl,
        active: true
      }).then(tab => {
        console.log(`页面 ${index} 已打开，标签页ID:`, tab.id)
        return { index, tab }
      }).catch(error => {
        console.error(`打开页面 ${index} 失败:`, error)
        throw error
      })
    })

    try {
      const results = await Promise.all(openPromises)
      console.log('所有页面已打开:', results.length)
      return results
    } catch (error) {
      console.error('并行打开页面失败:', error)
      throw error
    }
  }

  /**
   * 等待所有页面完成处理
   * @param {string} taskId - 任务ID
   * @param {number} totalCount - 总页面数
   */
  static async waitForAllPagesCompletion(taskId, totalCount) {
    const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
    if (!task) return

    return new Promise((resolve) => {
      const checkCompletion = () => {
        if (task.completedCount >= totalCount || task.status !== 'running') {
          resolve()
        } else {
          setTimeout(checkCompletion, 1000)
        }
      }
      checkCompletion()
    })
  }

  /**
   * 激活原始页面并完成任务
   * @param {string} taskId - 任务ID
   */
  static async activateOriginalPageAndComplete(taskId) {
    try {
      const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
      
      if (task && task.originalTabId) {
        // 激活原始页面
        await Browser.tabs.update(task.originalTabId, { active: true })
        console.log('已激活原始页面:', task.originalTabId)
      } else {
        // 如果没有原始标签页ID，则查找非自动化页面
        const tabs = await Browser.tabs.query({})
        const landingTab = tabs.find(tab => 
          tab.url && !tab.url.includes('__h_d=2')
        )
        
        if (landingTab) {
          await Browser.tabs.update(landingTab.id, { active: true })
          console.log('已激活找到的页面:', landingTab.id)
        }
      }
      
      // 处理最终结果
      await WebAutomationBackgroundHandlers.handleTaskCompleted(taskId)
      
    } catch (error) {
      console.error('激活原始页面失败:', error)
      await WebAutomationBackgroundHandlers.handleTaskCompleted(taskId)
    }
  }

  /**
   * 处理任务完成
   * @param {string} taskId - 任务ID
   */
  static async handleTaskCompleted(taskId) {
    const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
    if (!task) return

    try {
      console.log('任务完成，开始处理结果:', taskId)
      
      task.status = 'completed'

      // 激活原始页面
      await WebAutomationBackgroundHandlers.activateOriginalPageAndComplete(taskId)

      // 广播任务完成消息给content script
      webAutomationService.broadcastMessage(WEB_AUTOMATION_API.TASK_COMPLETED, {
        type: 'request',
        taskId: task.id,
        results: task.results
      })

      console.log('任务完成处理结束:', taskId)
    } catch (error) {
      console.error('处理任务完成失败:', error)
      task.status = 'failed'
      task.error = error.message
    }
    
    // 延迟关闭标签页
    // setTimeout(() => {
    //   WebAutomationBackgroundHandlers.closeTaskTabs(taskId)
    // }, 10000)
  }

  /**
   * 关闭任务相关的标签页
   * @param {string} taskId - 任务ID
   */
  static async closeTaskTabs(taskId) {
    try {
      const tabs = await Browser.tabs.query({})
      const taskTabs = tabs.filter(tab => 
        tab.url && tab.url.includes(`__h_task=${taskId}`)
      )
      
      for (const tab of taskTabs) {
        await Browser.tabs.remove(tab.id).catch(console.error)
      }
      
      console.log(`已关闭任务 ${taskId} 的 ${taskTabs.length} 个标签页`)
    } catch (error) {
      console.error('关闭标签页失败:', error)
    }
  }

  /**
   * 注册所有处理器
   */
  static registerHandlers() {
    webAutomationService.registerHandlers({
      [WEB_AUTOMATION_API.START_BATCH_TASK]: WebAutomationBackgroundHandlers.handleStartBatchTask,
      [WEB_AUTOMATION_API.STOP_TASK]: WebAutomationBackgroundHandlers.handleStopTask,
      [WEB_AUTOMATION_API.GET_TASK_STATUS]: WebAutomationBackgroundHandlers.handleGetTaskStatus,
      [WEB_AUTOMATION_API.PAGE_READY]: WebAutomationBackgroundHandlers.handlePageReady,
      [WEB_AUTOMATION_API.PAGE_DATA_EXTRACTED]: WebAutomationBackgroundHandlers.handlePageDataExtracted,
      [WEB_AUTOMATION_API.PAGE_TAB_ACTIVE]: WebAutomationBackgroundHandlers.activateOriginalPageAndComplete,
    })
    
    console.log('Web自动化处理器已注册')
  }
}

export default webAutomationService 