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
  TASK_COMPLETED: 'TASK_COMPLETED',
  // 新增：用于统一消息架构的API
  INITIALIZE_AUTOMATION: 'INITIALIZE_AUTOMATION',
  EXECUTE_AUTOMATION: 'EXECUTE_AUTOMATION'
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
   * 处理初始化自动化任务消息
   * @param {Object} data - 初始化数据
   * @returns {Object} 处理结果
   */
  static async handleInitializeAutomation(data) {
    console.log('Content收到初始化自动化任务消息:', data)
    
    // 通知webAutomationExecutor初始化
    if (window.webAutomationExecutor) {
      window.webAutomationExecutor.handleInitializeAutomation(data)
    }
    
    return { success: true }
  }

  /**
   * 处理执行自动化任务消息
   * @param {Object} data - 执行数据
   * @returns {Object} 处理结果
   */
  static async handleExecuteAutomation(data) {
    console.log('Content收到执行自动化任务消息:', data)
    
    // 通知webAutomationExecutor执行
    if (window.webAutomationExecutor) {
      try {
        await window.webAutomationExecutor.handleExecuteAutomation(data)
        return { success: true }
      } catch (error) {
        console.error('执行自动化任务失败:', error)
        return { success: false, error: error.message }
      }
    }
    
    return { success: false, error: 'webAutomationExecutor未初始化' }
  }

  /**
   * 注册Content处理器
   */
  static registerHandlers() {
    webAutomationService.registerHandlers({
      [WEB_AUTOMATION_API.TASK_COMPLETED]: WebAutomationContentAPI.handleTaskCompleted,
      [WEB_AUTOMATION_API.INITIALIZE_AUTOMATION]: WebAutomationContentAPI.handleInitializeAutomation,
      [WEB_AUTOMATION_API.EXECUTE_AUTOMATION]: WebAutomationContentAPI.handleExecuteAutomation
    })
  }
}

/**
 * Web自动化 Background 处理器
 * 在background script中运行
 */
export class WebAutomationBackgroundHandlers {
  // 存储任务状态
  static tasks = new Map()
  // 存储标签页到任务的映射
  static tabTaskMap = new Map() // tabId -> {taskId, configIndex, config}
  // 存储任务的标签页监听器
  static taskTabListeners = new Map() // taskId -> {onUpdated, onRemoved}
  
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
      
      // 为这个任务注册标签页监听器
      WebAutomationBackgroundHandlers.registerTaskTabListeners(taskId)
      
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
   * 为特定任务注册标签页监听器
   * @param {string} taskId - 任务ID
   */
  static registerTaskTabListeners(taskId) {
    const onUpdated = (tabId, changeInfo, tab) => {
      // 只处理这个任务相关的标签页
      const taskInfo = WebAutomationBackgroundHandlers.tabTaskMap.get(tabId)
      if (!taskInfo || taskInfo.taskId !== taskId) return
      
      if (changeInfo.status === 'complete') {
        console.log(`任务 ${taskId} 的标签页 ${tabId} 加载完成，发送任务信息:`, taskInfo)
        
        // 使用统一的消息服务发送初始化消息
        webAutomationService.sendMessageToTab(tabId, WEB_AUTOMATION_API.INITIALIZE_AUTOMATION, {
          taskId: taskInfo.taskId,
          configIndex: taskInfo.configIndex,
          config: taskInfo.config,
          originalUrl: taskInfo.originalUrl,
          currentUrl: tab.url
        })
      }
    }

    const onRemoved = (tabId) => {
      const taskInfo = WebAutomationBackgroundHandlers.tabTaskMap.get(tabId)
      if (taskInfo && taskInfo.taskId === taskId) {
        WebAutomationBackgroundHandlers.tabTaskMap.delete(tabId)
      }
    }

    // 注册监听器
    Browser.tabs.onUpdated.addListener(onUpdated)
    Browser.tabs.onRemoved.addListener(onRemoved)
    
    // 保存监听器引用，用于后续清理
    WebAutomationBackgroundHandlers.taskTabListeners.set(taskId, {
      onUpdated,
      onRemoved
    })
    
    console.log(`已为任务 ${taskId} 注册标签页监听器`)
  }

  /**
   * 清理特定任务的标签页监听器
   * @param {string} taskId - 任务ID
   */
  static unregisterTaskTabListeners(taskId) {
    const listeners = WebAutomationBackgroundHandlers.taskTabListeners.get(taskId)
    if (listeners) {
      Browser.tabs.onUpdated.removeListener(listeners.onUpdated)
      Browser.tabs.onRemoved.removeListener(listeners.onRemoved)
      WebAutomationBackgroundHandlers.taskTabListeners.delete(taskId)
      console.log(`已清理任务 ${taskId} 的标签页监听器`)
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
    
    // 清理任务相关的标签页映射
    for (const [tabId, taskInfo] of WebAutomationBackgroundHandlers.tabTaskMap.entries()) {
      if (taskInfo.taskId === taskId) {
        WebAutomationBackgroundHandlers.tabTaskMap.delete(tabId)
      }
    }
    
    // 清理任务的标签页监听器
    WebAutomationBackgroundHandlers.unregisterTaskTabListeners(taskId)
    
    // 关闭相关标签页
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
      
      // 使用统一的消息服务发送执行消息
      webAutomationService.sendMessageToTab(sender.tab.id, WEB_AUTOMATION_API.EXECUTE_AUTOMATION, {
        config,
        taskId,
        configIndex
      })
      
      console.log('执行指令已通过统一消息服务发送')
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
      // 在每次循环开始时检查任务状态
      const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
      if (!task || task.status === 'completed' || task.status === 'stopped') {
        console.log(`任务 ${taskId} 已完成或停止，跳过剩余页面处理`)
        break
      }
      
      const config = taskConfigs[index]
      const tab = openedTabs[index]
      
      if (!tab || !tab.success) {
        console.error(`页面 ${index + 1} 打开失败，跳过处理`)
        // 标记失败并更新计数
        if (task) {
          task.results[index] = {
            success: false,
            error: '页面打开失败',
            completedAt: Date.now()
          }
          task.completedCount++
          
          // 检查是否所有子任务都完成
          if (task.completedCount >= task.totalCount) {
            await WebAutomationBackgroundHandlers.handleTaskCompleted(taskId)
            break
          }
        }
        continue
      }
      
      console.log(`开始处理任务 ${index + 1}/${taskConfigs.length}: ${config.name}`)
      
      try {
        // 再次检查任务状态
        const currentTask = WebAutomationBackgroundHandlers.tasks.get(taskId)
        if (!currentTask || currentTask.status !== 'running') {
          console.log(`任务 ${taskId} 状态已变更，停止处理页面 ${index}`)
          break
        }
        
        // 激活当前页面
        await Browser.tabs.update(tab.tabId, { active: true })
        console.log(`已激活页面 ${index + 1}: ${config.name}`)
        
        // 等待页面处理完成
        await WebAutomationBackgroundHandlers.waitForPageCompletion(taskId, index)
        
        console.log(`任务 ${index + 1} 完成`)
        
      } catch (error) {
        console.error(`处理任务 ${index + 1} 失败:`, error)
        
        // 标记失败
        const taskForUpdate = WebAutomationBackgroundHandlers.tasks.get(taskId)
        if (taskForUpdate) {
          taskForUpdate.results[index] = {
            success: false,
            error: error.message,
            completedAt: Date.now()
          }
          taskForUpdate.completedCount++
        }
      } finally {
        // 不管成功还是失败，都关闭当前页面
        try {
          await Browser.tabs.remove(tab.tabId)
          console.log(`任务 ${index + 1} 关闭页面`)
        } catch (closeError) {
          console.error(`关闭页面失败:`, closeError)
        }
      }
      
      // 检查任务是否在此循环中完成
      const finalTask = WebAutomationBackgroundHandlers.tasks.get(taskId)
      if (finalTask && (finalTask.status === 'completed' || finalTask.completedCount >= finalTask.totalCount)) {
        console.log(`任务 ${taskId} 已完成，停止后续页面处理`)
        break
      }
    }
    
    // 所有页面处理完成或提前终止，激活原始LandingPage并处理最终结果
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
        // 直接打开原始URL，不添加任何参数
        const tab = await Browser.tabs.create({
          url: config.url,
          active: false // 不激活，后台预加载
        })
        
        // 将任务信息存储在background内存中
        WebAutomationBackgroundHandlers.tabTaskMap.set(tab.id, {
          taskId,
          configIndex: index,
          config,
          originalUrl: config.url
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
      const maxWaitTime = 30000 // 最大等待30秒
      const startTime = Date.now()
      let timer = null
      
      const checkCompletion = () => {
        const task = WebAutomationBackgroundHandlers.tasks.get(taskId)
        if (!task) {
          clearTimeout(timer)
          reject(new Error('任务不存在'))
          return
        }
        
        // 先检查任务整体状态，如果已完成则直接返回
        if (task.status === 'completed' || task.status === 'stopped') {
          console.log(`任务 ${taskId} 已完成，停止等待页面 ${configIndex}`)
          // 如果任务已完成，检查是否有该页面的结果
          const result = task.results[configIndex]
          clearTimeout(timer)

          if (result) {
            resolve(result)
          } else {
            // 如果没有结果，标记为超时失败
            resolve({
              success: false,
              error: '页面处理超时或任务提前完成',
              completedAt: Date.now()
            })
          }
          return
        }
        
        // 检查是否已完成当前页面
        const result = task.results[configIndex]
        if (result) {
          clearTimeout(timer)
          console.log(`页面 ${configIndex} 处理完成:`, result)
          resolve(result)
          return
        }
        
        // 检查超时
        if (Date.now() - startTime > maxWaitTime) {
          console.log(`页面 ${configIndex} 处理超时`)
          clearTimeout(timer)
          reject(new Error('页面处理超时'))
          return
        }
        
        // 继续等待
        timer = setTimeout(checkCompletion, 1000)
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
      
      // 检查任务是否已经完成
      if (!task) {
        console.log(`任务 ${taskId} 不存在，跳过激活原始页面`)
        return
      }
      
      if (task.status === 'completed') {
        console.log(`任务 ${taskId} 已完成，仅激活原始页面`)
        // 仅激活原始页面，不重复调用handleTaskCompleted
        if (task.originalTabId) {
          await Browser.tabs.update(task.originalTabId, { active: true })
          console.log('已激活原始页面:', task.originalTabId)
        }
        return
      }
      
      if (task.originalTabId) {
        // 激活原始页面
        await Browser.tabs.update(task.originalTabId, { active: true })
        console.log('已激活原始页面:', task.originalTabId)
      } else {
        // 如果没有原始标签页ID，则查找第一个非任务标签页
        const tabs = await Browser.tabs.query({})
        const nonTaskTab = tabs.find(tab => {
          // 检查是否是任务相关的标签页
          for (const [tabId] of WebAutomationBackgroundHandlers.tabTaskMap.entries()) {
            if (tabId === tab.id) {
              return false // 是任务标签页，跳过
            }
          }
          return true // 不是任务标签页
        })
        
        if (nonTaskTab) {
          await Browser.tabs.update(nonTaskTab.id, { active: true })
          console.log('已激活找到的页面:', nonTaskTab.id)
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
    
    // 防止重复调用
    if (task.status === 'completed') {
      console.log(`任务 ${taskId} 已经完成，忽略重复调用`)
      return
    }
    
    task.status = 'completed'
    task.endTime = Date.now()
    
    console.log('批量任务完成:', task)
    
    // 清理任务相关的标签页映射
    for (const [tabId, taskInfo] of WebAutomationBackgroundHandlers.tabTaskMap.entries()) {
      if (taskInfo.taskId === taskId) {
        WebAutomationBackgroundHandlers.tabTaskMap.delete(tabId)
      }
    }
    
    // 清理任务的标签页监听器
    WebAutomationBackgroundHandlers.unregisterTaskTabListeners(taskId)
    
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
      // 查找所有属于这个任务的标签页
      const taskTabIds = []
      for (const [tabId, taskInfo] of WebAutomationBackgroundHandlers.tabTaskMap.entries()) {
        if (taskInfo.taskId === taskId) {
          taskTabIds.push(tabId)
        }
      }
      
      // 关闭标签页
      for (const tabId of taskTabIds) {
        await Browser.tabs.remove(tabId).catch(console.error)
      }
      
      console.log(`已关闭任务 ${taskId} 的 ${taskTabIds.length} 个标签页`)
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