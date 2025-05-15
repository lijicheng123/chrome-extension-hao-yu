import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button, Card, Space, Typography, Avatar, Tooltip, message } from 'antd'
import { UserOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons'
import { isUserLoggedIn, getStoredUserSessionInfo } from '../../background/userSessionInfo.mjs'
import { authClient } from '../../services/messaging/auth'
import styles from './index.module.scss'
import Browser from 'webextension-polyfill'
const { Text, Title } = Typography

/**
 * 登录控制组件
 * 显示用户登录状态和引导登录
 *
 * @param {Object} props - 组件属性
 * @param {boolean} props.showUserInfo - 是否显示用户信息
 * @param {boolean} props.showLoginPrompt - 是否显示登录提示
 * @param {string} props.loginButtonText - 登录按钮文字
 * @param {string} props.loginPromptText - 登录提示文字
 * @param {Function} props.onLoginStatusChange - 登录状态变化回调
 * @param {boolean} props.showLogout - 是否显示退出按钮
 */
function LoginControl({
  showUserInfo = true,
  showLoginPrompt = true,
  loginButtonText = '登录',
  loginPromptText = '请先登录以使用全部功能',
  onLoginStatusChange = () => {},
  showLogout = true,
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userInfo, setUserInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  // 检查登录状态
  useEffect(() => {
    checkLoginStatus()
  }, [])

  // 检查用户登录状态
  const checkLoginStatus = async () => {
    setLoading(true)
    try {
      const loggedIn = await isUserLoggedIn()
      setIsLoggedIn(loggedIn)

      if (loggedIn) {
        const sessionInfo = await getStoredUserSessionInfo()
        setUserInfo(sessionInfo)
      } else {
        setUserInfo(null)
      }

      onLoginStatusChange(loggedIn)
    } catch (error) {
      console.error('检查登录状态出错:', error)
    } finally {
      setLoading(false)
    }
  }

  // 退出登录
  const handleLogout = async () => {
    setLoading(true)
    try {
      // 清除本地存储的会话信息
      await toLogout()
      setIsLoggedIn(false)
      setUserInfo(null)
      onLoginStatusChange(false)
      message.success('已成功退出登录')
    } catch (error) {
      console.error('退出登录错误:', error)
      message.error('退出登录失败')
    } finally {
      setLoading(false)
    }
  }

  // 未登录且需要显示登录提示
  if (!isLoggedIn && showLoginPrompt) {
    return (
      <Card className={styles['login-prompt-card']} loading={loading}>
        <Space direction="vertical" align="center" style={{ width: '100%' }}>
          <Button type="primary" onClick={toLogin}>
            {loginButtonText}
          </Button>
          <Text>{loginPromptText}</Text>
        </Space>
      </Card>
    )
  }

  // 已登录且需要显示用户信息
  if (isLoggedIn && showUserInfo && userInfo) {
    return (
      <Card className={styles['user-info-card']} loading={loading}>
        <div className={styles['user-card-content']}>
          <Space align="center">
            <Avatar icon={<UserOutlined />} />
            <Space direction="vertical" size={0}>
              <Title level={5} style={{ margin: 0 }}>
                {userInfo.name || userInfo.login || '用户'}
              </Title>
              <Text type="secondary">{userInfo.email || userInfo.login}</Text>
            </Space>
          </Space>

          <Tooltip title="退出登录">
            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className={styles['logout-button']}
            />
          </Tooltip>
        </div>
      </Card>
    )
  }

  // 其他情况不显示任何内容
  return null
}

// 定义组件属性类型
LoginControl.propTypes = {
  showUserInfo: PropTypes.bool,
  showLoginPrompt: PropTypes.bool,
  loginButtonText: PropTypes.string,
  loginPromptText: PropTypes.string,
  onLoginStatusChange: PropTypes.func,
  showLogout: PropTypes.bool,
}

export default LoginControl

// export 一个退出登录方法出去，供其他地方使用
export const toLogout = async () => {
  await Browser.runtime.sendMessage({
    type: 'LOGOUT',
  })
}

// 前往登录
export const toLogin = async () => {
  await authClient.needLogin()
}
