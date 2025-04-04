import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react'
import { Form, ConfigProvider, message, Select, Button, Space, Tooltip, Col, Row } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
// 自定义Hooks
import { useTaskManager } from './hooks/useTaskManager'
import { useBackgroundState } from './hooks/useBackgroundState'
import { useEmailProcessor } from './hooks/useEmailProcessor'
import { useSearchEngine } from './hooks/useSearchEngine'
import { debounce } from './utils/searchEngineUtils'

// UI组件
import TaskStatus from './components/TaskStatus'
import EmailList from './components/EmailList'
import EmailEditModal from './components/EmailEditModal'

// 样式
import style from './index.modules.scss'

const showDebugger = false

/**
 * 线索挖掘组件
 * 用于自动化采集邮箱线索
 */
function LeadsMining() {
  const [form] = Form.useForm()
  // 添加一个ref来跟踪是否已执行搜索
  const hasExecutedSearchRef = useRef(false)

  // 使用自定义Hooks
  const taskManager = useTaskManager()
  const { selectedTask, searchCombinations, handleTaskSelect, fetchTaskList, taskList } =
    taskManager

  // 使用background状态管理
  const backgroundState = useBackgroundState(selectedTask)
  const {
    taskStatus,
    currentSearchTerm,
    currentPage,
    progress,
    discoveredEmails,
    captchaDetected,
    statusMessage,
    emailList,
    startTaskBackground,
    stopTask,
    casualMiningStatus,
    onCasualMiningClick,
  } = backgroundState

  const emailProcessor = useEmailProcessor(selectedTask, backgroundState)
  const {
    editingEmail,
    newEmailValue,
    newNoteValue,
    setNewEmailValue,
    setNewNoteValue,
    handleEditEmail,
    handleUpdateEmail,
    handleDeleteCustomer,
    setEditingEmail,
    currentPageEmails,
  } = emailProcessor

  const searchEngine = useSearchEngine(taskManager, backgroundState, emailProcessor)
  const { executeSearch, isSearchPage, isDetailPage, handleDeleteTimerAndCloseDetailPage, test } =
    searchEngine

  const [isSearchPageAndTaskRunning] = useMemo(() => {
    const isRunning = taskStatus === 'running'
    return [isSearchPage && isRunning]
  }, [isSearchPage, taskStatus])

  console.log('isSearchPageAndTaskRunning taskStatus====>', isSearchPageAndTaskRunning, taskStatus)

  // 监听任务状态变化，当状态变为running时执行搜索
  // 这个方法应该只允许执行一次
  const debouncedExecuteSearch = useCallback(
    debounce(() => {
      if (isSearchPageAndTaskRunning && !hasExecutedSearchRef.current) {
        // 标记为已执行
        hasExecutedSearchRef.current = true
        console.log('执行搜索，并标记为已执行')
        executeSearch()
      }
    }, 100),
    [isSearchPageAndTaskRunning, executeSearch, taskStatus],
  )

  useEffect(() => {
    console.log('useEffect触发，状态:', taskStatus, '已执行:', hasExecutedSearchRef.current)

    // 重置执行标记的条件：当任务状态变为非running
    if (taskStatus !== 'running') {
      hasExecutedSearchRef.current = false
      console.log('任务状态不是running，重置执行标记')
    }

    // 只有当未执行且条件满足时才调用
    if (!hasExecutedSearchRef.current) {
      debouncedExecuteSearch()
    }
  }, [debouncedExecuteSearch, taskStatus, isSearchPageAndTaskRunning])

  // 检查是否在搜索结果页可操作任务
  const canIOperateTask = useCallback(() => {
    // 只有在搜索结果页才能开始任务
    if (isSearchPage) {
      return true
    }
    message.error('任务只能在搜索结果页操作')
    return false
  }, [taskStatus])

  // 自动挖掘按钮是否禁用
  const autoMiningDisabled = useMemo(() => {
    return !selectedTask?.id || false
  }, [isSearchPage, selectedTask?.id])

  // 自动挖掘是否正在进行中
  const isAutoMining = useMemo(() => {
    return isSearchPageAndTaskRunning
  }, [taskStatus, isSearchPageAndTaskRunning])

  const autoMining = () => {
    if (isAutoMining) {
      handleDeleteTimerAndCloseDetailPage()
      stopTask()
    } else {
      startTask()
    }
  }

  // 随缘挖掘按钮是否禁用
  const casualMiningDisabled = useMemo(() => {
    return taskStatus === 'running'
  }, [taskStatus])

  /**
   * 随缘挖掘是否正在进行中
   * 1. 随缘挖掘状态为运行中
   * 2. 自动挖掘任务状态不是运行中
   */
  const isCasualMining = useMemo(() => {
    return casualMiningStatus === 'cRunning' && taskStatus !== 'running'
  }, [casualMiningStatus, taskStatus])

  // 按钮悬浮状态
  const [casualHovered, setCasualHovered] = useState(false)
  const [autoHovered, setAutoHovered] = useState(false)

  // 随缘挖掘按钮处理函数
  const handleCasualMouseEnter = useCallback(() => {
    if (!casualMiningDisabled) {
      setCasualHovered(true)
    }
  }, [casualMiningDisabled])

  const handleCasualMouseLeave = useCallback(() => {
    if (!casualMiningDisabled) {
      setCasualHovered(false)
    }
  }, [casualMiningDisabled])

  // 自动挖掘按钮处理函数
  const handleAutoMouseEnter = useCallback(() => {
    setAutoHovered(true)
  }, [])

  const handleAutoMouseLeave = useCallback(() => {
    setAutoHovered(false)
  }, [])

  // 随缘挖掘按钮文案
  const casualButtonText = useMemo(() => {
    if (isCasualMining) {
      return casualHovered ? '停止随缘挖掘' : '随缘挖掘中'
    }
    return casualHovered ? '开启随缘挖掘' : '随缘挖掘已停止'
  }, [casualMiningDisabled, isCasualMining, casualHovered, taskStatus])

  // 随缘挖掘tooltip文案
  const casualTooltipText = useMemo(() => {
    if (casualMiningDisabled) {
      return '请先选择任务，并在搜索结果页操作'
    } else if (isCasualMining) {
      return casualHovered ? '点击停止随缘挖掘' : '随缘挖掘进行中'
    } else {
      return casualHovered ? '点击开启随缘挖掘' : '随缘挖掘已停止'
    }
  }, [casualMiningDisabled, isCasualMining, casualHovered, taskStatus])

  // 自动挖掘按钮文案
  const autoButtonText = useMemo(() => {
    if (autoMiningDisabled) {
      return '自动挖掘已停止'
    }
    if (isAutoMining) {
      return autoHovered ? '停止自动挖掘' : '自动挖掘中'
    }
    return autoHovered ? '开启自动挖掘' : '自动挖掘已停止'
  }, [autoMiningDisabled, isAutoMining, autoHovered, taskStatus])

  // 自动挖掘tooltip文案
  const autoTooltipText = useMemo(() => {
    if (autoMiningDisabled) {
      return '请先选择任务，并在搜索结果页操作'
    } else if (isAutoMining) {
      return autoHovered ? '点击停止自动挖掘' : '自动挖掘进行中'
    } else {
      return autoHovered ? '点击开启自动挖掘' : '自动挖掘已停止'
    }
  }, [autoMiningDisabled, isAutoMining, autoHovered, taskStatus])

  // 开始任务
  const startTask = async () => {
    try {
      if (!canIOperateTask()) {
        return
      }

      if (!selectedTask || searchCombinations.length === 0) {
        message.error('请先选择任务并确保已生成搜索组合')
        return
      }

      console.log('开始任务，当前执行标记:', hasExecutedSearchRef.current)

      // 重置执行标记，允许任务重新开始时执行搜索
      hasExecutedSearchRef.current = false

      // 执行开始任务，这会更新状态为running
      await startTaskBackground()

      // 任务启动后，状态更新会触发useEffect
      // useEffect中会根据hasExecutedSearchRef确保只执行一次
      console.log('任务已启动，等待状态更新触发useEffect')
    } catch (error) {
      console.error('启动任务出错:', error)
    }
  }

  // 初始化表单
  useEffect(() => {
    if (selectedTask?.id) {
      form.setFieldsValue({ currentTask: selectedTask.id })
    }
  }, [selectedTask?.id, form])

  console.log('currentPageEmails=====>2:', currentPageEmails)
  // console.log('emailList useBackgroundState index.jsx =========>', emailList)

  return (
    <ConfigProvider
      theme={{
        components: {
          Select: {
            zIndexPopup: 99999999,
          },
        },
      }}
    >
      <div className={style['email-list']}>
        <Form form={form} name="prompt" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
          <Row align="top">
            <Col span={22}>
              <Form.Item
                label="挖掘任务"
                name="currentTask"
                tooltip="选择要执行的挖掘任务"
                rules={[{ required: true, message: '请选择挖掘任务' }]}
                style={{ marginBottom: 16 }}
                disabled={taskStatus === 'running'}
              >
                <Select
                  placeholder="请选择挖掘任务"
                  onChange={handleTaskSelect}
                  style={{ width: '100%' }}
                >
                  {taskList?.map((task) => (
                    <Select.Option key={task.id} value={task.id}>
                      {task.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={2}>
              <Button
                style={{ marginTop: 4 }}
                size="small"
                type="link"
                onClick={fetchTaskList}
                icon={<ReloadOutlined />}
              />
            </Col>
          </Row>
          <Row justify="center">
            {!isAutoMining && (
              <Col span={12}>
                <Tooltip title={casualTooltipText}>
                  <Button
                    type="primary"
                    danger={isCasualMining && !casualHovered}
                    onClick={onCasualMiningClick}
                    disabled={casualMiningDisabled}
                    onMouseEnter={handleCasualMouseEnter}
                    onMouseLeave={handleCasualMouseLeave}
                    loading={casualMiningStatus === 'cRunning'}
                    style={{ borderRadius: 16 }}
                  >
                    {casualButtonText}
                  </Button>
                </Tooltip>
              </Col>
            )}
            {isSearchPage && (
              <Col span={12}>
                <Tooltip title={autoTooltipText}>
                  <Button
                    type={isAutoMining ? 'primary' : 'default'}
                    danger={isAutoMining && autoHovered}
                    onClick={autoMining}
                    disabled={autoMiningDisabled}
                    onMouseEnter={handleAutoMouseEnter}
                    onMouseLeave={handleAutoMouseLeave}
                  >
                    {autoButtonText}
                  </Button>
                </Tooltip>
              </Col>
            )}
          </Row>

          {/* {showDebugger && (
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  console.log('当前是否是搜索结果页：', isSearchPage)
                }}
              >
                测试：当前是否是搜索结果页
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  checkExistingSearchPage().then((res) => {
                    console.log('当前是否有其他标签页打开了搜索结果页：', res)
                  })
                }}
              >
                测试：当前是否有其他标签页打开了搜索结果页
              </Button>
              <Button type="primary" onClick={test}>
                测试：获取总页数、当前页数、是否最后一页
              </Button>
            </Space>
          )} */}

          {/* {showDebugger && (
            <TaskStatus
              taskStatus={taskStatus}
              progress={progress}
              currentSearchTerm={currentSearchTerm}
              discoveredEmails={discoveredEmails}
              currentPage={currentPage}
              captchaDetected={captchaDetected}
              statusMessage={statusMessage}
              startTask={startTask}
              stopTask={stopTask}
              fetchTaskList={fetchTaskList}
            />
          )} */}
        </Form>

        {(taskStatus != 'running' && casualMiningStatus === 'cRunning') || isDetailPage ? (
          <EmailList
            isShowCurrentPageEmails={true}
            emailList={currentPageEmails}
            handleEditEmail={handleEditEmail}
            handleDeleteCustomer={handleDeleteCustomer}
            locateEmail={searchEngine.locateEmail}
            style={style}
          />
        ) : (
          <EmailList
            isShowCurrentPageEmails={false}
            emailList={emailList}
            handleEditEmail={handleEditEmail}
            handleDeleteCustomer={handleDeleteCustomer}
            locateEmail={searchEngine.locateEmail}
            style={style}
          />
        )}

        <EmailEditModal
          editingEmail={editingEmail}
          newEmailValue={newEmailValue}
          newNoteValue={newNoteValue}
          setNewEmailValue={setNewEmailValue}
          setNewNoteValue={setNewNoteValue}
          handleUpdateEmail={handleUpdateEmail}
          setEditingEmail={setEditingEmail}
        />
      </div>
    </ConfigProvider>
  )
}

export default LeadsMining
