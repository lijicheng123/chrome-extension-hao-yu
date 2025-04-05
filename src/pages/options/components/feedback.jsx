import React from 'react'
import { Form, Select, Input, Button, Typography, message } from 'antd'
import { requestManager } from '../../../services/api/request'
import FeedbackHistory from './FeedbackHistory'
const { Title, Paragraph, Link } = Typography
const { Option } = Select
const { TextArea } = Input

const ContactForm = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = React.useState(false)
  const onFinish = async (values) => {
    setLoading(true)

    const formData = {
      ...values,
      attachments: '', // 不使用附件功能，设为空字符串
      state: 'new', // 默认状态为 new
    }

    console.log('表单提交数据:', formData)

    try {
      const res = await requestManager.request('/api/contact/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: formData,
      })
      console.log(res)
      message.success('您的反馈已成功提交，我们会尽快处理！')
      form.resetFields()
    } catch (error) {
      console.error(error)
      message.error('提交失败，请稍后再试！')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="options-page">
      <Typography>
        <Title level={2}>联系我们</Title>
        <Paragraph>
          我们非常重视您的使用体验，如果您在使用过程中任何不舒服的地方请告诉我们，我们将尽一切努力解决您的问题并提升体验。您的满意是我们不断追求的，我们随时可以在这里联系，期待收到您的反馈。
        </Paragraph>
      </Typography>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          type: 'bug',
        }}
      >
        <Form.Item
          label={<>类型：</>}
          name="type"
          rules={[{ required: true, message: '请选择问题类型' }]}
        >
          <Select placeholder="请选择类型">
            <Option value="bug">提Bug</Option>
            <Option value="feature">提需求</Option>
            <Option value="cooperation">有合作需求咨询</Option>
            <Option value="problem">有问题需要咨询</Option>
            <Option value="design">我就想BB两句</Option>
            <Option value="other">其他</Option>
          </Select>
        </Form.Item>

        <Form.Item label="标题：" name="title" rules={[{ required: true, message: '请输入标题' }]}>
          <Input placeholder="请输入标题" maxLength={100} />
        </Form.Item>

        <Form.Item
          label={<>详细描述：</>}
          name="description"
          rules={[{ required: true, message: '请输入详细描述' }]}
        >
          <TextArea
            placeholder="请描述详细情况"
            autoSize={{ minRows: 4, maxRows: 8 }}
            showCount
            maxLength={1000}
          />
        </Form.Item>

        <Form.Item
          label={<>联系方式：</>}
          name="contact_method"
          rules={[{ required: true, message: '请输入您的联系方式' }]}
          extra="请留下您的联系信息，以便我们回复并及时解决您的问题"
        >
          <Input placeholder="请输入您的邮箱或者电话号码" maxLength={100} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} style={{ float: 'right' }}>
            立即发送
          </Button>
        </Form.Item>
      </Form>

      <div style={{ marginTop: 60, textAlign: 'left' }}>
        <Paragraph>您也可以通过电子邮件和我们进行联系</Paragraph>
        <Link href="mailto:contact@haoyuai.cn">contact@haoyuai.cn</Link>
      </div>
      <FeedbackHistory />
    </div>
  )
}

export default ContactForm
