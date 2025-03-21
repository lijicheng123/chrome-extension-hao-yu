import { useState, useEffect, useCallback } from 'react'
import { LeadsMiningContentAPI, LEADS_MINING_API } from '../../../services/messaging/leadsMining'
import leadsMiningService from '../../../services/messaging/leadsMining'

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

  // 初始化消息监听器
  useEffect(() => {
    // 使用消息服务监听任务被接管事件
    const handleTaskTakenOver = (data) => {
      console.log('收到任务被接管事件', data)
      if (data.taskId === selectedTask?.id) {
        setTaskStatus('paused')
        setStatusMessage('任务已在其他标签页中启动')
      }
    }

    // 注册消息处理器
    leadsMiningService.registerHandler(LEADS_MINING_API.TASK_TAKEN_OVER, handleTaskTakenOver)

    return () => {
      // 清理处理器
      leadsMiningService._handlers[LEADS_MINING_API.TASK_TAKEN_OVER] = undefined
    }
  }, [selectedTask])

  // 初始化：从background获取任务状态
  useEffect(() => {
    if (selectedTask?.id) {
      getStateFromBackground()
    }
  }, [selectedTask])

  // 从background获取任务状态
  const getStateFromBackground = useCallback(async () => {
    if (!selectedTask?.id) return
    try {
      // 使用新的API获取任务状态
      const state = await LeadsMiningContentAPI.getState(selectedTask.id)

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
        const response = await LeadsMiningContentAPI.getEmails(selectedTask.id)

        console.log('getEmailListFromBackground response =========>', response)

        if (response && response.emails) {
          setEmailList(response.emails)
        }
      }
    } catch (error) {
      console.error('获取任务状态失败:', error)
    }
  }, [selectedTask])

  // 保存状态到background
  const saveStateToBackground = useCallback(
    async (state) => {
      if (!selectedTask?.id) return
      try {
        // 不要发送processedUrls字段，这样可以避免覆盖后台已有的processedUrls
        await LeadsMiningContentAPI.saveState({
          taskId: selectedTask.id,
          taskStatus,
          currentSearchTerm,
          currentCombinationIndex,
          currentPage,
          progress,
          discoveredEmails,
          captchaDetected,
          statusMessage,
          // 明确设置processedUrls为undefined，这样后台会保留现有的processedUrls
          processedUrls: undefined,
          ...state,
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
    ],
  )

  // 开始任务
  const startTask = useCallback(async () => {
    if (!selectedTask?.id) return

    try {
      await LeadsMiningContentAPI.startTask(selectedTask.id)

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
  }, [selectedTask, currentCombinationIndex, currentPage, saveStateToBackground])

  // 暂停任务
  const pauseTask = useCallback(async () => {
    if (!selectedTask?.id) return

    try {
      await LeadsMiningContentAPI.pauseTask(selectedTask.id)

      setTaskStatus('paused')
      setStatusMessage('任务已暂停')
      await saveStateToBackground()
    } catch (error) {
      console.error('暂停任务失败:', error)
    }
  }, [selectedTask, saveStateToBackground])

  // 继续任务
  const resumeTask = useCallback(async () => {
    if (!selectedTask?.id) return

    try {
      await LeadsMiningContentAPI.resumeTask(selectedTask.id)

      setTaskStatus('running')
      setStatusMessage('任务继续执行')
      await saveStateToBackground()
    } catch (error) {
      console.error('继续任务失败:', error)
    }
  }, [selectedTask, saveStateToBackground])

  // 停止任务
  const stopTask = useCallback(async () => {
    if (!selectedTask?.id) return

    try {
      await LeadsMiningContentAPI.stopTask(selectedTask.id)

      setTaskStatus('idle')
      setStatusMessage('任务已停止')
      await saveStateToBackground()
    } catch (error) {
      console.error('停止任务失败:', error)
    }
  }, [selectedTask, saveStateToBackground])

  // 完成任务
  const completeTask = useCallback(async () => {
    if (!selectedTask?.id) return

    try {
      await LeadsMiningContentAPI.completeTask(selectedTask.id)

      setTaskStatus('completed')
      setStatusMessage('任务已完成')
      setProgress(100)
      await saveStateToBackground()
    } catch (error) {
      console.error('完成任务失败:', error)
    }
  }, [selectedTask, saveStateToBackground])

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

        const response = await LeadsMiningContentAPI.checkUrl(selectedTask.id, url)

        console.log('isUrlProcessed response =========>', response, `URL: ${url}`)

        return response
      } catch (error) {
        console.error('检查URL失败:', error, `URL: ${url}`)
        return false
      }
    },
    [selectedTask],
  )

  // 注册已处理的URL
  const registerProcessedUrl = useCallback(
    async (url) => {
      if (!selectedTask?.id || !url) return

      try {
        await LeadsMiningContentAPI.registerUrl(selectedTask.id, url)
      } catch (error) {
        console.error('注册URL失败:', error)
      }
    },
    [selectedTask],
  )

  // 注册发现的邮箱
  const registerEmail = useCallback(
    async (email) => {
      if (!selectedTask?.id || !email) return

      try {
        await LeadsMiningContentAPI.registerEmail(selectedTask.id, email)

        // 更新本地邮箱列表
        if (!emailList.includes(email)) {
          setEmailList((prev) => [...prev, email])
          setDiscoveredEmails((prev) => prev + 1)
        }
      } catch (error) {
        console.error('注册邮箱失败:', error)
      }
    },
    [selectedTask, emailList],
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
