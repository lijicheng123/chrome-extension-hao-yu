import React, { useEffect, useCallback } from 'react'
import { Form, Card, ConfigProvider, message, Select, Button, Alert } from 'antd'

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
  } = emailProcessor

  const searchEngine = useSearchEngine(taskManager, backgroundState, emailProcessor)
  const { executeSearch, isSearchPage, checkExistingSearchPage, test } = searchEngine

  // 合并后的邮箱采集功能：只保留MutationObserver监听
  // useEffect(() => {
  //   // 仅在有选中任务时执行采集
  //   if (!selectedTask) return;

  //   // 初始采集当前页面邮箱
  //   extractCurrentPageEmails()

  //   // 防止重复处理的标记
  //   let isProcessing = false;

  //   // 使用debounce处理提取操作，减少频繁调用
  //   const debouncedExtract = debounce(() => {
  //     // 无论任务状态如何，都提取邮箱
  //     const newEmails = extractCurrentPageEmails()

  //     // 如果任务正在运行，则处理并提交邮箱
  //     if (taskStatus === 'running' && newEmails && newEmails.length > 0) {
  //       extractAndProcessEmails()
  //     }
  //     isProcessing = false;
  //   }, 300);

  //   // 设置MutationObserver监听页面变化
  //   const observer = new MutationObserver(() => {
  //     // 避免重复处理
  //     if (isProcessing) return;
  //     isProcessing = true;

  //     // 使用requestAnimationFrame确保DOM操作在同一帧中完成
  //     requestAnimationFrame(() => {
  //       debouncedExtract();
  //     });
  //   });

  //   observer.observe(document.body, { childList: true, subtree: true });

  //   return () => {
  //     observer.disconnect();
  //   }
  // }, [selectedTask, taskStatus]);

  // 监听任务状态变化，当状态变为running时执行搜索
  const debouncedExecuteSearch = useCallback(
    debounce(() => {
      if (taskStatus === 'running' && isSearchPage) {
        executeSearch();
      }
    }, 100),
    [taskStatus, isSearchPage, executeSearch]
  );

  useEffect(() => {
    debouncedExecuteSearch();
  }, [debouncedExecuteSearch]);

  // 检查是否在搜索结果页可操作任务
  const canIOperateTask = useCallback(() => {
    // 只有在搜索结果页才能开始任务
    if (isSearchPage) {
      return true
    }
    message.error('任务只能在搜索结果页操作')
    return false
  }, [taskStatus])
  // 开始任务
  const startTask = () => {
    if (!canIOperateTask()) {
      return
    }

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
