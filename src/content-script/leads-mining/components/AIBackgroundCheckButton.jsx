import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button, message, Card, Typography, Space, Modal, Input } from 'antd'
import {
  RobotOutlined,
  LoadingOutlined,
  ReloadOutlined,
  CloseOutlined,
  EditOutlined,
} from '@ant-design/icons'
import Browser from 'webextension-polyfill'
import { WebAutomationContentAPI } from '../../../services/messaging/webAutomation'
import { isLandingPage } from '../utils/googleSearchAutomation'
import { submitEmails } from '../utils/emailService'
import { MAX_Z_INDEX } from '../../../config/ui-config.mjs'
import { initSession } from '../../../services/init-session.mjs'

const { Text } = Typography

/**
 * AI背调按钮组件
 * 只在LandingPage页面显示，点击后执行批量网页自动化
 */
const AIBackgroundCheckButton = () => {
  const [isRunning, setIsRunning] = useState(false)
  const [taskStatus, setTaskStatus] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editableResult, setEditableResult] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [userTookControl, setUserTookControl] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const currentTaskId = useRef(null)
  const countdownTimer = useRef(null)
  const statusCheckTimer = useRef(null)
  const originalTaskResults = useRef(null)
  const messageHideRef = useRef(null)

  // 统一的message管理
  const showMessage = useCallback((type, content, duration = 0) => {
    if (messageHideRef.current) {
      messageHideRef.current()
    }
    messageHideRef.current = message[type](content, duration)
  }, [])

  const hideMessage = useCallback(() => {
    if (messageHideRef.current) {
      messageHideRef.current()
      messageHideRef.current = null
    }
  }, [])

  // 硬编码的任务配置
  const taskConfigs = [
    {
      name: '智能手机HS编码查询',
      url: 'https://hsbianma.com/search?keywords=%E6%99%BA%E8%83%BD%E6%89%8B%E6%9C%BA',
      actions: [
        { type: 'activate_tab' },
        { type: 'wait', duration: 3000 },
        { type: 'scroll_to_bottom', config: { scrollStep: 500, scrollDelay: 1000 } },
      ],
      dataExtraction: {
        type: 'page_content',
      },
    },
    {
      name: '小米公司信息',
      url: 'https://www.mi.com/us/about/',
      actions: [
        { type: 'activate_tab' },
        { type: 'wait', duration: 3000 },
        { type: 'scroll_to_bottom', config: { scrollStep: 500, scrollDelay: 1000 } },
      ],
      dataExtraction: {
        type: 'page_content',
      },
    },
    // {
    //   name: 'Bill Gates LinkedIn',
    //   url: 'https://www.linkedin.com/in/williamhgates/',
    //   actions: [
    //     { type: 'wait', duration: 3000 },
    //     { type: 'scroll_to_bottom', config: { scrollStep: 500, scrollDelay: 1000 } },
    //     { type: 'scroll_into_view', selector: '#top-card-text-details-contact-info' },
    //     { type: 'click_element', selector: '#top-card-text-details-contact-info' },
    //     { type: 'wait', duration: 2000 },
    //   ],
    //   dataExtraction: {
    //     type: 'page_content',
    //   },
    // },
  ]

  const isLanding = useMemo(async () => {
    const result = await isLandingPage()
    return result
  }, [])

  // 调用AI生成开发信
  const callAIForEmailGeneration = useCallback(
    async (results, isRegenerate = false) => {
      const prompt = `你的任务是根据提供的多个网页内容、网页链接和title撰写一封英语开发信，要求控制在300个英文单词内。

网页信息：
${results
  .map(
    (result, index) => `
网页 ${index + 1} 信息：
${JSON.stringify(result.data, null, 2)}
`,
  )
  .join('\n')}

在撰写开发信时，请遵循以下指南：
1. 使用正式且友好的语气。
2. 在开头简要介绍自己或公司，并提及与网页相关的主题。
3. 正文中适当引用多个网页内容来吸引对方兴趣，同时给出相应网页链接方便对方查看。
4. 语言表达要简洁明了，避免复杂的句子结构和生僻词汇。
5. 结尾表达期待回复等友好的结束语。

请写下你的英语开发信。`

      const port = Browser.runtime.connect()
      showMessage('loading', `AI正在${isRegenerate ? '重新' : ''}生成开发信...`, 0)

      return new Promise((resolve, reject) => {
        const messageListener = (msg) => {
          if (msg.error) {
            hideMessage()
            showMessage('error', `${isRegenerate ? '重新' : ''}生成失败: ${msg.error}`)
            reject(new Error(msg.error))
            return
          }
          if (msg.done) {
            hideMessage()
            showMessage('success', `开发信${isRegenerate ? '重新' : ''}生成完成`)
            resolve(msg.answer)
          }
        }

        port.onMessage.addListener(messageListener)

        const session = initSession({
          question: prompt,
          conversationRecords: [],
          modelName: 'doubao-1-5-lite-32k-250115',
          aiConfig: {
            responseFormat: 'text',
            temperature: 0.7,
            top_k: 0.9,
            top_p: 0.9,
            stream: false, // 使用非流式响应，简化处理
            assistantPrefix: null,
          },
        })

        port.postMessage({ session })
      })
    },
    [showMessage, hideMessage],
  )

  // 处理任务完成 - 使用useCallback避免重复调用
  const handleTaskCompleted = useCallback(
    async (data) => {
      const { taskId, results } = data
      console.log('====handleTaskCompleted====>', taskId, currentTaskId.current)

      if (taskId === currentTaskId.current && results) {
        // 保存原始任务结果用于重新生成
        originalTaskResults.current = results

        try {
          // 直接调用AI生成开发信
          const emailContent = await callAIForEmailGeneration(
            results.filter((r) => r.success && r.data),
          )

          setEditableResult(emailContent)
          setModalVisible(true)
          setIsRunning(false)

          // 开始倒计时自动提交（只有在用户未接管时）
          setUserTookControl(false) // 重置用户接管状态
          startCountdown()

          clearInterval(statusCheckTimer.current)
        } catch (error) {
          console.error('AI生成开发信失败:', error)
          setIsRunning(false)
          clearInterval(statusCheckTimer.current)
        }
      }
    },
    [callAIForEmailGeneration],
  )

  // 监听任务完成消息
  useEffect(() => {
    const messageListener = (message) => {
      console.log('====messageListener 收到消息====>', message)

      if (message.namespace === 'WEB_AUTOMATION' && message.type === 'request') {
        console.log('====messageListener 进入条件====>', message)

        if (message.action === 'TASK_COMPLETED') {
          console.log('====收到TASK_COMPLETED====>', message)
          handleTaskCompleted(message.data)
        }
      }
    }

    Browser.runtime.onMessage.addListener(messageListener)
    return () => {
      Browser.runtime.onMessage.removeListener(messageListener)
    }
  }, [handleTaskCompleted])

  // 开始AI背调任务
  const handleStartTask = async () => {
    if (isRunning) return

    setIsRunning(true)
    setTaskStatus(null)
    setUserTookControl(false)

    try {
      showMessage('loading', '正在启动AI背调任务...', 0)
      const taskId = Date.now().toString()
      currentTaskId.current = taskId

      const result = await WebAutomationContentAPI.startBatchTask(taskConfigs, taskId)
      console.log('====handleStartTask====>', result)
      if (result.success) {
        hideMessage()
        showMessage('success', 'AI背调任务已启动，正在处理...')
        // 开始定期检查任务状态
        startStatusCheck()
      } else {
        throw new Error(result.error || '启动任务失败')
      }
    } catch (error) {
      console.error('启动AI背调任务失败:', error)
      hideMessage()
      showMessage('error', `启动任务失败: ${error.message}`)
      setIsRunning(false)
    }
  }

  // 停止任务
  const handleStopTask = async () => {
    if (!currentTaskId.current) return

    try {
      await WebAutomationContentAPI.stopTask(currentTaskId.current)
      showMessage('success', '任务已停止')
      resetState()
    } catch (error) {
      console.error('停止任务失败:', error)
      showMessage('error', '停止任务失败')
    }
  }

  // 定期检查任务状态
  const startStatusCheck = () => {
    statusCheckTimer.current = setInterval(async () => {
      if (!currentTaskId.current) return

      try {
        const result = await WebAutomationContentAPI.getTaskStatus(currentTaskId.current)
        if (result.success) {
          setTaskStatus(result.task)

          if (result.task.status === 'completed' || result.task.status === 'failed') {
            clearInterval(statusCheckTimer.current)
            setIsRunning(false)
          }
        }
      } catch (error) {
        console.error('获取任务状态失败:', error)
      }
    }, 2000)
  }

  // 开始倒计时
  const startCountdown = () => {
    // 先清理之前的定时器
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current)
      countdownTimer.current = null
    }

    setCountdown(10)
    const timerId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerId)
          countdownTimer.current = null
          console.log('====倒计时结束====>', prev, userTookControl)

          // 检查用户是否已经接管控制
          if (!userTookControl) {
            handleAutoSubmit()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    countdownTimer.current = timerId
  }

  // 用户接管编辑
  const handleUserTakeControl = useCallback(() => {
    console.log('====用户接管控制====>')
    setUserTookControl(true)
    setIsEditing(true)
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current)
      countdownTimer.current = null
      setCountdown(0)
    }
  }, [])

  // 自动提交和手动提交合并
  const handleAutoSubmit = async () => {
    await handleSubmit(editableResult)
  }

  const handleManualSubmit = async () => {
    await handleSubmit(editableResult)
  }

  // 重新生成开发信
  const handleRegenerate = async () => {
    if (!originalTaskResults.current) {
      showMessage('error', '没有原始数据，无法重新生成')
      return
    }

    setIsRegenerating(true)

    try {
      const emailContent = await callAIForEmailGeneration(
        originalTaskResults.current.filter((r) => r.success && r.data),
        true, // isRegenerate = true
      )

      setEditableResult(emailContent)
      setIsRegenerating(false)
    } catch (error) {
      console.error('重新生成开发信失败:', error)
      setIsRegenerating(false)
    }
  }

  // 验证提交数据
  const validateSubmitData = (emailContent) => {
    if (!emailContent || emailContent.trim().length === 0) {
      showMessage('error', '开发信内容不能为空')
      return false
    }

    if (emailContent.trim().length < 50) {
      showMessage('error', '开发信内容过短，请检查是否完整')
      return false
    }

    return true
  }

  // 提交开发信
  const handleSubmit = async (emailContent) => {
    // 验证提交数据
    if (!validateSubmitData(emailContent)) {
      return
    }

    try {
      showMessage('loading', '正在提交开发信...', 0)

      // 构建提交数据 - 参考emailService.js的格式
      const hostname = window.location.hostname
      const currentUrl = window.location.href

      const emailData = {
        user_email: `ai-background-check@${hostname}`, // 占位邮箱
        user_name: `AI背调-${hostname}`,
        company_name: hostname,
        user_function: 'AI背调结果',
        email_content: emailContent,
        thread_type: 'ai_background_check',
        leads_source_url: currentUrl,
        leads_target_url: currentUrl,
        task_id: currentTaskId.current,
        leads_keywords: 'AI背调',
        tag_names: ['AI背调', 'AI生成开发信'],
      }

      const submitResult = await submitEmails([emailData], {
        taskId: currentTaskId.current,
        searchTerm: 'AI背调',
        onSuccess: (emails) => {
          console.log('提交成功:', emails)
        },
        onError: (error) => {
          console.error('提交失败:', error)
        },
      })

      hideMessage()
      if (submitResult) {
        showMessage('success', '开发信已提交成功')
        setModalVisible(false)
        resetState()
      } else {
        throw new Error('提交失败')
      }
    } catch (error) {
      console.error('提交开发信失败:', error)
      hideMessage()
      showMessage('error', '提交失败，请重试')
    }
  }

  // 关闭当前页面
  const handleClosePage = () => {
    window.close()
  }

  // 重新打开弹窗
  const handleReOpenModal = () => {
    setModalVisible(true)
  }

  // 关闭弹窗
  const handleCloseModal = () => {
    setModalVisible(false)
  }

  // 重置状态
  const resetState = () => {
    setIsRunning(false)
    setTaskStatus(null)
    setEditableResult('')
    setIsEditing(false)
    setUserTookControl(false)
    setCountdown(0)
    setIsRegenerating(false)
    currentTaskId.current = null

    if (countdownTimer.current) {
      clearInterval(countdownTimer.current)
      countdownTimer.current = null
    }
    if (statusCheckTimer.current) {
      clearInterval(statusCheckTimer.current)
    }

    hideMessage()
  }

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      resetState()
    }
  }, [])

  // 只在LandingPage显示
  if (!isLanding) {
    return null
  }

  return (
    <>
      <Card title="AI背调功能" size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            自动分析多个网页并生成定制化开发信
          </Text>

          {taskStatus && (
            <div style={{ padding: 8, background: '#f6f6f6', borderRadius: 4 }}>
              <Text style={{ fontSize: '12px' }}>
                进度: {taskStatus.progress}% ({taskStatus.completedCount}/{taskStatus.totalCount})
              </Text>
            </div>
          )}

          <Space style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={isRunning ? <LoadingOutlined /> : <RobotOutlined />}
              onClick={isRunning ? handleStopTask : handleStartTask}
              danger={isRunning}
              size="middle"
              style={{ flex: 1 }}
            >
              {isRunning ? '停止背调' : '开始AI背调'}
            </Button>
            <Button icon={<EditOutlined />} onClick={handleReOpenModal} size="middle">
              编辑开发信
            </Button>
            <Button
              type="default"
              icon={<CloseOutlined />}
              onClick={handleClosePage}
              size="middle"
              title="完成并关闭页面"
            >
              完成
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 结果展示和编辑Modal - 使用最高z-index */}
      <Modal
        title="AI生成的开发信"
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button key="cancel" onClick={handleCloseModal}>
            取消
          </Button>,
          <Button
            key="regenerate"
            icon={<ReloadOutlined />}
            onClick={handleRegenerate}
            loading={isRegenerating}
            disabled={!originalTaskResults.current}
          >
            重新生成
          </Button>,
          <Button key="submit" type="primary" onClick={handleManualSubmit}>
            {countdown > 0 && !userTookControl ? `${countdown}秒后自动提交` : '立即提交'}
          </Button>,
        ]}
        width={700}
        style={{ zIndex: MAX_Z_INDEX }}
        getContainer={() => {
          // 创建一个高z-index的容器
          let container = document.getElementById('haoyu-ai-modal-container')
          if (!container) {
            container = document.createElement('div')
            container.id = 'haoyu-ai-modal-container'
            container.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              z-index: ${MAX_Z_INDEX};
              pointer-events: none;
            `
            document.body.appendChild(container)
          }
          return container
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {countdown > 0 && !userTookControl && (
            <Text type="warning" style={{ fontSize: '12px' }}>
              {countdown}秒后将自动提交，如需编辑请点击下方文本框
            </Text>
          )}

          <div>
            <Text strong style={{ fontSize: '14px' }}>
              开发信内容：
            </Text>
            <Input.TextArea
              value={editableResult}
              onChange={(e) => {
                setEditableResult(e.target.value)
                if (!isEditing) {
                  handleUserTakeControl()
                }
              }}
              onFocus={handleUserTakeControl}
              placeholder="AI生成的开发信将显示在这里..."
              rows={8}
              style={{ fontSize: '14px', marginTop: 8 }}
            />
          </div>

          {userTookControl && (
            <Text type="info" style={{ fontSize: '12px' }}>
              您已接管编辑，请手动提交
            </Text>
          )}
        </Space>
      </Modal>
    </>
  )
}

export default AIBackgroundCheckButton
