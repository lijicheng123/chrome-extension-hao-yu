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
  TASK_COMPLETED: 'TASK_COMPLETED'
}

/**
 * Web自动化 Content API
 * 提供给content script使用的API
 */
export class WebAutomationContentAPI {
    // 存储任务完成回调函数
  static taskCompletedCallbacks = new Map()
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
  /**
   * 注册任务完成回调函数
   * @param {string} taskId - 任务ID
   * @param {Function} callback - 回调函数
   */
  static registerTaskCompletedCallback(taskId, callback) {
    WebAutomationContentAPI.taskCompletedCallbacks.set(taskId, callback)
    console.log(`已注册任务完成回调: ${taskId}`)
  }

  /**
   * 取消注册任务完成回调函数
   * @param {string} taskId - 任务ID
   */
  static unregisterTaskCompletedCallback(taskId) {
    WebAutomationContentAPI.taskCompletedCallbacks.delete(taskId)
    console.log(`已取消注册任务完成回调: ${taskId}`)
  }

  /**
   * 处理任务完成广播消息
   * @param {Object} data - 任务完成数据
   * @returns {Promise<Object>} 处理结果
   */
  static async handleTaskCompleted(data) {
    console.log('Content script收到任务完成消息:', data)
    
    const { taskId } = data
    
    // 查找并调用对应的回调函数
    const callback = WebAutomationContentAPI.taskCompletedCallbacks.get(taskId)
    if (callback && typeof callback === 'function') {
      try {
        await callback(data)
        console.log(`已调用任务完成回调: ${taskId}`)
      } catch (error) {
        console.error(`调用任务完成回调失败: ${taskId}`, error)
      }
    } else {
      console.log(`未找到任务完成回调: ${taskId}`)
    }
    
    return {
      success: true,
      message: '任务完成消息已处理'
    }
  }
  /**
   * 注册Content处理器
   */
  static registerHandlers() {
    webAutomationService.registerHandlers({
      [WEB_AUTOMATION_API.TASK_COMPLETED]: WebAutomationContentAPI.handleTaskCompleted
    })
  }
  /**
   * 卸载content处理器
   */
  static unregisterHandlers() {
    console.log('Web自动化Content处理器已卸载')
  }
}

/**
 * Web自动化 Background 处理器
 * 在background script中运行
 */
export class WebAutomationBackgroundHandlers {
  // 存储任务状态
  static tasks = new Map()
  
  /**
   * 处理批量任务启动
   * @param {Object} data - 请求数据
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} 操作结果
   */
  static async handleStartBatchTask(data, sender) {
    console.log('开始处理批量自动化任务:', data, '原始标签页:', sender.tab?.id)
    
    try {
      const { taskConfigs, taskId } = data
      
      // 创建任务状态，保存原始标签页ID
      const task = {
        id: taskId,
        status: 'running',
        configs: taskConfigs,
        results: [],
        startTime: Date.now(),
        completedCount: 0,
        totalCount: taskConfigs.length,
        originalTabId: sender.tab?.id // 保存原始标签页ID
      }
      
      WebAutomationBackgroundHandlers.tasks.set(taskId, task)
      
      // 这里不必要等待，因为并行打开+串行自动化处理会自动等待所有页面处理完成
      WebAutomationBackgroundHandlers.processTasksWithPreload(taskId, taskConfigs)
      
      return {
        success: true,
        taskId,
        message: '批量任务已启动'
      }
    } catch (error) {
      console.error('启动批量任务失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 处理任务停止
   * @param {Object} data - 请求数据
   * @returns {Promise<Object>} 操作结果
   */
  static async handleStopTask(data) {
    const { taskId } = data
    const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
    
    if (!task) {
      return { success: false, error: '任务不存在' }
    }
    
    task.status = 'stopped'
    
    // TODO: 关闭相关标签页
    await WebAutomationBackgroundHandlers.closeTaskTabs(taskId)
    
    return {
      success: true,
      message: '任务已停止'
    }
  }

  /**
   * 处理获取任务状态
   * @param {Object} data - 请求数据
   * @returns {Promise<Object>} 任务状态
   */
  static async handleGetTaskStatus(data) {
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
        progress: Math.round((task.completedCount / task.totalCount) * 100),
        completedCount: task.completedCount,
        totalCount: task.totalCount,
        results: task.results
      }
    }
  }

  /**
   * 处理页面准备就绪
   * @param {Object} data - 页面信息
   * @param {Object} sender - 发送者信息
   */
  static async handlePageReady(data, sender) {
    console.log('页面准备就绪:', data, sender.tab?.id)
    
    // 找到对应的任务和配置
    const { taskId, configIndex } = data
    const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
    
    if (!task || task.status !== 'running') {
      return
    }
    
    const config = task.configs[configIndex]
    if (!config) {
      return
    }
    
    // 稍等一下再发送执行指令，确保页面完全准备好
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 发送执行指令到页面
    try {
      console.log('准备发送执行指令到页面:', sender.tab.id, { config, taskId, configIndex })
      
      const response = await Browser.tabs.sendMessage(sender.tab.id, {
        type: 'EXECUTE_AUTOMATION',
        config,
        taskId,
        configIndex
      })
      
      console.log('执行指令发送成功，页面响应:', response)
    } catch (error) {
      console.error('发送执行指令失败:', error)
      
      // 如果发送失败，标记该任务失败
      const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
      if (task) {
        task.results[configIndex] = {
          success: false,
          error: `无法与页面通信: ${error.message}`,
          completedAt: Date.now()
        }
        task.completedCount++
        
        // 检查是否所有子任务都完成
        if (task.completedCount >= task.totalCount) {
          await WebAutomationBackgroundHandlers.handleTaskCompleted(taskId)
        }
      }
    }
  }

  /**
   * 处理页面数据已提取
   * @param {Object} data - 提取的数据
   */
  static async handlePageDataExtracted(data) {
    console.log('页面数据已提取:', data)
    
    const { taskId, configIndex, extractedData, error } = data
    const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
    
    if (!task) {
      return
    }
    
    // 更新任务结果
    task.results[configIndex] = {
      success: !error,
      data: extractedData,
      error: error,
      completedAt: Date.now()
    }
    
    task.completedCount++
    
    // 检查是否所有子任务都完成
    if (task.completedCount >= task.totalCount) {
      await WebAutomationBackgroundHandlers.handleTaskCompleted(taskId)
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
   * @param {Array} taskConfigs - 任务配置
   */
  static async openAllPagesParallel(taskId, taskConfigs) {
    console.log('并行打开所有页面...')
    
    const openPromises = taskConfigs.map(async (config, index) => {
      try {
        // 修改URL参数为__h_开头
        const urlWithParams = new URL(config.url)
        urlWithParams.searchParams.set('__h_d', '2') // 页面深度2
        urlWithParams.searchParams.set('__h_task', taskId)
        urlWithParams.searchParams.set('__h_index', index.toString())
        
        const tab = await Browser.tabs.create({
          url: urlWithParams.toString(),
          active: false // 不激活，后台预加载
        })
        
        console.log(`已预加载页面 ${index + 1}: ${config.name}`)
        return { index, tabId: tab.id, success: true }
      } catch (error) {
        console.error(`打开页面失败 ${index + 1}:`, error)
        return { index, error: error.message, success: false }
      }
    })
    
    const results = await Promise.all(openPromises)
    console.log('所有页面预加载完成:', results)
    return results
  }

  /**
   * 等待页面处理完成
   * @param {string} taskId - 任务ID
   * @param {number} configIndex - 配置索引
   */
  static async waitForPageCompletion(taskId, configIndex) {
    return new Promise((resolve, reject) => {
      const maxWaitTime = 60000 // 最大等待60秒
      const startTime = Date.now()
      
      const checkCompletion = () => {
        const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
        if (!task) {
          reject(new Error('任务不存在'))
          return
        }
        
        // 检查是否已完成
        const result = task.results[configIndex]
        if (result) {
          console.log(`页面 ${configIndex} 处理完成:`, result)
          resolve(result)
          return
        }
        
        // 检查超时
        if (Date.now() - startTime > maxWaitTime) {
          reject(new Error('页面处理超时'))
          return
        }
        
        // 继续等待
        setTimeout(checkCompletion, 1000)
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
    
    task.status = 'completed'
    task.endTime = Date.now()
    
    console.log('批量任务完成:', task)
    
    // 直接通知前端任务完成，不在后台进行AI处理
    webAutomationService.broadcastMessage(WEB_AUTOMATION_API.TASK_COMPLETED, {
      taskId,
      results: task.results
    })
    
    // 延迟关闭标签页
    setTimeout(() => {
      WebAutomationBackgroundHandlers.closeTaskTabs(taskId)
    }, 10000)
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
      [WEB_AUTOMATION_API.PAGE_DATA_EXTRACTED]: WebAutomationBackgroundHandlers.handlePageDataExtracted
    })
    
    console.log('Web自动化处理器已注册')
  }
}


export default webAutomationService 