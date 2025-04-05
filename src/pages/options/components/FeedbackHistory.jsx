import React, { useEffect, useState } from 'react'
import { Table, Tag, Typography, Spin, Empty, message } from 'antd'
import { requestManager } from '../../../services/api/request'
const { Title } = Typography

const typeLabels = {
  bug: '提Bug',
  feature: '提需求',
  cooperation: '合作咨询',
  problem: '问题咨询',
  question: '相关问题',
  design: '架构咨询',
  other: '其他',
}

const stateColors = {
  new: 'blue',
  processing: 'orange',
  resolved: 'green',
  closed: 'red',
  pending: 'purple',
}

const stateLabels = {
  new: '新建',
  processing: '处理中',
  resolved: '已解决',
  closed: '已关闭',
  pending: '待补充',
}

const FeedbackHistory = () => {
  const [loading, setLoading] = useState(false)
  const [feedbackList, setFeedbackList] = useState([])

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => <span>{typeLabels[type] || type}</span>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '联系方式',
      dataIndex: 'contact_method',
      key: 'contact_method',
      width: 200,
      ellipsis: true,
    },
    {
      title: '提交时间',
      dataIndex: 'create_date',
      key: 'create_date',
      width: 170,
      render: (create_date) => {
        return new Date(create_date).toLocaleString()
      },
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 100,
      render: (state) => (
        <Tag color={stateColors[state] || 'default'}>{stateLabels[state] || state}</Tag>
      ),
    },
  ]

  useEffect(() => {
    fetchFeedbackHistory()
  }, [])

  const fetchFeedbackHistory = async () => {
    setLoading(true)
    try {
      const formData = {} // 如果需要筛选条件，可以在这里添加

      const res = await requestManager.request('/api/contact/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: formData,
      })

      if (res && res.success) {
        setFeedbackList(res.data || [])
      } else {
        message.error(res?.message || '获取反馈历史记录失败')
      }
    } catch (error) {
      console.error('获取反馈历史记录出错:', error)
      message.error('获取反馈历史记录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      <Title level={3}>历史反馈记录</Title>

      <Spin spinning={loading}>
        {feedbackList.length > 0 ? (
          <Table
            columns={columns}
            dataSource={feedbackList}
            rowKey="id"
            pagination={false}
            size="middle"
          />
        ) : (
          <Empty description="暂无反馈记录" />
        )}
      </Spin>
    </div>
  )
}

export default FeedbackHistory
