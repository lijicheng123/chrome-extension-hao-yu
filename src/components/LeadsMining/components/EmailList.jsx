import React from 'react'
import { Card, Typography, Space, Empty, Divider, Tag, Button, Badge, Tooltip } from 'antd'
import { API_CONFIG } from '../../../constants/api'
const { Paragraph, Text, Link } = Typography
import { ReloadOutlined } from '@ant-design/icons'
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
  extractCurrentPageEmails,
}) => {
  return (
    <>
      <Divider orientation="left">
        <Badge count={emailList.length} offset={[2, -2]} size="small">
          {isShowCurrentPageEmails ? '当页邮箱' : '发现的邮箱'}
        </Badge>
        <Link
          size="small"
          href={`${API_CONFIG.BASE_URL}/web#action=crm.crm_lead_all_leads`}
          target="_blank"
          style={{ marginLeft: 16 }}
        >
          查看全部
        </Link>
        <Button
          title="重新抓取"
          type="link"
          icon={<ReloadOutlined />}
          onClick={extractCurrentPageEmails}
        />
      </Divider>

      {emailList.length > 0 ? (
        emailList.map((emailInfo) => {
          console.log('emailInfo===》：', emailInfo)
          const isJustOneEmail = typeof emailInfo === 'string'
          const email = isJustOneEmail ? emailInfo : emailInfo.user_email
          return (
            <Card key={email} style={{ marginBottom: 8 }} hoverable>
              <div className={style['email-list-card']}>
                <Paragraph
                  copyable={{
                    text: typeof email === 'string' ? email : email.user_email || email.email,
                  }}
                >
                  <Tooltip
                    title={
                      typeof email === 'string' ? null : (
                        <div style={{ maxWidth: '300px' }}>
                          <p>
                            <strong>邮箱：</strong>
                            {email.user_email || email.email}
                          </p>
                          {email.user_name && (
                            <p>
                              <strong>姓名：</strong>
                              {email.user_name}
                            </p>
                          )}
                          {email.user_function && (
                            <p>
                              <strong>职位：</strong>
                              {email.user_function}
                            </p>
                          )}
                          {email.user_phone && (
                            <p>
                              <strong>电话：</strong>
                              {email.user_phone}
                            </p>
                          )}
                          {email.company_name && (
                            <p>
                              <strong>公司：</strong>
                              {email.company_name}
                            </p>
                          )}
                          {email.company_website && (
                            <p>
                              <strong>网站：</strong>
                              {email.company_website}
                            </p>
                          )}
                        </div>
                      )
                    }
                  >
                    <Text strong>
                      {typeof email === 'string' ? email : email.user_email || email.email}
                    </Text>
                  </Tooltip>
                </Paragraph>
                <Space>
                  <a onClick={() => locateEmail(email)}>定位</a>
                </Space>
              </div>
            </Card>
          )
        })
      ) : (
        <Empty description="暂无发现的邮箱" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </>
  )
}

export default EmailList
