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
  } = emailProcessor

  const searchEngine = useSearchEngine(taskManager, backgroundState, emailProcessor)
  const { executeSearch, isSearchPage } = searchEngine

  // 监听页面内容变化，提取邮箱
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (taskStatus === 'running') {
        extractAndProcessEmails()
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [taskStatus, extractAndProcessEmails])

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

        <EmailList
          emailList={emailList}
          handleEditEmail={handleEditEmail}
          handleDeleteCustomer={handleDeleteCustomer}
          locateEmail={searchEngine.locateEmail}
          style={style}
        />

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
