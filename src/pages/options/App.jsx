import React from 'react'
import { Tabs, Button } from 'antd'
import Prompt from './components/prompt'
import ConfigPanel from './components/config-panel'
import LoginPage from './components/auth/login'

function options() {
  const tabItems = [
    {
      label: '用户中心',
      key: 'user',
      children: <LoginPage />,
    },
    {
      label: 'Prompt',
      key: 'prompt',
      children: <Prompt />,
    },
    {
      label: 'Config',
      key: 'config',
      children: <ConfigPanel />,
    },
  ]
  return (
    <div>
      <Tabs tabPosition="left" items={tabItems} />
    </div>
  )
}

export default options
