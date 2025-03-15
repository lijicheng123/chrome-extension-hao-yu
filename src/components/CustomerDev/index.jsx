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
import { customerDevService } from '../../services/api/customerDev'
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
      if (storedTaskList?.length > 0) {
        setTaskList(storedTaskList)
        const storedSelectedTask = await Browser.storage.local.get('selectedTask')

        if (storedSelectedTask.selectedTask) {
          setSelectedTask(storedSelectedTask.selectedTask)
          form.setFieldsValue({ currentTask: storedSelectedTask.selectedTask.id })
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
      const siteMatched = sites?.split('\n').some((site) => {
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
    let taskList = await Browser.storage.local.get('taskList')?.taskList || []
    // if (!taskList || !taskList.taskList) {
    taskList = await fetchTaskList()
    // }
    return taskList || []
  }

  async function fetchTaskList() {
    try {
      const taskList = await customerDevService.getTaskList()
      await Browser.storage.local.set({ taskList: taskList })
      setTaskList(taskList)
      await Browser.storage.local.set({ selectedTask: taskList?.[0] || [] })
      return taskList
    } catch (error) {
      console.error('fetchTaskList:', error)
      // 显示更详细的错误信息
      message.error({
        content: `获取任务列表失败: ${error.message}}`,
        duration: 5, // 显示时间更长，便于查看
      })
      // throw error
    }
  }

  async function updateCustomer(customerId, customerData) {
    try {
      return await customerDevService.updateCustomer(customerId, customerData)
    } catch (error) {
      console.error('更新客户信息失败:', error)
      throw error
    }
  }

  async function handleUpdateCustomer(customerId, customerData) {
    try {
      const updatedCustomer = await updateCustomer(customerId, customerData)
      console.log('Updated Customer:', updatedCustomer)
      message.success('客户信息更新成功')
    } catch (error) {
      // 显示更详细的错误信息
      message.error({
        content: `客户信息更新失败: ${error.message}${error.details ? ' - ' + JSON.stringify(error.details) : ''}`,
        duration: 5,
      })
    }
  }

  async function batchCreateCustomers(customers = []) {
    try {
      return await customerDevService.batchCreateCustomers(customers)
    } catch (error) {
      console.error('批量创建客户失败:', error)
      throw error
    }
  }

  async function deleteCustomer(customerId) {
    try {
      return await customerDevService.deleteCustomer(customerId)
    } catch (error) {
      console.error('删除客户失败:', error)
      throw error
    }
  }

  async function handleDeleteCustomer(customerId) {
    try {
      await deleteCustomer(customerId)
      message.success('客户删除成功')
      setEmailList(emailList.filter((email) => email !== customerId))
    } catch (error) {
      // 显示更详细的错误信息
      message.error({
        content: `客户删除失败: ${error.message}${error.details ? ' - ' + JSON.stringify(error.details) : ''}`,
        duration: 5,
      })
    }
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
      message.success('客户创建成功')
    } catch (error) {
      console.error('Error in handleBatchCreate:', error)
      // 显示更详细的错误信息
      message.error({
        content: `客户创建失败: ${error.message}${error.details ? ' - ' + JSON.stringify(error.details) : ''}`,
        duration: 5,
      })
    }
  }

  const handleSubmitLeads = async () => {
    try {
      // 构建线索数据
      const leadData = {
        // 联系人信息
        "user_name": "张三11",                           // 联系人姓名（必填）
        "user_function": "销售总监",                    // 联系人职位
        "user_email": "zhangsan@example.com",         // 联系人邮箱
        "user_phone": "13800138000",                  // 联系人电话
        "user_mobile": "13900139000",                 // 联系人手机
        "user_website": "https://personal.example.com", // 联系人网站
        "user_street": "朝阳区建国路88号",              // 联系人地址
        "user_street2": "2号楼3层",                    // 联系人地址2
        "user_city": "北京",                           // 联系人城市
        "user_country_id": 233,                        // 联系人国家ID
        "user_state_id": 13,                          // 联系人省份ID
        "user_title_id": 3,                           // 联系人称谓ID

        // 公司信息
        "company_name": "示例科技有限公司11",              // 公司名称（必填）
        "company_street": "朝阳区建国路88号",           // 公司地址
        "company_street2": "2号楼整栋",                // 公司地址2
        "company_city": "北京",                        // 公司城市
        "company_country_id": 233,                     // 公司国家ID
        "company_state_id": 13,                       // 公司省份ID
        "company_phone": "010-12345678",              // 公司电话
        "company_email": "contact@example.com",       // 公司邮箱
        "company_website": "https://www.example.com", // 公司网站

        // 线索信息
        "thread_name": "示例科技合作机会11",               // 线索名称（必填）
        "thread_type": "lead",                 // 线索类型：lead(线索)或opportunity(商机)
        "linkin_site": "https://linkedin.com/in/zhangsan", // LinkedIn链接
        "city": "北京",                                // 线索城市
        "country_id": 233,                             // 线索国家ID
        "state_id": 13,                               // 线索省份ID
        "street": "朝阳区建国路88号",                   // 线索地址
        "street2": "2号楼",                           // 线索地址2
        "tag_names": ["潜在客户", "高价值", "科技行业"],   // 标签名称列表
        "priority": "2",                              // 优先级：0(低)、1(中)、2(高)、3(很高)
        // 来源信息
        "task_id": selectedTask?.id,           // 关联的任务ID
        "leads_source_url": window.location.href,
        "leads_target_url": window.location.href,
        'leads_keywords': 'bottle \n water bottle',
      };

      const result = await customerDevService.submitLead(leadData);
      console.log('线索创建成功:', result);
      message.success('线索创建成功');
    } catch (error) {
      console.error('创建线索失败:', error);
      // 显示更详细的错误信息
      message.error({
        content: `创建线索失败: ${error.message}${error.details ? ' - ' + JSON.stringify(error.details) : ''}`,
        duration: 5,
      });
    }
  }

  const handleEditEmail = (email) => {
    setEditingEmail(email)
    setNewEmailValue(email)
    const note = getNoteForEmail(email) || ''
    setNewNoteValue(note)
  }

  const handleUpdateEmail = async () => {
    if (editingEmail) {
      const updatedEmail = newEmailValue
      const updatedNote = newNoteValue
      try {
        await handleUpdateCustomer(editingEmail, { email: updatedEmail, notes: updatedNote })
        setEmailList((prev) => prev.map((email) => (email === editingEmail ? updatedEmail : email)))
        setEditingEmail(null)
        setNewEmailValue('')
        setNewNoteValue('')
      } catch (error) {
        // 显示更详细的错误信息
        message.error({
          content: `更新邮箱失败: ${error.message}${error.details ? ' - ' + JSON.stringify(error.details) : ''}`,
          duration: 5,
        })
      }
    }
  }

  const getNoteForEmail = () => {
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
            defaultValue={taskList?.[0]?.id}
          >
            <Select
              placeholder="请选择挖掘任务"
              onChange={handleTaskSelect}
              style={{ width: 200, marginBottom: '16px' }}
            >
              {taskList?.map((task) => (
                <Select.Option key={task.id} value={task.id}>
                  {task.name}
                </Select.Option>
              ))}
            </Select>
          </Item>
          <Item name="autoRun" label="自动挖掘" valuePropName="checked" initialValue={false}>
            <Switch />
          </Item>
          <Button onClick={handleSubmit}>保存</Button>
          <Button onClick={handleSubmitLeads}>提交线索</Button>
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
