import React, { useState, useEffect } from 'react'
import { Form, Input, Button, message, Card } from 'antd'
import Browser from 'webextension-polyfill'
import { MailOutlined } from '@ant-design/icons'
import { authService } from '../../../../services/auth/auth-service'
import './login.scss'
import { getUserConfig } from '../../../../config/index.mjs'
import { toLogout, toLogin } from '../../../../components/LoginControl'
import { USER_SESSION_KEY } from '../../../../constants/session'
import { fetchOdooUserSessionInfo } from '../../../../background/userSessionInfo.mjs'
function LoginPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [userInfo, setUserInfo] = useState(null)

  useEffect(() => {
    checkLoginStatus()
  }, [])

  // 检查登录状态
  const checkLoginStatus = async () => {
    const info = await Browser.storage.local.get(USER_SESSION_KEY)
    if (info?.user_session) {
      setUserInfo(info?.user_session)
    } else {
      const userInfo = await fetchOdooUserSessionInfo()
      setUserInfo(userInfo)
    }
  }

  // 退出登录
  const handleLogout = async () => {
    try {
      setLoading(true)
      await toLogout()
      setUserInfo(null)
      message.success('退出登录成功')
    } catch (error) {
      message.error('退出登录失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleRedirect(redirectUrl) {
    if (!redirectUrl) {
      console.log('没有重定向地址')
      return
    }

    try {
      // 查询url为redirectUrl的tab
      const [tab] = await Browser.tabs.query({
        url: redirectUrl,
      })

      if (!tab) {
        throw new Error('未找到活动标签页')
      }

      // 验证重定向URL
      if (!isValidUrl(redirectUrl)) {
        throw new Error('无效的重定向地址')
      }

      // 获取当前tab
      const [currentTab] = await Browser.tabs.query({ active: true, currentWindow: true })
      // 关闭当前tab
      await Browser.tabs.remove(currentTab.id)

      // 更新标签页
      await Browser.tabs.update(tab.id, {
        url: redirectUrl,
      })
      // 刷新标签页
      await Browser.tabs.reload(tab.id)
    } catch (error) {
      console.error('重定向失败:', error)
      throw new Error('重定向失败，请刷新页面重试')
    }
  }

  function isValidUrl(url) {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // 渲染用户信息卡片
  const renderUserInfo = () => {
    if (!userInfo) return null

    return (
      <Card
        className="user-info-card"
        title={
          <div className="card-title">
            <span>用户信息</span>
          </div>
        }
      >
        <div className="info-container">
          <div className="info-item">
            <span className="info-label">用户名</span>
            <span className="info-value">{userInfo.name || userInfo.email}</span>
          </div>
          <div className="info-item">
            <span className="info-label">邮箱</span>
            <span className="info-value">{userInfo.username}</span>
          </div>
        </div>

        <Button
          type="primary"
          danger
          onClick={handleLogout}
          loading={loading}
          size="large"
          className="logout-button"
        >
          退出登录
        </Button>
      </Card>
    )
  }

  return (
    <div className="login-page">
      {userInfo ? (
        renderUserInfo()
      ) : (
        <Button type="primary" onClick={toLogin} loading={loading} block size="large">
          登录/注册
        </Button>
      )}
    </div>
  )
}

export default LoginPage
