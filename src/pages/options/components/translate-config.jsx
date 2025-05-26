import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Select, Alert, Divider, message, Switch } from 'antd'
import { ApiOutlined, TranslationOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { getUserConfig, setUserConfig } from '../../../config/index.mjs'
import { TRANSLATE_SERVICES } from '../../../content-script/immersive-translate/services'

const { Option } = Select

function TranslateConfig() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [selectedService, setSelectedService] = useState(null)

  useEffect(() => {
    getUserConfig().then((userConfig) => {
      form.setFieldsValue({
        immersiveTranslateEnabled: userConfig.immersiveTranslateEnabled || false,
        immersiveTranslateService: userConfig.immersiveTranslateService || 'auto',
        immersiveTranslateTargetLang: userConfig.immersiveTranslateTargetLang || 'zh-CN',
        microsoftTranslateApiKey: userConfig.microsoftTranslateApiKey || '',
        microsoftTranslateRegion: userConfig.microsoftTranslateRegion || 'eastus',
      })
      setSelectedService(userConfig.immersiveTranslateService || 'auto')
    })
  }, [form])

  const handleSave = async (values) => {
    setLoading(true)
    try {
      await setUserConfig(values)
      message.success('翻译配置保存成功')
    } catch (error) {
      message.error('保存失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleServiceChange = (value) => {
    setSelectedService(value)
    form.setFieldValue('immersiveTranslateService', value)
  }

  const getServiceInfo = (serviceId) => {
    return TRANSLATE_SERVICES[serviceId] || null
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TranslationOutlined />
            <span>沉浸式翻译配置</span>
          </div>
        }
        bordered={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            immersiveTranslateEnabled: false,
            immersiveTranslateService: 'auto',
            immersiveTranslateTargetLang: 'zh-CN',
            microsoftTranslateRegion: 'eastus',
          }}
        >
          {/* 基础设置 */}
          <Card size="small" title="基础设置" style={{ marginBottom: '16px' }}>
            <Form.Item
              label="启用沉浸式翻译"
              name="immersiveTranslateEnabled"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item label="默认目标语言" name="immersiveTranslateTargetLang">
              <Select>
                <Option value="zh-CN">简体中文</Option>
                <Option value="en">English</Option>
                <Option value="ja">日本語</Option>
                <Option value="ko">한국어</Option>
                <Option value="es">Español</Option>
                <Option value="fr">Français</Option>
                <Option value="de">Deutsch</Option>
                <Option value="ru">Русский</Option>
              </Select>
            </Form.Item>

            <Form.Item label="默认翻译服务" name="immersiveTranslateService">
              <Select onChange={handleServiceChange}>
                <Option value="auto">自动选择 (推荐)</Option>
                {Object.entries(TRANSLATE_SERVICES).map(([id, service]) => (
                  <Option key={id} value={id}>
                    {service.name}
                    {service.type === 'free' && <span style={{ color: '#52c41a' }}> (免费)</span>}
                    {service.type === 'ai' && <span style={{ color: '#1890ff' }}> (AI模型)</span>}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Card>

          {/* 服务详情 */}
          {selectedService && selectedService !== 'auto' && (
            <Card size="small" title="选中服务详情" style={{ marginBottom: '16px' }}>
              {(() => {
                const service = getServiceInfo(selectedService)
                if (!service) return null

                return (
                  <div>
                    <p>
                      <strong>服务名称:</strong> {service.name}
                    </p>
                    <p>
                      <strong>类型:</strong>{' '}
                      {service.type === 'free'
                        ? '免费'
                        : service.type === 'paid'
                        ? '付费'
                        : 'AI模型'}
                    </p>
                    <p>
                      <strong>字符限制:</strong> {service.maxLength.toLocaleString()} 字符
                    </p>
                    {service.pricing && (
                      <p>
                        <strong>定价:</strong> {service.pricing}
                      </p>
                    )}
                    {service.rateLimit && (
                      <p>
                        <strong>频率限制:</strong> {service.rateLimit}
                      </p>
                    )}
                    <p>
                      <strong>描述:</strong> {service.description}
                    </p>
                  </div>
                )
              })()}
            </Card>
          )}

          {/* API配置 */}
          <Card size="small" title="API密钥配置" style={{ marginBottom: '16px' }}>
            <Alert
              message="API密钥安全提示"
              description="您的API密钥会安全存储在本地浏览器中，不会上传到任何服务器。请妥善保管您的API密钥。"
              type="info"
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: '16px' }}
            />

            {/* Microsoft Translator */}
            {selectedService === 'microsoft_free' && (
              <>
                <Form.Item
                  label="Microsoft Translator API密钥"
                  name="microsoftTranslateApiKey"
                  extra={
                    <div>
                      获取地址:{' '}
                      <a
                        href="https://azure.microsoft.com/en-us/services/cognitive-services/translator/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Azure Translator申请页面
                      </a>
                      <br />
                      免费版每月2M字符
                    </div>
                  }
                  rules={[
                    {
                      required: selectedService === 'microsoft_free',
                      message: '请输入Microsoft Translator API密钥',
                    },
                  ]}
                >
                  <Input.Password
                    placeholder="请输入Microsoft Translator API密钥"
                    autoComplete="off"
                  />
                </Form.Item>

                <Form.Item label="Microsoft Azure区域" name="microsoftTranslateRegion">
                  <Select>
                    <Option value="eastus">East US</Option>
                    <Option value="westus2">West US 2</Option>
                    <Option value="westeurope">West Europe</Option>
                    <Option value="eastasia">East Asia</Option>
                  </Select>
                </Form.Item>
              </>
            )}
          </Card>

          {/* 使用说明 */}
          <Card size="small" title="使用说明">
            <div>
              <h4>可用翻译服务:</h4>
              <ul>
                <li>
                  <strong>Google Translate (免费)</strong>: 无需API密钥，但有使用限制
                </li>
                <li>
                  <strong>Microsoft Translator (免费)</strong>: 需要API密钥，每月2M字符免费
                </li>
                <li>
                  <strong>内置AI模型</strong>: 使用项目配置的AI模型，质量较高
                </li>
              </ul>

              <h4>如何获取Microsoft API密钥:</h4>
              <p>
                1. 访问{' '}
                <a
                  href="https://azure.microsoft.com/en-us/services/cognitive-services/translator/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Azure Translator
                </a>
              </p>
              <p>2. 注册Azure账户并创建Translator资源</p>
              <p>3. 在资源管理页面获取API密钥和区域</p>
              <p>4. 将密钥和区域填入上方配置中</p>
            </div>
          </Card>

          <Divider />

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<ApiOutlined />}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default TranslateConfig
