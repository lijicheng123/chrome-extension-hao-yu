import Browser from 'webextension-polyfill'
import leadsMiningService, { LEADS_MINING_API } from '../services/messaging/leadsMining'

/**
 * 线索挖掘任务管理器
 * 负责管理线索挖掘任务的状态，并与content script通信
 */

// 任务状态存储
const taskStates = {}

// 活动任务标签页映射 {taskId: tabId}
const activeTaskTabs = {}

// 初始化
export async function initLeadsMiningManager() {
  // 从存储中恢复任务状态
  const storage = await Browser.storage.local.get('leadsMiningTaskStates')
  if (storage.leadsMiningTaskStates) {
    Object.assign(taskStates, storage.leadsMiningTaskStates)
  }

  // 监听标签页关闭事件
  Browser.tabs.onRemoved.addListener(handleTabRemoved)

  // 注册消息处理器
  registerMessageHandlers()

  console.log('线索挖掘任务管理器初始化完成')
}

/**
 * 注册消息处理器
 */
function registerMessageHandlers() {
  // 只保留新的消息处理器
  leadsMiningService.registerHandlers({
    // 状态管理
    [LEADS_MINING_API.GET_STATE]: (data) => handleGetState(data.taskId),
    [LEADS_MINING_API.SAVE_STATE]: (data, sender) => handleSaveState(data.payload, sender.tab?.id),

    // 任务控制
    [LEADS_MINING_API.START_TASK]: (data, sender) => handleStartTask(data.taskId, sender.tab?.id),
    [LEADS_MINING_API.PAUSE_TASK]: (data) => handlePauseTask(data.taskId),
    [LEADS_MINING_API.RESUME_TASK]: (data, sender) => handleResumeTask(data.taskId, sender.tab?.id),
    [LEADS_MINING_API.STOP_TASK]: (data) => handleStopTask(data.taskId),
    [LEADS_MINING_API.COMPLETE_TASK]: (data) => handleCompleteTask(data.taskId),

    // 邮箱管理
    [LEADS_MINING_API.REGISTER_EMAIL]: (data) => handleRegisterEmail(data.taskId, data.email),
    [LEADS_MINING_API.GET_EMAILS]: (data) => ({ emails: handleGetEmails(data.taskId) }),

    // URL管理
    [LEADS_MINING_API.CHECK_URL]: (data) => {
      console.log(`收到检查URL请求: ${data.url}, 任务ID: ${data.taskId}`)
      if (!data.taskId || !data.url) {
        console.warn('检查URL请求缺少taskId或url参数')
        return { isProcessed: false }
      }

      const isProcessed = handleCheckUrl(data.taskId, data.url)
      console.log(`URL处理状态检查结果: ${isProcessed ? '已处理' : '未处理'}, URL: ${data.url}`)
      return { isProcessed }
    },
    [LEADS_MINING_API.REGISTER_URL]: (data) => handleRegisterUrl(data.taskId, data.url),
  })
}

/**
 * 处理保存状态请求
 * @param {Object} state - 任务状态
 * @param {number} tabId - 标签页ID
 */
function handleSaveState(state, tabId) {
  if (!state || !state.taskId) return { success: false, error: '缺少必要参数' }

  const taskId = state.taskId

  // 更新任务状态
  taskStates[taskId] = {
    ...state,
    lastUpdated: Date.now(),
    tabId,
  }

  // 如果任务正在运行，更新活动标签页映射
  if (state.taskStatus === 'running' && tabId) {
    activeTaskTabs[taskId] = tabId
  } else if (state.taskStatus !== 'running' && activeTaskTabs[taskId]) {
    delete activeTaskTabs[taskId]
  }

  // 持久化到存储
  persistTaskStates()

  return { success: true }
}

/**
 * 处理获取状态请求
 * @param {string} taskId - 任务ID
 * @returns {Object|null} 任务状态
 */
function handleGetState(taskId) {
  return taskStates[taskId] || null
}

/**
 * 处理开始任务请求
 * @param {string} taskId - 任务ID
 * @param {number} tabId - 标签页ID
 */
function handleStartTask(taskId, tabId) {
  if (!taskId || !tabId) return { success: false, error: '缺少必要参数' }

  // 检查任务是否已在其他标签页中运行
  const existingTabId = activeTaskTabs[taskId]
  if (existingTabId && existingTabId !== tabId) {
    // 通知原标签页停止任务
    leadsMiningService
      .sendMessageToTab(existingTabId, LEADS_MINING_API.TASK_TAKEN_OVER, { taskId })
      .catch(() => {
        // 如果发送失败，可能标签页已关闭，直接更新映射
        activeTaskTabs[taskId] = tabId
      })
  } else {
    activeTaskTabs[taskId] = tabId
  }

  // 初始化或更新任务状态
  if (!taskStates[taskId]) {
    taskStates[taskId] = {
      taskId,
      taskStatus: 'running',
      currentPage: 1,
      currentCombinationIndex: 0,
      progress: 0,
      discoveredEmails: 0,
      processedUrls: [],
      emails: [],
      lastUpdated: Date.now(),
      tabId,
    }
  } else {
    taskStates[taskId] = {
      ...taskStates[taskId],
      taskStatus: 'running',
      lastUpdated: Date.now(),
      tabId,
    }
  }

  persistTaskStates()

  return { success: true }
}

/**
 * 处理暂停任务请求
 * @param {string} taskId - 任务ID
 */
function handlePauseTask(taskId) {
  if (!taskId || !taskStates[taskId]) return { success: false, error: '任务不存在' }

  taskStates[taskId].taskStatus = 'paused'
  taskStates[taskId].statusMessage = '任务已暂停'
  taskStates[taskId].lastUpdated = Date.now()

  if (activeTaskTabs[taskId]) {
    delete activeTaskTabs[taskId]
  }

  persistTaskStates()

  return { success: true }
}

/**
 * 处理继续任务请求
 * @param {string} taskId - 任务ID
 * @param {number} tabId - 标签页ID
 */
function handleResumeTask(taskId, tabId) {
  if (!taskId || !tabId || !taskStates[taskId]) return { success: false, error: '任务不存在' }

  taskStates[taskId].taskStatus = 'running'
  taskStates[taskId].statusMessage = '任务继续执行'
  taskStates[taskId].lastUpdated = Date.now()
  taskStates[taskId].tabId = tabId

  activeTaskTabs[taskId] = tabId

  persistTaskStates()

  return { success: true }
}

/**
 * 处理完成任务请求
 * @param {string} taskId - 任务ID
 */
function handleCompleteTask(taskId) {
  if (!taskId || !taskStates[taskId]) return { success: false, error: '任务不存在' }

  taskStates[taskId].taskStatus = 'completed'
  taskStates[taskId].statusMessage = '任务已完成'
  taskStates[taskId].progress = 100
  taskStates[taskId].lastUpdated = Date.now()

  if (activeTaskTabs[taskId]) {
    delete activeTaskTabs[taskId]
  }

  persistTaskStates()

  return { success: true }
}

/**
 * 处理停止任务请求
 * @param {string} taskId - 任务ID
 */
function handleStopTask(taskId) {
  if (!taskId || !taskStates[taskId]) return { success: false, error: '任务不存在' }

  taskStates[taskId].taskStatus = 'idle'
  taskStates[taskId].lastUpdated = Date.now()

  if (activeTaskTabs[taskId]) {
    delete activeTaskTabs[taskId]
  }

  persistTaskStates()

  return { success: true }
}

/**
 * 处理注册邮箱请求
 * @param {string} taskId - 任务ID
 * @param {string} email - 邮箱地址
 */
function handleRegisterEmail(taskId, email) {
  if (!taskId || !email || !taskStates[taskId]) return

  if (!taskStates[taskId].emails) {
    taskStates[taskId].emails = []
  }

  // 检查邮箱是否已存在
  if (!taskStates[taskId].emails.includes(email)) {
    taskStates[taskId].emails.push(email)
    taskStates[taskId].discoveredEmails = taskStates[taskId].emails.length
    persistTaskStates()
  }
}

/**
 * 处理获取邮箱列表请求
 * @param {string} taskId - 任务ID
 * @returns {string[]} 邮箱列表
 */
function handleGetEmails(taskId) {
  if (!taskId || !taskStates[taskId] || !taskStates[taskId].emails) {
    return []
  }

  return taskStates[taskId].emails
}

/**
 * 规范化URL，去除无关参数
 * @param {string} url - 原始URL
 * @returns {string} 规范化后的URL
 */
function normalizeUrl(url) {
  try {
    // 解析URL
    const urlObj = new URL(url)

    // 忽略这些常见的跟踪参数
    const paramsToIgnore = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'msclkid',
      'ref',
      'source',
      'ref_src',
      '_ga',
      'yclid',
      'leadsMining_pageDepth',
    ]

    // 移除这些参数
    paramsToIgnore.forEach((param) => {
      urlObj.searchParams.delete(param)
    })

    // 返回基本URL，对于大多数情况，我们只关心域名和路径
    // 如果有必要的查询参数，保留它们
    if (urlObj.search) {
      return `${urlObj.origin}${urlObj.pathname}${urlObj.search}`
    }

    return `${urlObj.origin}${urlObj.pathname}`
  } catch (error) {
    console.error('URL规范化失败:', error)
    return url // 如果解析失败，返回原始URL
  }
}

/**
 * 处理检查URL是否已处理请求
 * @param {string} taskId - 任务ID
 * @param {string} url - URL地址
 * @returns {boolean} 是否已处理
 */
function handleCheckUrl(taskId, url) {
  if (!taskId || !url || !taskStates[taskId]) return false

  if (!taskStates[taskId].processedUrls) {
    taskStates[taskId].processedUrls = []
  }

  // 规范化URL
  const normalizedUrl = normalizeUrl(url)

  // 检查规范化的URL是否已被处理
  return taskStates[taskId].processedUrls.some((processedUrl) => {
    const normalizedProcessedUrl = normalizeUrl(processedUrl)
    return normalizedProcessedUrl === normalizedUrl
  })
}

/**
 * 处理注册URL请求
 * @param {string} taskId - 任务ID
 * @param {string} url - URL地址
 */
function handleRegisterUrl(taskId, url) {
  if (!taskId || !url || !taskStates[taskId]) return

  if (!taskStates[taskId].processedUrls) {
    taskStates[taskId].processedUrls = []
  }

  // 规范化URL
  const normalizedUrl = normalizeUrl(url)

  // 检查URL是否已存在（比较规范化后的URL）
  const exists = taskStates[taskId].processedUrls.some((processedUrl) => {
    const normalizedProcessedUrl = normalizeUrl(processedUrl)
    return normalizedProcessedUrl === normalizedUrl
  })

  // 如果URL不存在，则添加原始URL（保留完整信息）
  if (!exists) {
    taskStates[taskId].processedUrls.push(url)
    persistTaskStates()
    console.log(
      `URL已注册: ${url} (规范化为: ${normalizedUrl}), 已处理URL总数: ${taskStates[taskId].processedUrls.length}`,
    )
  } else {
    console.log(
      `URL已存在，不重复注册: ${url} (规范化为: ${normalizedUrl}), 已处理URL总数: ${taskStates[taskId].processedUrls.length}`,
    )
  }
}

/**
 * 处理标签页关闭事件
 * @param {number} tabId - 标签页ID
 */
function handleTabRemoved(tabId) {
  // 检查是否有任务在此标签页中运行
  for (const [taskId, activeTabId] of Object.entries(activeTaskTabs)) {
    if (activeTabId === tabId) {
      // 更新任务状态为暂停
      if (taskStates[taskId]) {
        taskStates[taskId].taskStatus = 'paused'
        taskStates[taskId].statusMessage = '标签页已关闭，任务已暂停'
      }

      delete activeTaskTabs[taskId]
      persistTaskStates()
    }
  }
}

/**
 * 持久化任务状态到存储
 */
function persistTaskStates() {
  // 清理过期数据
  cleanupTaskStates()

  // 保存到存储
  Browser.storage.local.set({ leadsMiningTaskStates: taskStates })
}

/**
 * 清理过期的任务状态
 */
function cleanupTaskStates() {
  const now = Date.now()
  const maxAge = 1 * 24 * 60 * 60 * 1000 // 1天

  for (const taskId in taskStates) {
    // 删除超过7天未更新的任务状态
    if (taskStates[taskId].lastUpdated && now - taskStates[taskId].lastUpdated > maxAge) {
      delete taskStates[taskId]
    }

    // 限制处理过的URL数量，防止存储过大
    if (taskStates[taskId].processedUrls && taskStates[taskId].processedUrls.length > 1000) {
      // 只保留最近的1000个URL
      taskStates[taskId].processedUrls = taskStates[taskId].processedUrls.slice(-1000)
    }
  }
}

/**
 * 获取任务的活动标签页
 * @param {string} taskId - 任务ID
 * @returns {number|null} 标签页ID
 */
export function getTaskActiveTab(taskId) {
  return activeTaskTabs[taskId] || null
}

/**
 * 获取所有任务状态
 * @returns {Object} 任务状态映射
 */
export function getAllTaskStates() {
  return { ...taskStates }
}

/**
 * 清除任务状态
 * @param {string} taskId - 任务ID
 */
export function clearTaskState(taskId) {
  if (taskStates[taskId]) {
    delete taskStates[taskId]

    if (activeTaskTabs[taskId]) {
      delete activeTaskTabs[taskId]
    }

    persistTaskStates()
  }
}
