import Browser from 'webextension-polyfill'
import { useEffect, useState } from 'react'
import {
  Form,
  Card,
  Typography,
  Space,
  Button,
  Select,
  Modal,
  Input,
  message,
  ConfigProvider,
  Switch,
} from 'antd'
const { Paragraph, Text } = Typography
import {
  getPageText,
  matchEmailsInText,
  removeDuplicates,
  scrollToEmail,
  highlightEmail,
} from './crawler'
import { scrollToBottom, clickNextPage } from './google'
import { requestManager } from '../../services/api/request'
import style from './index.modules.scss'

function CustomerDev() {
  const [form] = Form.useForm()
  const Item = Form.Item

  const [taskList, setTaskList] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [emailList, setEmailList] = useState([])
  const [editingEmail, setEditingEmail] = useState(null)
  const [newEmailValue, setNewEmailValue] = useState('')
  const [newNoteValue, setNewNoteValue] = useState('')

  useEffect(() => {
    const fetchTaskListFromStorage = async () => {
      const storedTaskList = await getTaskList()
      if (storedTaskList) {
        setTaskList(storedTaskList)
        const storedSelectedTask = await Browser.storage.local.get('selectedTask')
        if (storedSelectedTask.selectedTask) {
          setSelectedTask(storedSelectedTask.selectedTask)
          form.setFieldsValue({ currentTask: storedSelectedTask.selectedTask.task_id })
        }
      }
    }
    fetchTaskListFromStorage()
  }, [])

  useEffect(() => {
    // 判断域名和路径是否匹配
    // 判断关键词是否匹配
    if (selectedTask?.id) {
      const { sites = '', keywords = '' } = selectedTask
      const siteMatched = sites.split('\n').some((site) => {
        const regex = new RegExp(site, 'i')
        return regex.test(window.location.hostname)
      })
      const keywordMatched = keywords.split('\n').some((keyword) => {
        const regex = new RegExp(keyword, 'i')
        const decodedUrl = decodeURIComponent(window.location.href)
        return regex.test(decodedUrl)
      })
      console.log('666:siteMatched:', siteMatched)
      console.log('666:keywordMatched:', keywordMatched)
    }
  }, [selectedTask])

  const handleTaskSelect = async (taskId) => {
    const task = taskList.find((t) => t.task_id === taskId)
    setSelectedTask(task)
    await Browser.storage.local.set({ selectedTask: task })
  }

  async function getTaskList() {
    let taskList = await Browser.storage.local.get('taskList')
    if (!taskList || !taskList.taskList) {
      taskList = await fetchTaskList()
    }
    return taskList.taskList || []
  }

  async function fetchTaskList() {
    try {
      const response = await requestManager.get('/api/leads/task/list', {
        body: {},
      })
      console.log('Raw response from background:', response)
      if (response === null || response === undefined || response.success !== true) {
        throw new Error(
          'Response from background script is null or undefined, or success is false.',
        )
      }
      const taskList = response.data
      await Browser.storage.local.set({ taskList: taskList.items })
      setTaskList(taskList.items)
      await Browser.storage.local.set({ selectedTask: taskList.items?.[0] || [] })
      return taskList.items
    } catch (error) {
      console.error('Error in getData:', error)
      throw error
    }
  }

  async function updateCustomer(customerId, customerData) {
    try {
      const response = await requestManager.post(`/api/leads/customer/${customerId}/update`, {
        body: customerData,
      })
      console.log('Raw response from background:', response)
      if (response === null || response === undefined || response.success !== true) {
        throw new Error(
          'Response from background script is null or undefined, or success is false.',
        )
      }
      return response.data
    } catch (error) {
      console.error('Error in updateCustomer:', error)
      throw error
    }
  }

  async function handleUpdateCustomer(customerId, customerData) {
    const updatedCustomer = await updateCustomer(customerId, customerData)
    console.log('Updated Customer:', updatedCustomer)
  }

  async function batchCreateCustomers(customers = []) {
    try {
      const response = await requestManager.post('/api/leads/customer/create', {
        customers,
      })
      console.log('Raw response from background:', response)
      if (response === null || response === undefined || response.success !== true) {
        throw new Error(
          'Response from background script is null or undefined, or success is false.',
        )
      }
      return response.data
    } catch (error) {
      console.error('Error in batchCreateCustomers:', error)
      throw error
    }
  }

  async function deleteCustomer(customerId) {
    try {
      const response = await requestManager.post(`/api/leads/customer/${customerId}/delete`, {
        body: {},
      })
      console.log('Raw response from background:', response)
      if (response === null || response === undefined || response.success !== true) {
        throw new Error(
          'Response from background script is null or undefined, or success is false.',
        )
      }
      return response.data
    } catch (error) {
      console.error('Error in deleteCustomer:', error)
      throw error
    }
  }

  async function handleDeleteCustomer(customerId) {
    const deletedCustomer = await deleteCustomer(customerId)
    console.log('Deleted Customer:', deletedCustomer)
    setEmailList(emailList.filter((email) => email !== customerId))
  }

  const extractContactInfoFromPage = () => {
    const pageText = getPageText()
    if (selectedTask) {
      // eslint-disable-next-line no-unused-vars
      const { keywords, exclusion_keywords, email_suffixes } = selectedTask
      // 进行关键词匹配的逻辑
      // ...
    }
    const emails = matchEmailsInText(pageText)
    const uniqueEmails = removeDuplicates(emails)
    return uniqueEmails
  }

  const handleClick = (email) => {
    const emailElement = document.querySelector(`[data-email='${email}']`)
    if (emailElement) {
      scrollToEmail(emailElement)
      highlightEmail(emailElement)
    } else {
      message.error('这个我不好找，你自己 ctr+F 找吧')
    }
  }

  const handleAutoCrawl = () => {
    scrollToBottom()
    setTimeout(() => {
      clickNextPage()
    }, 1000)
  }

  useEffect(() => {
    console.log('document.body.innerText are changing')
    const emails = extractContactInfoFromPage()
    setEmailList(emails)
  }, [document.body.innerText])

  const handleSubmit = async () => {
    const customersToCreate = emailList.map((email) => ({
      name: email,
      email: email,
      phone: '',
      company_name: '',
      gender: '',
      age: '',
      notes: '',
      source: 'google',
      task_id: selectedTask.task_id,
    }))
    try {
      const createdCustomers = await batchCreateCustomers(customersToCreate)
      console.log('Created Customers:', createdCustomers)
    } catch (error) {
      console.error('Error in handleBatchCreate:', error)
    }
  }

  const handleEditEmail = (email) => {
    setEditingEmail(email)
    setNewEmailValue(email)
    const note = getNoteForEmail(email)
    setNewNoteValue(note)
  }

  const handleUpdateEmail = async () => {
    if (editingEmail) {
      const updatedEmail = newEmailValue
      const updatedNote = newNoteValue
      await handleUpdateCustomer(editingEmail, { email: updatedEmail, notes: updatedNote })
      setEmailList((prev) => prev.map((email) => (email === editingEmail ? updatedEmail : email)))
      setEditingEmail(null)
      setNewEmailValue('')
      setNewNoteValue('')
    }
  }

  const getNoteForEmail = (email) => {
    // 这里应该实现获取邮箱对应注释的逻辑
    // 暂时返回空字符串
    return ''
  }

  console.log('selectedTask:', selectedTask)

  return (
    <ConfigProvider>
      <div className={style['email-list']}>
        <Form form={form} name="prompt" labelCol={{ span: 6 }} wrapperCol={{ span: 14 }}>
          <Item
            label="挖掘任务"
            name="currentTask"
            tooltip="挖掘任务"
            rules={[
              {
                required: true,
                message: '请选择挖掘任务',
              },
            ]}
            style={{ marginBottom: 0 }}
          >
            <Select
              placeholder="请选择挖掘任务"
              onChange={handleTaskSelect}
              style={{ width: 200, marginBottom: '16px' }}
            >
              {taskList.map((task) => (
                <Select.Option key={task.task_id} value={task.task_id}>
                  {task.name}
                </Select.Option>
              ))}
            </Select>
          </Item>
          <Item name="autoRun" label="自动挖掘" valuePropName="checked" initialValue={false}>
            <Switch />
          </Item>
          <Button onClick={handleSubmit}>保存</Button>
          <Button onClick={fetchTaskList}>刷新任务列表</Button>
          <Button onClick={handleAutoCrawl} style={{ marginLeft: '8px' }}>
            开始
          </Button>
          {emailList.map((email) => (
            <Card key={email} style={{ marginBottom: '8px' }}>
              <div className={style['email-list-card']}>
                <Paragraph copyable={{ text: email }}>
                  <Text>{email}</Text>
                </Paragraph>
                <Space>
                  <a onClick={() => handleEditEmail(email)}>编辑</a>
                  <a onClick={() => handleDeleteCustomer(email)}>删除</a>
                  <a onClick={() => handleClick(email)}>定位</a>
                </Space>
              </div>
            </Card>
          ))}
        </Form>
        <Modal
          title="编辑邮箱"
          visible={!!editingEmail}
          onOk={handleUpdateEmail}
          onCancel={() => setEditingEmail(null)}
        >
          <Input
            value={newEmailValue}
            onChange={(e) => setNewEmailValue(e.target.value)}
            placeholder="输入新的邮箱地址"
          />
          <Input
            value={newNoteValue}
            onChange={(e) => setNewNoteValue(e.target.value)}
            placeholder="输入备注"
            style={{ marginTop: '10px' }}
          />
        </Modal>
      </div>
    </ConfigProvider>
  )
}

export default CustomerDev
