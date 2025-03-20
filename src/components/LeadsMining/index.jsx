import React, { useEffect } from 'react'
import { Form, Card, ConfigProvider, message, Select, Button, Alert } from 'antd'

// 自定义Hooks
import { useTaskManager } from './hooks/useTaskManager'
import { useBackgroundState } from './hooks/useBackgroundState'
import { useEmailProcessor } from './hooks/useEmailProcessor'
import { useSearchEngine } from './hooks/useSearchEngine'

// UI组件
import TaskStatus from './components/TaskStatus'
import EmailList from './components/EmailList'
import EmailEditModal from './components/EmailEditModal'

// 样式
import style from './index.modules.scss'

/**
 * 线索挖掘组件
 * 用于自动化采集邮箱线索
 */
function LeadsMining() {
  const [form] = Form.useForm()

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
    startTask: startTaskBackground,
    pauseTask,
    resumeTask: resumeTaskBackground,
    stopTask,
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
    extractAndProcessEmails,
    extractCurrentPageEmails,
    submitCurrentPageEmails,
    currentPageEmails,
    submitEmailLead,
  } = emailProcessor

  const searchEngine = useSearchEngine(taskManager, backgroundState, emailProcessor)
  const { executeSearch, isSearchPage } = searchEngine

  // 合并后的邮箱采集功能：同时处理定时检查和DOM变化
  useEffect(() => {
    // 初始采集当前页面邮箱
    extractCurrentPageEmails()

    // 设置MutationObserver监听页面变化
    const observer = new MutationObserver(() => {
      // 无论任务状态如何，都提取邮箱
      extractCurrentPageEmails()

      // 如果任务正在运行，则处理并提交邮箱
      if (taskStatus === 'running') {
        extractAndProcessEmails()
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    // 设置定时采集邮箱，作为补充机制
    const intervalId = setInterval(() => {
      const newEmails = extractCurrentPageEmails()

      // 如果任务正在运行，自动提交邮箱线索
      if (taskStatus === 'running' && selectedTask && newEmails.length > 0) {
        newEmails.forEach(email => {
          submitEmailLead(email)
        })
      }
    }, 5000) // 每5秒检测一次页面变化

    return () => {
      clearInterval(intervalId)
      observer.disconnect()
    }
  }, [taskStatus, selectedTask, extractAndProcessEmails, extractCurrentPageEmails, submitEmailLead])

  // 监听任务状态变化，当状态变为running时执行搜索
  useEffect(() => {
    if (taskStatus === 'running') {
      executeSearch()
    }
  }, [taskStatus, executeSearch])

  // 开始任务
  const startTask = () => {
    if (!selectedTask || searchCombinations.length === 0) {
      message.error('请先选择任务并确保已生成搜索组合')
      return
    }

    // 只调用startTaskBackground，不直接调用executeSearch
    // 状态变化后会通过上面的useEffect触发executeSearch
    startTaskBackground()
  }

  // 继续任务
  const resumeTask = () => {
    // 只调用resumeTaskBackground，不直接调用executeSearch
    // 状态变化后会通过上面的useEffect触发executeSearch
    resumeTaskBackground()
  }

  // 初始化表单
  useEffect(() => {
    if (selectedTask) {
      form.setFieldsValue({ currentTask: selectedTask.id })
    }
  }, [selectedTask, form])

  return (
    <ConfigProvider>
      <div className={style['email-list']}>
        <Card title="线索挖掘任务" bordered={false}>
          <Form form={form} name="prompt" labelCol={{ span: 6 }} wrapperCol={{ span: 14 }}>
            <Form.Item
              label="挖掘任务"
              name="currentTask"
              tooltip="选择要执行的挖掘任务"
              rules={[{ required: true, message: '请选择挖掘任务' }]}
              style={{ marginBottom: 16 }}
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

            <Button
              type="primary"
              onClick={() => {
                fetchTaskList()
              }}
            >
              刷新任务
            </Button>

            {!isSearchPage && taskStatus !== 'idle' && (
              <Alert
                message="提示"
                description="当前页面不是谷歌搜索结果页，无法执行任务。请返回谷歌搜索结果页继续任务。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {selectedTask && (
              <TaskStatus
                taskStatus={taskStatus}
                progress={progress}
                currentSearchTerm={currentSearchTerm}
                discoveredEmails={discoveredEmails}
                currentPage={currentPage}
                captchaDetected={captchaDetected}
                statusMessage={statusMessage}
                startTask={startTask}
                pauseTask={pauseTask}
                resumeTask={resumeTask}
                stopTask={stopTask}
                fetchTaskList={fetchTaskList}
              />
            )}

            <Form.Item label="任务控制">
              {taskStatus === 'idle' && (
                <Button
                  type="primary"
                  onClick={startTask}
                  disabled={!isSearchPage || !selectedTask}
                  title={
                    !isSearchPage
                      ? '只能在谷歌搜索结果页启动任务'
                      : !selectedTask
                      ? '请先选择任务'
                      : ''
                  }
                >
                  启动任务
                </Button>
              )}
              {taskStatus === 'running' && (
                <Button type="primary" danger onClick={pauseTask}>
                  暂停任务
                </Button>
              )}
              {taskStatus === 'paused' && (
                <Button
                  type="primary"
                  onClick={resumeTask}
                  disabled={!isSearchPage}
                  title={!isSearchPage ? '只能在谷歌搜索结果页继续任务' : ''}
                >
                  继续任务
                </Button>
              )}
              {(taskStatus === 'running' || taskStatus === 'paused') && (
                <Button type="default" danger onClick={stopTask} style={{ marginLeft: 8 }}>
                  停止任务
                </Button>
              )}
            </Form.Item>
          </Form>
        </Card>

        {taskStatus === 'idle' && selectedTask ? (
          <>
            <Card title="当前页面邮箱" bordered={false} style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  onClick={extractCurrentPageEmails}
                  style={{ marginRight: 8 }}
                >
                  刷新当前页面邮箱
                </Button>
                <Button
                  type="primary"
                  onClick={submitCurrentPageEmails}
                  disabled={!currentPageEmails.length}
                >
                  将当前页面邮箱作为线索提交
                </Button>
              </div>
              <EmailList
                emailList={currentPageEmails}
                handleEditEmail={handleEditEmail}
                handleDeleteCustomer={handleDeleteCustomer}
                locateEmail={searchEngine.locateEmail}
                style={style}
              />
            </Card>
          </>
        ) : (
            <EmailList
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
