import React from 'react'
import { Card, Typography, Space, Empty, Divider } from 'antd'
const { Paragraph, Text } = Typography

/**
 * 邮箱列表组件
 * 显示发现的邮箱列表
 */
const EmailList = ({ emailList, handleEditEmail, handleDeleteCustomer, locateEmail, style }) => {
  return (
    <>
      <Divider orientation="left">发现的邮箱 ({emailList.length})</Divider>

      {emailList.length > 0 ? (
        emailList.map((email) => (
          <Card key={email} style={{ marginBottom: 8 }}>
            <div className={style['email-list-card']}>
              <Paragraph copyable={{ text: email }}>
                <Text>{email}</Text>
              </Paragraph>
              <Space>
                <a onClick={() => handleEditEmail(email)}>编辑</a>
                <a onClick={() => handleDeleteCustomer(email)}>删除</a>
                <a onClick={() => locateEmail(email)}>定位</a>
              </Space>
            </div>
          </Card>
        ))
      ) : (
        <Empty description="暂无发现的邮箱" />
      )}
    </>
  )
}

export default EmailList
