import { useEffect, useState } from 'react'
import { Form, Input, Button, Tabs, message, Switch } from 'antd'
import { configManager } from '../../../services/config/config-manager'
import { authService } from '../../../services/auth/auth-service'
import '../config-panel.scss'

function ConfigPanel() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    loadConfig()
    checkLoginStatus()
  }, [])

  const checkLoginStatus = async () => {
    const token = await authService.getToken()
    setIsLoggedIn(!!token)
  }

  const loadConfig = async () => {
    try {
      const config = await configManager.getAllConfig()
      form.setFieldsValue({
        ...config.local,
        ...config.cloud,
      })
    } catch (error) {
      message.error('加载配置失败')
    }
  }

  const handleSaveLocal = async (values) => {
    try {
      setLoading(true)
      await configManager.saveLocalConfig(values)
      message.success('本地配置保存成功')
    } catch (error) {
      message.error('保存失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCloud = async (values) => {
    if (!isLoggedIn) {
      message.error('请先登录')
      return
    }

    try {
      setLoading(true)
      await configManager.updateCloudConfig(values)
      message.success('云端配置保存成功')
    } catch (error) {
      message.error('保存失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncCloud = async () => {
    if (!isLoggedIn) {
      message.error('请先登录')
      return
    }

    try {
      setLoading(true)
      await configManager.getCloudConfig(true)
      await loadConfig()
      message.success('同步成功')
    } catch (error) {
      message.error('同步失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const items = [
    {
      key: 'local',
      label: '本地配置',
      children: (
        <Form form={form} layout="vertical" onFinish={handleSaveLocal}>
          <Form.Item
            label="翻译提示词"
            name={['local', 'translatePrompt']}
            tooltip="自定义翻译提示词以获得更好的翻译效果"
          >
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item label="划词开关" name={['local', 'selectionTools']} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="侧边栏开关" name={['local', 'sidebarEnabled']} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading}>
            保存本地配置
          </Button>
        </Form>
      ),
    },
    {
      key: 'cloud',
      label: '云端配置',
      children: (
        <Form form={form} layout="vertical" onFinish={handleSaveCloud}>
          <Form.Item label="API模式" name={['cloud', 'apiMode']}>
            <Input />
          </Form.Item>

          <Form.Item label="模型名称" name={['cloud', 'modelName']}>
            <Input />
          </Form.Item>

          <Form.Item label="自定义模型" name={['cloud', 'customModelName']}>
            <Input />
          </Form.Item>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存云端配置
            </Button>
            <Button onClick={handleSyncCloud} loading={loading}>
              同步云端配置
            </Button>
          </div>
        </Form>
      ),
    },
  ]

  return (
    <div className="config-panel">
      <Tabs defaultActiveKey="local" items={items} />
    </div>
  )
}

export default ConfigPanel
