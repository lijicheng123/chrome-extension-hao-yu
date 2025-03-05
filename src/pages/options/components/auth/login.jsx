import React, { useState, useEffect } from 'react'
import { Form, Input, Button, message, Card } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import { authService } from '../../../../services/auth/auth-service'
import { configManager } from '../../../../services/config/config-manager'

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
    const info = await configManager.getUserInfo()
    setUserInfo(info)
  }

  // 退出登录
  const handleLogout = async () => {
    try {
      setLoading(true)
      await configManager.clearUserInfo()
      setUserInfo(null)
      message.success('退出登录成功')
    } catch (error) {
      message.error('退出登录失败')
    } finally {
      setLoading(false)
    }
  }

  // 发送验证码
  const handleSendCode = async () => {
    try {
      const email = form.getFieldValue('email')
      if (!email) {
        message.error('请输入邮箱')
        return
      }

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        message.error('请输入有效的邮箱地址')
        return
      }

      setLoading(true)
      await authService.sendVerificationCode(email)
      message.success('验证码已发送')
      setCodeSent(true)

      // 开始倒计时
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setCodeSent(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      message.error(error.message || '发送验证码失败')
    } finally {
      setLoading(false)
    }
  }

  // 登录
  const handleLogin = async (values) => {
    try {
      setLoading(true)
      const response = await authService.verifyAndLogin(values.email, values.code)

      // 保存用户信息
      await configManager.saveUserInfo(response.data)

      message.success('登录成功')

      // 登录成功后跳转
      // const urlParams = new URLSearchParams(window.location.search)
      // const redirect = urlParams.get('redirect') || '/'
      // window.location.href = redirect
    } catch (error) {
      message.error(error.message || '登录失败')
    } finally {
      setLoading(false)
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
            <div className="user-avatar">
              {userInfo.name?.[0]?.toUpperCase() || userInfo.email[0].toUpperCase()}
            </div>
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
            <span className="info-value">{userInfo.email}</span>
          </div>
          <div className="info-item">
            <span className="info-label">手机号码</span>
            <span className="info-value">
              {userInfo.phone || <span className="not-set">未设置</span>}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">用户 ID</span>
            <span className="info-value mono">{userInfo.user_id}</span>
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
        <Card className="login-card" title="登录/注册">
          <Form form={form} layout="vertical" onFinish={handleLogin} autoComplete="off">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input
                autoComplete="on"
                prefix={<MailOutlined />}
                placeholder="请输入邮箱"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <div className="verification-code">
                <Form.Item
                  name="code"
                  noStyle
                  rules={[
                    { required: true, message: '请输入验证码' },
                    { pattern: /^\d{4,6}$/, message: '验证码格式错误' },
                  ]}
                >
                  <Input placeholder="请输入验证码" size="large" maxLength={6} />
                </Form.Item>
                <Button
                  type="primary"
                  onClick={handleSendCode}
                  disabled={codeSent}
                  loading={loading}
                  size="large"
                >
                  {codeSent ? `${countdown}秒后重试` : '获取验证码'}
                </Button>
              </div>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                登录/注册
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  )
}

export default LoginPage
