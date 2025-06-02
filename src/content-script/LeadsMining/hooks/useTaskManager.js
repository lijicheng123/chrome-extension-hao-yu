import { useState, useEffect } from 'react'
import Browser from 'webextension-polyfill'
import { customerDevService } from '../../../services/api/leadsMining'

/**
 * 任务管理Hook
 * 负责任务的获取、选择和状态管理
 */
export const useTaskManager = () => {
  const [taskList, setTaskList] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [searchCombinations, setSearchCombinations] = useState([])
  // 最大页数写死为10
  const maxPages = 20

  // 初始化：从存储中获取任务列表和选中的任务
  useEffect(() => {
    getTaskList()
  }, [getTaskList])

  useEffect(() => {
    generateSearchCombinations(selectedTask)
  }, [selectedTask])

  /**
   * 获取任务列表
   * 如果是详情页则从缓存取
   * 如果是结果列表页则先从缓存取，如果缓存过期或者为空则从服务器取
   * @param {Boolean} forceRefresh 是否强制刷新
   * @returns 任务列表
   */
  const getTaskList = async (forceRefresh = false) => {
    let [taskList, selectedTask] = await getTaskListAndSelectedTaskFromStorage()
    if (!taskList || forceRefresh) {
      taskList = await getTaskListFromServer()
    }
    handleTaskListChange(taskList)
    handleSelectedTaskChange(selectedTask || taskList[0])
    return [taskList, selectedTask]
  }

  /**
   * 从存储中获取任务列表和选中的任务
   */
  const getTaskListAndSelectedTaskFromStorage = async () => {
    const now = Date.now()
    const maxAge = 0.5 * 24 * 60 * 60 * 1000 // 0.5天
    const storedTaskList = await Browser.storage.local.get(['taskList', 'taskListLastUpdated'])
    if (!storedTaskList?.taskList || now - storedTaskList?.taskListLastUpdated > maxAge) {
      return [null, null]
    }

    const storedSelectedTask = await Browser.storage.local.get([
      'selectedTask',
      'selectedTaskLastUpdated',
    ])
    if (
      !storedSelectedTask?.selectedTask ||
      now - storedSelectedTask?.selectedTaskLastUpdated > maxAge
    ) {
      return [storedTaskList.taskList, null]
    }

    return [storedTaskList.taskList, storedSelectedTask.selectedTask]
  }

  /**
   * 从服务器获取任务列表
   * @returns 任务列表
   */
  const getTaskListFromServer = async () => {
    try {
      console.log('fetchTaskList===> start')
      const taskList = await customerDevService.getTaskList()
      console.log('fetchTaskList===> taskList', taskList)
      return taskList
    } catch (error) {
      console.error('fetchTaskList:', error)
      return []
    }
  }

  /**
   * 处理任务列表变化
   * @param {Array} taskList 任务列表
   */
  const handleTaskListChange = async (taskList) => {
    setTaskList(taskList)
    await Browser.storage.local.set({
      taskList: taskList,
      taskListLastUpdated: Date.now(),
    })
  }

  /**
   * 处理选中的任务变化
   * @param {Object} selectedTask 选中的任务
   */
  const handleSelectedTaskChange = async (selectedTask) => {
    setSelectedTask(selectedTask)
    await Browser.storage.local.set({
      selectedTask: selectedTask,
      selectedTaskLastUpdated: Date.now(),
    })
  }

  /**
   * 任务选择处理
   * @param {String} taskId 任务ID
   */
  const handleTaskSelect = async (taskId) => {
    const task = taskList.find((t) => t.id === taskId)
    if (!task) return

    setSelectedTask(task)
    await Browser.storage.local.set({
      selectedTask: task,
      selectedTaskLastUpdated: Date.now(),
    })

    // 生成搜索组合
    generateSearchCombinations(task)
  }

  /**
   * 生成搜索组合
   * @param {Object} task 任务
   */
  const generateSearchCombinations = (task) => {
    if (!task) return

    const { keywords = '', exclusion_keywords = '', email_suffixes = '' } = task
    const keywordList = (keywords || '').split('\n').filter((k) => k.trim())
    const emailSuffixList = (email_suffixes || '').split('\n').filter((k) => k.trim())
    const exclusionList = (exclusion_keywords || '').split('\n').filter((k) => k.trim())

    const combinations = []

    keywordList.forEach((keyword) => {
      let searchTerm = keyword.trim()

      // 添加排除词
      if (exclusionList.length > 0) {
        searchTerm += ' ' + exclusionList.map((ex) => `-${ex.trim()}`).join(' ')
      }

      // 添加邮箱后缀
      if (emailSuffixList.length > 0) {
        searchTerm += ' ' + emailSuffixList.map((suffix) => `${suffix.trim()}`).join(' ')
      }

      combinations.push(searchTerm)
    })

    setSearchCombinations(combinations)
  }

  return {
    taskList,
    selectedTask,
    searchCombinations,
    maxPages,
    handleTaskSelect,
    fetchTaskList: getTaskList,
    generateSearchCombinations,
  }
}
