import { useState, useEffect } from 'react'
import Browser from 'webextension-polyfill'
import { message } from 'antd'
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
  const maxPages = 10

  // 初始化：从存储中获取任务列表和选中的任务
  useEffect(() => {
    const fetchTaskListFromStorage = async () => {
      const storedTaskList = await getTaskList()
      if (storedTaskList?.length > 0) {
        setTaskList(storedTaskList)
        const storedSelectedTask = await Browser.storage.local.get('selectedTask')

        if (storedSelectedTask.selectedTask) {
          setSelectedTask(storedSelectedTask.selectedTask)
          // 生成搜索组合
          generateSearchCombinations(storedSelectedTask.selectedTask)
        }
      }
    }

    fetchTaskListFromStorage()
  }, [])

  // 获取任务列表
  const getTaskList = async () => {
    let taskList = (await Browser.storage.local.get('taskList')?.taskList) || []

    taskList = await fetchTaskList()
    return taskList || []
  }

  // 从API获取任务列表
  const fetchTaskList = async () => {
    console.log('fetchTaskList===> start')
    try {
      const taskList = await customerDevService.getTaskList()
      console.log('fetchTaskList===> taskList', taskList)
      await Browser.storage.local.set({ taskList: taskList })
      setTaskList(taskList)

      if (taskList.length > 0 && !selectedTask) {
        setSelectedTask(taskList[0])
        await Browser.storage.local.set({ selectedTask: taskList[0] })
        generateSearchCombinations(taskList[0])
      }

      return taskList
    } catch (error) {
      console.error('fetchTaskList:', error)
      message.error({
        content: `获取任务列表失败: ${error.message}`,
        duration: 5,
      })
      return []
    }
  }

  // 任务选择处理
  const handleTaskSelect = async (taskId) => {
    const task = taskList.find((t) => t.id === taskId)
    if (!task) return

    setSelectedTask(task)
    await Browser.storage.local.set({ selectedTask: task })

    // 生成搜索组合
    generateSearchCombinations(task)
  }

  // 生成搜索组合
  const generateSearchCombinations = (task) => {
    if (!task) return

    const { keywords = '', exclusion_keywords = '' } = task
    const keywordList = keywords.split('\n').filter((k) => k.trim())
    const exclusionList = exclusion_keywords.split('\n').filter((k) => k.trim())

    const combinations = []

    keywordList.forEach((keyword) => {
      let searchTerm = keyword.trim()

      // 添加排除词
      if (exclusionList.length > 0) {
        searchTerm += ' ' + exclusionList.map((ex) => `-${ex.trim()}`).join(' ')
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
    fetchTaskList,
    generateSearchCombinations,
  }
}
