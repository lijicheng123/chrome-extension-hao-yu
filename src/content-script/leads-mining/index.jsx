import React, { useEffect, useMemo } from 'react'
import {
  Form,
  Select,
  Button,
  Row,
  Col,
  Alert,
  Switch,
  ConfigProvider,
  Typography,
  message,
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
import { HIGH_Z_INDEX_CONFIG } from '../../config/ui-config.mjs'
import { useTaskManager } from './hooks/useTaskManager'
import { useBackgroundState } from './hooks/useBackgroundState'
import { useEmailProcessor } from './hooks/useEmailProcessor'
import { useDecisionEngine } from './hooks/useDecisionEngine'
import { WINDOW_TYPE } from '../../constants'
import { API_CONFIG } from '../../constants/api'
import { isGoogleMapsPage, isGoogleSearchPage, isLinkedInPage } from '../../utils/platformDetector'
// UI组件
import EmailList from './components/EmailList'
import LoginControl from '../../components/LoginControl'
import GoogleMapsControl from './components/GoogleMapsControl'
import GoogleSearchControl from './components/GoogleSearchControl'
import LinkedInSearchControl from './components/LinkedInSearchControl'
import AIBackgroundCheckButton from './components/AIBackgroundCheckButton'

import { setUserConfig } from '../../config/index.mjs'

// 样式
import style from './index.modules.scss'
import { isLandingPage } from './utils/googleSearchAutomation'

const { Link: TypographyLink } = Typography

/**
 * 线索挖掘组件
 * 用于自动化采集邮箱线索
 */
function LeadsMining({ windowType }) {
  const [form] = Form.useForm()

  // 使用自定义Hooks
  const taskManager = useTaskManager()
  const { selectedTask, handleTaskSelect, fetchTaskList, taskList } = taskManager

  const isLanding = useMemo(async () => {
    const result = await isLandingPage()
    return result
  }, [])

  // 使用background状态管理
  const backgroundState = useBackgroundState()
  const {
    casualMiningStatus,
    headless,
    setHeadless,
    emailList,
    aiFirst,
    setAiFirst,
    setEmailList,
  } = backgroundState

  const emailProcessor = useEmailProcessor(selectedTask, backgroundState)
  const { extractCurrentPageEmails, currentPageEmails, handleDeleteCustomer, locateEmail } =
    emailProcessor

  // 决策引擎 - 传入所有必要的参数
  useDecisionEngine(backgroundState, emailProcessor, taskManager, setEmailList)

  // 检查是否为谷歌地图页面
  const isGoogleMaps = isGoogleMapsPage()

  // 检查是否为谷歌搜索页面
  const isGoogleSearch = isGoogleSearchPage()

  // 检查是否为LinkedIn页面
  const isLinkedIn = isLinkedInPage()

  // 处理从LinkedIn提取的数据
  const handleLinkedInDataExtracted = async (extractedContacts) => {
    if (extractedContacts && extractedContacts.length > 0) {
      console.log('LinkedIn提取的数据:', extractedContacts)

      try {
        // 为每个联系人添加task_id
        const contactsWithTaskId = extractedContacts.map((contact) => ({
          ...contact,
          task_id: selectedTask?.id || 1, // 确保有task_id
        }))

        // 提交到服务器
        const success = await emailProcessor.submitEmailLead(contactsWithTaskId, {
          forceSubmit: true,
        })

        if (success) {
          console.log('LinkedIn线索提交成功')
          message.success(`成功提交 ${extractedContacts.length} 条LinkedIn线索！`)

          // 更新本地邮箱列表显示
          setEmailList((prev) => [...prev, ...contactsWithTaskId])
        } else {
          console.error('LinkedIn线索提交失败')
          message.error('线索提交失败，请重试')
        }
      } catch (error) {
        console.error('提交LinkedIn线索时出错:', error)
        message.error(`提交失败: ${error.message}`)
      }
    }
  }

  // 处理从谷歌地图提取的数据
  const handleGoogleMapsDataExtracted = async (extractedContacts) => {
    if (extractedContacts && extractedContacts.length > 0) {
      console.log('谷歌地图提取的数据:', extractedContacts)

      try {
        // 为每个联系人添加task_id
        const contactsWithTaskId = extractedContacts.map((contact) => ({
          ...contact,
          task_id: selectedTask?.id || 1, // 确保有task_id
        }))

        // 提交到服务器
        const success = await emailProcessor.submitEmailLead(contactsWithTaskId, {
          forceSubmit: true,
        })

        if (success) {
          console.log('谷歌地图线索提交成功')
          message.success(`成功提交 ${extractedContacts.length} 条谷歌地图线索！`)

          // 更新本地邮箱列表显示
          setEmailList((prev) => [...prev, ...contactsWithTaskId])
        } else {
          console.error('谷歌地图线索提交失败')
          message.error('线索提交失败，请重试')
        }
      } catch (error) {
        console.error('提交谷歌地图线索时出错:', error)
        message.error(`提交失败: ${error.message}`)
      }
    }
  }

  // 初始化表单
  useEffect(() => {
    if (selectedTask?.id) {
      form.setFieldsValue({ currentTask: selectedTask.id })
    }
  }, [selectedTask?.id, form])

  // 提取邮箱时使用AI
  const handleExtractWithAI = () => {
    extractCurrentPageEmails({ ai: true, isManual: true })
  }

  return (
    <ConfigProvider {...HIGH_Z_INDEX_CONFIG}>
      {windowType === WINDOW_TYPE.LEADS_MINING && (
        <div className={style['email-list']}>
          <LoginControl
            showUserInfo={false}
            showLoginPrompt={true}
            loginButtonText="登录"
            loginPromptText="登录以后才能使用挖掘功能"
            onLoginStatusChange={(loggedIn) => {
              if (loggedIn) {
                fetchTaskList()
              }
            }}
          />

          <Form form={form} name="prompt" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
            {taskList?.length > 0 && (
              <Row align="top">
                <Col span={22}>
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
                </Col>
                <Col span={2}>
                  <Button
                    style={{ marginTop: 4 }}
                    size="small"
                    type="link"
                    onClick={fetchTaskList}
                    icon={<ReloadOutlined />}
                    title="刷新任务列表"
                  />
                </Col>
              </Row>
            )}
            {taskList?.length < 1 && (
              <Row>
                <Col span={24}>
                  <Alert
                    message={
                      <>
                        当前没有可用任务
                        <TypographyLink
                          href={`${API_CONFIG.BASE_URL}/web#action=leads.action_mining_task`}
                          target="_blank"
                        >
                          前往创建
                        </TypographyLink>
                        或者
                        <Button type="link" onClick={fetchTaskList}>
                          刷新
                        </Button>
                        任务列表
                      </>
                    }
                    type="warning"
                    showIcon
                  />
                </Col>
              </Row>
            )}

            {/* 是否总是打开挖掘面板 headless为false就是一直打开挖掘面板，用Switch组件 */}
            <Row>
              <Col span={12}>
                <Form.Item
                  label={`总是展开`}
                  name="headless"
                  valuePropName="checked"
                  wrapperCol={{ span: 12 }}
                  labelCol={{ span: 12 }}
                  tooltip="是否总是展开此面板"
                >
                  <Switch
                    value={!headless}
                    onChange={() => {
                      setUserConfig({ headless: !headless })
                      setHeadless(!headless)
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={`AI优先`}
                  name="aiFirst"
                  valuePropName="checked"
                  wrapperCol={{ span: 12 }}
                  labelCol={{ span: 12 }}
                  tooltip="如果打开默认使用AI提取联系人信息，否则用正则匹配网页内容"
                >
                  <Switch
                    value={aiFirst}
                    onChange={(checked) => {
                      setUserConfig({ aiFirst: checked })
                      setAiFirst(checked)
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          {/* 谷歌地图获客操控面板 - 仅在谷歌地图页面显示 */}
          {isGoogleMaps && (
            <GoogleMapsControl
              selectedTask={selectedTask}
              onDataExtracted={handleGoogleMapsDataExtracted}
            />
          )}

          {/* 谷歌搜索操控面板 - 仅在谷歌搜索页面显示 */}
          {isGoogleSearch && <GoogleSearchControl selectedTask={selectedTask} />}

          {/* LinkedIn搜索操控面板 - 仅在LinkedIn页面显示 */}
          {isLinkedIn && (
            <LinkedInSearchControl
              selectedTask={selectedTask}
              onDataExtracted={handleLinkedInDataExtracted}
            />
          )}

          {/* AI背调按钮 - 仅在LandingPage显示 */}
          {isLanding === true && <AIBackgroundCheckButton />}

          {/* 根据页面类型显示不同的联系方式列表 */}
          {casualMiningStatus === 'cRunning' ? (
            // 其他页面的随缘挖掘：显示当前页面的联系方式
            <EmailList
              isShowCurrentPageEmails={isGoogleSearch ? false : true}
              emailList={
                isGoogleMaps || isGoogleSearch || isLanding ? emailList : currentPageEmails
              }
              handleDeleteCustomer={handleDeleteCustomer}
              locateEmail={locateEmail}
              style={style}
              extractCurrentPageEmails={handleExtractWithAI}
            />
          ) : (
            // 其他页面的手动提取：显示本地存储的联系方式
            <EmailList
              isShowCurrentPageEmails={false}
              emailList={emailList}
              handleDeleteCustomer={handleDeleteCustomer}
              locateEmail={locateEmail}
              style={style}
            />
          )}
        </div>
      )}
    </ConfigProvider>
  )
}

// 添加PropTypes验证
LeadsMining.propTypes = {
  windowType: PropTypes.string,
}

export default LeadsMining
