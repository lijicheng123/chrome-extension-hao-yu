import React from 'react'
import { Tabs, Button } from 'antd'
import Prompt from './components/prompt'
import ConfigPanel from './components/config-panel'
import LoginPage from './components/auth/login'
import Feedback from './components/feedback'
import Setting from './components/setting'
function options() {
  // 从URL里获取hash，不需要#
  const hash = window.location.hash.slice(1)
  console.log(hash)
  // 从URL里获取redirect参数
  const redirect = new URLSearchParams(window.location.search).get('redirect')
  console.log(redirect)

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
    {
      label: 'Setting',
      key: 'setting',
      children: <Setting />,
    },
    {
      label: 'Feedback',
      key: 'feedback',
      children: <Feedback />,
    },
  ]
  return (
    <div>
      <Tabs tabPosition="left" items={tabItems} defaultActiveKey={hash} />
    </div>
  )
}

export default options
