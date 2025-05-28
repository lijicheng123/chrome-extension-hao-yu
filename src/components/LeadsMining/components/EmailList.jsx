import React from 'react'
import { Card, Typography, Space, Empty, Divider, Button, Badge, Tooltip } from 'antd'
import { API_CONFIG } from '../../../constants/api'
const { Paragraph, Text, Link } = Typography
import { ReloadOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
/**
 * 邮箱列表组件
 * 显示发现的邮箱列表
 */
const EmailList = ({
  isShowCurrentPageEmails,
  emailList,
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
        emailList.map((emailInfo = {}) => {
          const { user_name, user_function, user_phone, company_name, company_website } = emailInfo

          const user_email = emailInfo.user_email || user_name

          return (
            <Card key={user_email} style={{ marginBottom: 8 }} hoverable>
              <div className={style['email-list-card']}>
                <Paragraph copyable={{ text: user_email }}>
                  <Tooltip
                    title={
                      <div style={{ maxWidth: '300px' }}>
                        <p>
                          <strong>邮箱：</strong>
                          {user_email}
                        </p>
                        {user_name && (
                          <p>
                            <strong>姓名：</strong>
                            {user_name}
                          </p>
                        )}
                        {user_function && (
                          <p>
                            <strong>职位：</strong>
                            {user_function}
                          </p>
                        )}
                        {user_phone && (
                          <p>
                            <strong>电话：</strong>
                            {user_phone}
                          </p>
                        )}
                        {company_name && (
                          <p>
                            <strong>公司：</strong>
                            {company_name}
                          </p>
                        )}
                        {company_website && (
                          <p>
                            <strong>网站：</strong>
                            {company_website}
                          </p>
                        )}
                      </div>
                    }
                  >
                    <Text strong>{user_email}</Text>
                  </Tooltip>
                </Paragraph>
                <Space>
                  <a onClick={() => locateEmail(emailInfo)}>定位</a>
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

EmailList.propTypes = {
  isShowCurrentPageEmails: PropTypes.bool,
  emailList: PropTypes.arrayOf(
    PropTypes.shape({
      user_email: PropTypes.string.isRequired,
      user_name: PropTypes.string,
      user_function: PropTypes.string,
      user_phone: PropTypes.string,
      user_mobile: PropTypes.string,
      company_name: PropTypes.string,
      company_phone: PropTypes.string,
      company_email: PropTypes.string,
      company_website: PropTypes.string,
      linkin_site: PropTypes.string,
      tag_names: PropTypes.arrayOf(PropTypes.string),
    }),
  ),
  locateEmail: PropTypes.func.isRequired,
  style: PropTypes.object.isRequired,
  extractCurrentPageEmails: PropTypes.func.isRequired,
}

export default EmailList
