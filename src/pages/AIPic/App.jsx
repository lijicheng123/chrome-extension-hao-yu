import React from 'react'
import { Button } from 'antd'
import { Card, Typography, Space, Select, Modal, Input, message } from 'antd'
import { FormOutlined } from '@ant-design/icons'
import Browser from 'webextension-polyfill'
function AiPic() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>正在开发中，敬请期待……</h1>
      <h2>如有想说的欢迎给我们留言</h2>
      <a
        href={`chrome-extension://${Browser.runtime.id}/options.html#feedback`}
        target="_blank"
        rel="noreferrer"
      >
        <FormOutlined style={{ marginRight: '4px' }} />
        联系我们
      </a>
      {/* <Button type="primary">Click me</Button>
      <Select
        placeholder="选择任务"
        style={{ width: 200, marginBottom: '16px' }}
        options={[
          { value: '1', label: 'Jack' },
          { value: '2', label: 'Lucy' },
          { value: '3', label: 'Tom' },
        ]}
      /> */}
    </div>
  )
}

export default AiPic
