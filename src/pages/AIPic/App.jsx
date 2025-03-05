import React from 'react'
import { Button } from 'antd'
import { Card, Typography, Space, Select, Modal, Input, message } from 'antd'
function AiPic() {
  return (
    <div>
      <h1>探索更先进的跨境电商图片生产方式</h1>
      <Button type="primary">Click me</Button>
      <Select
        placeholder="选择任务"
        style={{ width: 200, marginBottom: '16px' }}
        options={[
          { value: '1', label: 'Jack' },
          { value: '2', label: 'Lucy' },
          { value: '3', label: 'Tom' },
        ]}
      />
    </div>
  )
}

export default AiPic
