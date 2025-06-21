import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button, message, Card, Typography, Space, Modal, Input, Alert, Spin } from 'antd'
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
import { initSession } from '../../../services/init-session.mjs'
import { MAX_Z_INDEX } from '../../../config/ui-config.mjs'
import getCommonAnalysisLinks from './../utils/getCommonAnalysisLinks'
import { extractAllEmails } from './../utils/emailExtractor'
import { formatToHttpsLink } from '../../../utils/format-url'

const { Text } = Typography

/**
 * AI阅读按钮组件
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

  const isLanding = useMemo(async () => {
    const result = await isLandingPage()
    return result
  }, [])

  // 调用AI生成开发信 - 参考emailExtractor.js的方式
  const generateEmailWithAI = useCallback(
    async (results, isRegenerate = false) => {
      const validResults = results.filter((r) => r.success && r.data)

      if (validResults.length === 0) {
        throw new Error('没有有效的提取结果')
      }

      // 构建AI提示词
      const prompt = `你的任务是根据提供的多个网页内容、网页链接和title撰写一封英语开发信，要求控制在300个英文单词内。

网页信息：
${validResults
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
      showMessage('loading', `${isRegenerate ? '重新生成' : '生成'}开发信中...`, 0)

      return new Promise((resolve, reject) => {
        let fullAnswer = ''

        const messageListener = (msg) => {
          if (msg.error) {
            reject(new Error(msg.error))
            return
          }

          if (msg.answer !== undefined) {
            fullAnswer = msg.answer

            // 实时更新显示内容（流式效果）
            if (!msg.done && isRegenerate) {
              setEditableResult(fullAnswer)
            }
          }

          if (msg.done) {
            resolve(fullAnswer)
          }
        }

        port.onMessage.addListener(messageListener)

        const session = initSession({
          question: prompt,
          conversationRecords: [],
          modelName: 'doubao-1-5-pro-256k-250115',
          aiConfig: {
            responseFormat: 'text',
            temperature: 0.7,
            top_k: 0.9,
            top_p: 0.9,
            stream: true, // 使用流式响应
            assistantPrefix: null,
          },
        })

        const postMessage = async ({ session, stop }) => {
          port.postMessage({ session, stop })
        }

        postMessage({ session })
      })
    },
    [showMessage],
  )

  // 处理任务完成 - 使用useCallback避免重复调用
  const handleTaskCompleted = useCallback(
    async (data) => {
      const { taskId, results } = data
      console.log('====handleTaskCompleted results====>', taskId, currentTaskId.current, results)

      if (taskId === currentTaskId.current) {
        // 保存原始任务结果用于重新生成
        originalTaskResults.current = results
        setModalVisible(true)

        try {
          // 使用AI生成开发信
          const aiResult = await generateEmailWithAI(results, false)

          // 处理AI返回的结果
          if (typeof aiResult === 'object' && aiResult.email_content) {
            setEditableResult(aiResult.email_content)
          } else {
            setEditableResult(aiResult)
          }

          setIsRunning(false)
          hideMessage()
          showMessage('success', 'AI开发信生成完成')

          // 开始倒计时自动提交（只有在用户未接管时）
          setUserTookControl(false) // 重置用户接管状态
          startCountdown()

          clearInterval(statusCheckTimer.current)
        } catch (error) {
          console.error('生成开发信失败:', error)
          hideMessage()
          showMessage('error', `生成开发信失败: ${error.message}`)
          setIsRunning(false)
          clearInterval(statusCheckTimer.current)
        }
      }
    },
    [generateEmailWithAI, hideMessage, showMessage],
  )

  const getAnalysisLinks = useCallback(async ({ ai = false } = {}) => {
    let links = []
    if (ai !== true) {
      links = getCommonAnalysisLinks()
    } else {
      const data = await extractAllEmails({ ai: true, extractLinks: true })

      console.log('AI提取到的数据:', data)

      // 从提取的数据中获取links
      if (data && data.length > 0) {
        // 合并所有对象的links数组
        links = data.reduce((acc, item) => {
          if (item.links && Array.isArray(item.links)) {
            return acc.concat(item.links)
          }
          return acc
        }, [])
      }
    }
    return links.map((item) => {
      return {
        ...item,
        url: formatToHttpsLink(item.url),
        actions: [
          { type: 'wait', duration: 3000 },
          {
            type: 'scroll_to_bottom',
            config: { scrollStep: 800, scrollDelay: 1000, timeout: 5000 },
          },
        ],
        dataExtraction: {
          type: 'page_content',
        },
      }
    })
  }, [])

  // 开始AI阅读任务
  const handleStartTask = async () => {
    if (isRunning) return
    showMessage('loading', '正在读取本页内容...', 0)
    const willOpenLinks = (await getAnalysisLinks({ ai: true })) || {}
    console.log('willOpenLinks:data:', willOpenLinks)
    hideMessage()
    showMessage('loading', '读取完成!', 0)
    if (willOpenLinks.length < 1) {
      showMessage('warning', '当前页面没有识别目标链接')
      return
    }

    setIsRunning(true)
    setTaskStatus(null)
    setUserTookControl(false)

    try {
      showMessage('loading', '正在启动AI阅读任务...', 0)
      const taskId = Date.now().toString()
      currentTaskId.current = taskId

      // 注册任务完成回调
      WebAutomationContentAPI.registerTaskCompletedCallback(taskId, handleTaskCompleted)

      const result = await WebAutomationContentAPI.startBatchTask(willOpenLinks, taskId)
      console.log('====handleStartTask====>', result)
      if (result.success) {
        hideMessage()
        showMessage('success', 'AI阅读任务已启动，正在处理...')
        // 开始定期检查任务状态
        startStatusCheck()
      } else {
        throw new Error(result.error || '启动任务失败')
      }
    } catch (error) {
      console.error('启动AI阅读任务失败:', error)
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
      const regeneratedResult = await generateEmailWithAI(originalTaskResults.current, true)

      setEditableResult(regeneratedResult)
      hideMessage()
      showMessage('success', '开发信重新生成完成')
      setIsRegenerating(false)
    } catch (error) {
      console.error('重新生成开发信失败:', error)
      hideMessage()
      showMessage('error', '重新生成失败，请重试')
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
        user_name: `AI阅读-${hostname}`,
        company_name: hostname,
        // user_function: 'AI阅读结果',
        email_content: emailContent,
        thread_type: 'ai_background_check',
        leads_source_url: currentUrl,
        leads_target_url: currentUrl,
        task_id: currentTaskId.current,
        leads_keywords: 'AI阅读',
        tag_names: ['AI阅读', 'AI生成开发信'],
      }

      const submitResult = await submitEmails([emailData], {
        taskId: currentTaskId.current,
        searchTerm: 'AI阅读',
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
    try {
      window.close()
    } catch (e) {
      showMessage('error', '从正常渠道进入才能关闭！')
    }
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
    // 取消注册任务完成回调
    if (currentTaskId.current) {
      WebAutomationContentAPI.unregisterTaskCompletedCallback(currentTaskId.current)
    }

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
    WebAutomationContentAPI.registerHandlers()
    return () => {
      resetState()
      WebAutomationContentAPI.unregisterHandlers()
    }
  }, [])

  // 只在LandingPage显示
  if (!isLanding) {
    return null
  }

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            可自动阅读分析多个网页并生成定制化开发信
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
              {isRunning ? '停止阅读' : '开始AI阅读'}
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
              完成并关闭
            </Button>
          </Space>
        </Space>
      </Card>
      {/* 结果展示和编辑Modal - 使用最高z-index */}
      <Modal
        title="AI开发信"
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
          <div>
            <Alert
              message="AI仅根据你提供的信息和网页内容生成，效果不一定稳定，请务必认真阅读后再保存或者发送"
              type="warning"
              showIcon
            />
            <Spin spinning={isRegenerating || isRunning} tip="AI正在生成中，请稍候...">
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
                rows={16}
                style={{ fontSize: '14px', marginTop: 8 }}
              />
            </Spin>
          </div>

          {userTookControl && (
            <Text type="info" style={{ fontSize: '12px' }}>
              您已接管编辑，请手动提交
            </Text>
          )}
          {countdown > 0 && !userTookControl && (
            <Text type="warning" style={{ fontSize: '12px' }}>
              {countdown}秒后将自动提交，如需编辑请点击下方文本框
            </Text>
          )}
        </Space>
      </Modal>
    </>
  )
}

export default AIBackgroundCheckButton
