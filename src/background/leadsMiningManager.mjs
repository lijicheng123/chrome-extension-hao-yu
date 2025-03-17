import Browser from 'webextension-polyfill'

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

  // 注册消息监听器
  registerMessageListeners()

  console.log('线索挖掘任务管理器初始化完成')
}

/**
 * 注册消息监听器
 */
function registerMessageListeners() {
  // 保留原有的消息监听器，用于向前兼容
  Browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message.type || !message.type.startsWith('LEADS_MINING_')) {
      return false
    }

    const tabId = sender.tab?.id
    let state, emails, isProcessed

    switch (message.type) {
      case 'LEADS_MINING_SAVE_STATE':
        handleSaveState(message.payload, tabId)
        sendResponse({ success: true })
        break

      case 'LEADS_MINING_GET_STATE':
        state = handleGetState(message.taskId)
        sendResponse(state)
        break

      case 'LEADS_MINING_START_TASK':
        handleStartTask(message.taskId, tabId)
        sendResponse({ success: true })
        break

      case 'LEADS_MINING_STOP_TASK':
        handleStopTask(message.taskId)
        sendResponse({ success: true })
        break

      case 'LEADS_MINING_REGISTER_EMAIL':
        handleRegisterEmail(message.taskId, message.email)
        sendResponse({ success: true })
        break

      case 'LEADS_MINING_GET_EMAILS':
        emails = handleGetEmails(message.taskId)
        sendResponse({ emails })
        break

      case 'LEADS_MINING_CHECK_URL':
        isProcessed = handleCheckUrl(message.taskId, message.url)
        sendResponse({ isProcessed })
        break

      case 'LEADS_MINING_REGISTER_URL':
        handleRegisterUrl(message.taskId, message.url)
        sendResponse({ success: true })
        break
    }

    return true // 保持消息通道开放，以支持异步响应
  })

  // 添加新的基于回调的消息监听器
  Browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message.action || message.action !== 'LEADS_MINING_REQUEST') {
      return false
    }

    const { id, type, data } = message
    const tabId = sender.tab?.id
    let response = null
    let error = null

    try {
      switch (type) {
        case 'LEADS_MINING_SAVE_STATE':
          handleSaveState(data.payload, tabId)
          response = { success: true }
          break

        case 'LEADS_MINING_GET_STATE':
          response = handleGetState(data.taskId)
          break

        case 'LEADS_MINING_START_TASK':
          handleStartTask(data.taskId, tabId)
          response = { success: true }
          break

        case 'LEADS_MINING_STOP_TASK':
          handleStopTask(data.taskId)
          response = { success: true }
          break

        case 'LEADS_MINING_REGISTER_EMAIL':
          handleRegisterEmail(data.taskId, data.email)
          response = { success: true }
          break

        case 'LEADS_MINING_GET_EMAILS':
          response = { emails: handleGetEmails(data.taskId) }
          break

        case 'LEADS_MINING_CHECK_URL':
          response = { isProcessed: handleCheckUrl(data.taskId, data.url) }
          break

        case 'LEADS_MINING_REGISTER_URL':
          handleRegisterUrl(data.taskId, data.url)
          response = { success: true }
          break

        default:
          error = `未知的消息类型: ${type}`
      }
    } catch (err) {
      error = err.message || '处理请求时出错'
      console.error('处理请求时出错:', err)
    }

    // 发送响应回content script
    Browser.tabs
      .sendMessage(tabId, {
        action: 'LEADS_MINING_RESPONSE',
        id,
        response,
        error,
      })
      .catch((err) => {
        console.error('发送响应时出错:', err)
      })

    // 立即返回true，表示我们会异步处理
    sendResponse(true)
    return true
  })
}

/**
 * 处理保存状态请求
 * @param {Object} state - 任务状态
 * @param {number} tabId - 标签页ID
 */
function handleSaveState(state, tabId) {
  if (!state || !state.taskId) return

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
  if (!taskId || !tabId) return

  // 检查任务是否已在其他标签页中运行
  const existingTabId = activeTaskTabs[taskId]
  if (existingTabId && existingTabId !== tabId) {
    // 通知原标签页停止任务
    Browser.tabs
      .sendMessage(existingTabId, {
        type: 'LEADS_MINING_TASK_TAKEN_OVER',
        taskId,
      })
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
}

/**
 * 处理停止任务请求
 * @param {string} taskId - 任务ID
 */
function handleStopTask(taskId) {
  if (!taskId || !taskStates[taskId]) return

  taskStates[taskId].taskStatus = 'idle'

  if (activeTaskTabs[taskId]) {
    delete activeTaskTabs[taskId]
  }

  persistTaskStates()
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

  return taskStates[taskId].processedUrls.includes(url)
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

  // 检查URL是否已存在
  if (!taskStates[taskId].processedUrls.includes(url)) {
    taskStates[taskId].processedUrls.push(url)
    persistTaskStates()
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
  const maxAge = 7 * 24 * 60 * 60 * 1000 // 7天

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
