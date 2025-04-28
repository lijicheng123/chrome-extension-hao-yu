import React from 'react'
import { Card, Typography, Space, Empty, Divider, Tag, Button, Badge } from 'antd'
import { API_CONFIG } from '../../../constants/api'
const { Paragraph, Text, Link } = Typography

/**
 * 邮箱列表组件
 * 显示发现的邮箱列表
 */
const EmailList = ({
  isShowCurrentPageEmails,
  emailList,
  handleEditEmail,
  handleDeleteCustomer,
  locateEmail,
  style,
}) => {
  return (
    <>
      <Divider orientation="left">
        <Badge count={emailList.length} offset={[2, -2]} size="small">
          {isShowCurrentPageEmails ? '当前页面邮箱' : '发现的邮箱'}
        </Badge>
        <Link
          size="small"
          href={`${API_CONFIG.BASE_URL}/web#action=crm.crm_lead_all_leads`}
          target="_blank"
          style={{ marginLeft: 8 }}
        >
          查看全部
        </Link>
      </Divider>

      {emailList.length > 0 ? (
        emailList.map((email) => (
          <Card key={email} style={{ marginBottom: 8 }} hoverable>
            <div className={style['email-list-card']}>
              <Paragraph copyable={{ text: email }}>
                <Text strong>{email}</Text>
              </Paragraph>
              <Space>
                {/* <a onClick={() => handleEditEmail(email)}>编辑</a> */}
                {/* <a onClick={() => handleDeleteCustomer(email)}>删除</a> */}
                <a onClick={() => locateEmail(email)}>定位</a>
              </Space>
            </div>
          </Card>
        ))
      ) : (
        <Empty description="暂无发现的邮箱" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </>
  )
}

export default EmailList
