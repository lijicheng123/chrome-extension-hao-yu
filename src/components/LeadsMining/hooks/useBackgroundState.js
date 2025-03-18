import { useState, useEffect, useCallback, useRef } from 'react'
import Browser from 'webextension-polyfill'

/**
 * 与background脚本通信的Hook
 * 用于管理任务状态
 */
export const useBackgroundState = (selectedTask) => {
  const [taskStatus, setTaskStatus] = useState('idle')
  const [currentSearchTerm, setCurrentSearchTerm] = useState('')
  const [currentCombinationIndex, setCurrentCombinationIndex] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [progress, setProgress] = useState(0)
  const [discoveredEmails, setDiscoveredEmails] = useState(0)
  const [captchaDetected, setCaptchaDetected] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [emailList, setEmailList] = useState([])

  // 用于存储回调函数的引用
  const callbacksRef = useRef({})
  const requestIdRef = useRef(0)

  // 初始化消息监听器
  useEffect(() => {
    const handleMessage = (message) => {
      if (!message.action || message.action !== 'LEADS_MINING_RESPONSE') {
        return
      }

      const { id, response, error } = message
      const callback = callbacksRef.current[id]

      if (callback) {
        if (error) {
          callback.reject(new Error(error))
        } else {
          callback.resolve(response)
        }
        delete callbacksRef.current[id]
      }
    }

    Browser.runtime.onMessage.addListener(handleMessage)

    return () => {
      Browser.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  // 发送消息到background并等待响应
  const sendMessageToBackground = useCallback((type, data = {}) => {
    const requestId = requestIdRef.current++

    return new Promise((resolve, reject) => {
      // 存储回调
      callbacksRef.current[requestId] = { resolve, reject }

      // 发送消息
      Browser.runtime
        .sendMessage({
          action: 'LEADS_MINING_REQUEST',
          id: requestId,
          type,
          data,
        })
        .catch((error) => {
          delete callbacksRef.current[requestId]
          reject(error)
        })
    })
  }, [])

  // 初始化：从background获取任务状态
  useEffect(() => {
    if (selectedTask?.id) {
      getStateFromBackground()
    }
  }, [selectedTask])

  // 监听来自background的消息
  useEffect(() => {
    const handleMessage = (message) => {
      if (!message.type || !message.type.startsWith('LEADS_MINING_')) {
        return
      }

      switch (message.type) {
        case 'LEADS_MINING_TASK_TAKEN_OVER':
          if (message.taskId === selectedTask?.id) {
            setTaskStatus('paused')
            setStatusMessage('任务已在其他标签页中启动')
          }
          break
      }
    }

    Browser.runtime.onMessage.addListener(handleMessage)

    return () => {
      Browser.runtime.onMessage.removeListener(handleMessage)
    }
  }, [selectedTask])

  // 从background获取任务状态
  const getStateFromBackground = useCallback(async () => {
    if (!selectedTask?.id) return
    try {
      // 使用新的消息传递方式
      const state = await sendMessageToBackground('LEADS_MINING_GET_STATE', {
        taskId: selectedTask.id,
      })

      console.log('getStateFromBackground state =========>', state)

      if (state) {
        setTaskStatus(state.taskStatus || 'idle')
        setCurrentSearchTerm(state.currentSearchTerm || '')
        setCurrentCombinationIndex(state.currentCombinationIndex || 0)
        setCurrentPage(state.currentPage || 1)
        setProgress(state.progress || 0)
        setDiscoveredEmails(state.discoveredEmails || 0)
        setCaptchaDetected(state.captchaDetected || false)
        setStatusMessage(state.statusMessage || '')

        // 获取邮箱列表
        const response = await sendMessageToBackground('LEADS_MINING_GET_EMAILS', {
          taskId: selectedTask.id,
        })

        console.log('getEmailListFromBackground response =========>', response)

        if (response && response.emails) {
          setEmailList(response.emails)
        }
      }
    } catch (error) {
      console.error('获取任务状态失败:', error)
    }
  }, [selectedTask, sendMessageToBackground])

  // 保存状态到background
  const saveStateToBackground = useCallback(
    async (state) => {
      if (!selectedTask?.id) return

      try {
        await sendMessageToBackground('LEADS_MINING_SAVE_STATE', {
          payload: {
            taskId: selectedTask.id,
            taskStatus,
            currentSearchTerm,
            currentCombinationIndex,
            currentPage,
            progress,
            discoveredEmails,
            captchaDetected,
            statusMessage,
            ...state,
          },
        })
      } catch (error) {
        console.error('保存任务状态失败:', error)
      }
    },
    [
      selectedTask,
      taskStatus,
      currentSearchTerm,
      currentCombinationIndex,
      currentPage,
      progress,
      discoveredEmails,
      captchaDetected,
      statusMessage,
      sendMessageToBackground,
    ],
  )

  // 开始任务
  const startTask = useCallback(async () => {
    if (!selectedTask?.id) return

    try {
      await sendMessageToBackground('LEADS_MINING_START_TASK', {
        taskId: selectedTask.id,
      })

      setTaskStatus('running')
      setCaptchaDetected(false)
      setStatusMessage('任务开始执行')

      // 如果是从头开始，重置状态
      if (currentCombinationIndex === 0 && currentPage === 1) {
        setProgress(0)
        setDiscoveredEmails(0)
      }

      await saveStateToBackground()
    } catch (error) {
      console.error('开始任务失败:', error)
    }
  }, [
    selectedTask,
    currentCombinationIndex,
    currentPage,
    saveStateToBackground,
    sendMessageToBackground,
  ])

  // 暂停任务
  const pauseTask = useCallback(async () => {
    setTaskStatus('paused')
    setStatusMessage('任务已暂停')
    await saveStateToBackground()
  }, [saveStateToBackground])

  // 继续任务
  const resumeTask = useCallback(async () => {
    setTaskStatus('running')
    setStatusMessage('任务继续执行')
    await saveStateToBackground()
  }, [saveStateToBackground])

  // 停止任务
  const stopTask = useCallback(async () => {
    if (!selectedTask?.id) return

    try {
      await sendMessageToBackground('LEADS_MINING_STOP_TASK', {
        taskId: selectedTask.id,
      })

      setTaskStatus('idle')
      setStatusMessage('任务已停止')
    } catch (error) {
      console.error('停止任务失败:', error)
    }
  }, [selectedTask, sendMessageToBackground])

  // 完成任务
  const completeTask = useCallback(async () => {
    setTaskStatus('completed')
    setStatusMessage('任务已完成')
    setProgress(100)
    await saveStateToBackground()
  }, [saveStateToBackground])

  // 处理验证码检测
  const handleCaptchaDetected = useCallback(async () => {
    setCaptchaDetected(true)
    setTaskStatus('paused')
    setStatusMessage('检测到验证码，任务已暂停。请手动完成验证后继续。')
    await saveStateToBackground()
  }, [saveStateToBackground])

  // 重置验证码状态
  const resetCaptchaState = useCallback(() => {
    setCaptchaDetected(false)
  }, [])

  // 检查URL是否已处理
  const isUrlProcessed = useCallback(
    async (url) => {
      if (!selectedTask?.id || !url) return false

      try {
        console.log(`正在检查URL是否已处理: ${url}`, `任务ID: ${selectedTask.id}`)

        const response = await sendMessageToBackground('LEADS_MINING_CHECK_URL', {
          taskId: selectedTask.id,
          url,
        })

        console.log('isUrlProcessed response =========>', response, `URL: ${url}`)

        // 添加额外检查，确保返回的response是预期格式
        if (!response || typeof response.isProcessed !== 'boolean') {
          console.warn('检查URL处理状态时收到异常响应:', response, `URL: ${url}`)
          return false
        }

        return response.isProcessed
      } catch (error) {
        console.error('检查URL失败:', error, `URL: ${url}`)
        return false
      }
    },
    [selectedTask, sendMessageToBackground],
  )

  // 注册已处理的URL
  const registerProcessedUrl = useCallback(
    async (url) => {
      if (!selectedTask?.id || !url) return

      try {
        await sendMessageToBackground('LEADS_MINING_REGISTER_URL', {
          taskId: selectedTask.id,
          url,
        })
      } catch (error) {
        console.error('注册URL失败:', error)
      }
    },
    [selectedTask, sendMessageToBackground],
  )

  // 注册发现的邮箱
  const registerEmail = useCallback(
    async (email) => {
      if (!selectedTask?.id || !email) return

      try {
        await sendMessageToBackground('LEADS_MINING_REGISTER_EMAIL', {
          taskId: selectedTask.id,
          email,
        })

        // 更新本地邮箱列表
        if (!emailList.includes(email)) {
          setEmailList((prev) => [...prev, email])
          setDiscoveredEmails((prev) => prev + 1)
        }
      } catch (error) {
        console.error('注册邮箱失败:', error)
      }
    },
    [selectedTask, emailList, sendMessageToBackground],
  )

  // 更新状态
  const updateState = useCallback(
    async (newState) => {
      // 更新本地状态
      if (newState.taskStatus !== undefined) setTaskStatus(newState.taskStatus)
      if (newState.currentSearchTerm !== undefined) setCurrentSearchTerm(newState.currentSearchTerm)
      if (newState.currentCombinationIndex !== undefined)
        setCurrentCombinationIndex(newState.currentCombinationIndex)
      if (newState.currentPage !== undefined) setCurrentPage(newState.currentPage)
      if (newState.progress !== undefined) setProgress(newState.progress)
      if (newState.discoveredEmails !== undefined) setDiscoveredEmails(newState.discoveredEmails)
      if (newState.captchaDetected !== undefined) setCaptchaDetected(newState.captchaDetected)
      if (newState.statusMessage !== undefined) setStatusMessage(newState.statusMessage)

      // 保存到background
      await saveStateToBackground(newState)
    },
    [saveStateToBackground],
  )

  return {
    // 状态
    taskStatus,
    currentSearchTerm,
    currentCombinationIndex,
    currentPage,
    progress,
    discoveredEmails,
    captchaDetected,
    statusMessage,
    emailList,

    // 状态更新方法
    setCurrentSearchTerm,
    setCurrentCombinationIndex,
    setCurrentPage,
    setProgress,
    setDiscoveredEmails,
    setStatusMessage,

    // 任务控制方法
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    completeTask,

    // 状态管理方法
    updateState,
    getStateFromBackground,
    saveStateToBackground,
    handleCaptchaDetected,
    resetCaptchaState,

    // URL和邮箱处理方法
    isUrlProcessed,
    registerProcessedUrl,
    registerEmail,
  }
}
