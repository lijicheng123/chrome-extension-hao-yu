import { useTranslation } from 'react-i18next'
import { useLayoutEffect, useState, useEffect } from 'react'
import Header from '../../components/header'
import {
  openUrl,
  modelNameToDesc,
  isApiModeSelected,
  getApiModesFromConfig,
  apiModeToModelName,
  isMobile,
  isFirefox,
  isSafari,
  isEdge,
} from '../../utils/index.mjs'

import {
  RocketOutlined,
  GlobalOutlined,
  PictureOutlined,
  CheckOutlined,
  EditOutlined,
  TranslationOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'

import {
  isUsingOpenAiApiModel,
  isUsingAzureOpenAiApiModel,
  isUsingChatGLMApiModel,
  isUsingClaudeApiModel,
  isUsingCustomModel,
  isUsingOllamaApiModel,
  isUsingGithubThirdPartyApiModel,
  isUsingMultiModeModel,
  ModelMode,
  ThemeMode,
  TriggerMode,
  isUsingMoonshotApiModel,
  Models,
  getUserConfig,
  setUserConfig,
} from '../../config/index.mjs'
import Browser from 'webextension-polyfill'
import { languageList } from '../../config/language.mjs'
import PropTypes from 'prop-types'
import { config as menuConfig } from '../../content-script/menu-tools'
import { Select, Input, Button, Form, Checkbox, Badge, message } from 'antd'

SimpleSettings.propTypes = {
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
  from: PropTypes.string,
  moreSettingsHref: PropTypes.string,
}
function formatDate(date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  return `${year}-${month}-${day}`
}

async function checkBilling(apiKey, apiUrl) {
  const now = new Date()
  let startDate = new Date(now - 90 * 24 * 60 * 60 * 1000)
  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const subDate = new Date(now)
  subDate.setDate(1)

  const urlSubscription = `${apiUrl}/v1/dashboard/billing/subscription`
  let urlUsage = `${apiUrl}/v1/dashboard/billing/usage?start_date=${formatDate(
    startDate,
  )}&end_date=${formatDate(endDate)}`
  const headers = {
    Authorization: 'Bearer ' + apiKey,
    'Content-Type': 'application/json',
  }

  try {
    let response = await fetch(urlSubscription, { headers })
    if (!response.ok) {
      console.log('Your account has been suspended. Please log in to OpenAI to check.')
      return [null, null, null]
    }
    const subscriptionData = await response.json()
    const totalAmount = subscriptionData.hard_limit_usd

    if (totalAmount > 20) {
      startDate = subDate
    }

    urlUsage = `${apiUrl}/v1/dashboard/billing/usage?start_date=${formatDate(
      startDate,
    )}&end_date=${formatDate(endDate)}`

    response = await fetch(urlUsage, { headers })
    const usageData = await response.json()
    const totalUsage = usageData.total_usage / 100
    const remaining = totalAmount - totalUsage

    return [totalAmount, totalUsage, remaining]
  } catch (error) {
    console.error(error)
    return [null, null, null]
  }
}

function isUsingSpecialCustomModel(configOrSession) {
  return isUsingCustomModel(configOrSession) && !configOrSession.apiMode
}

export function SimpleSettings({ config, updateConfig, moreSettingsHref }) {
  const { t, i18n } = useTranslation()
  const [balance, setBalance] = useState(null)
  const [apiModes, setApiModes] = useState([])
  const [casualMiningStatus, setCasualMiningStatus] = useState('cRunning')

  // 初始化
  useEffect(() => {
    initStatus()
  }, [])

  async function initStatus() {
    const config = await getUserConfig()
    setCasualMiningStatus(config.casualMiningStatus)
  }

  // TODO: 添加背景权限?这里有用吗？
  // const [backgroundPermission, setBackgroundPermission] = useState(false)

  // if (!isMobile() && !isFirefox() && !isSafari())
  //   Browser.permissions.contains({ permissions: ['background'] }).then((result) => {
  //     setBackgroundPermission(result)
  //   })

  useLayoutEffect(() => {
    setApiModes(getApiModesFromConfig(config, true))
  }, [
    config.activeApiModes,
    config.customApiModes,
    config.azureDeploymentName,
    config.ollamaModelName,
  ])

  const getBalance = async () => {
    const response = await fetch(`${config.customOpenAiApiUrl}/dashboard/billing/credit_grants`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
    })
    if (response.ok) setBalance((await response.json()).total_available.toFixed(2))
    else {
      const billing = await checkBilling(config.apiKey, config.customOpenAiApiUrl)
      if (billing && billing.length > 2 && billing[2]) setBalance(`${billing[2].toFixed(2)}`)
      else openUrl('https://platform.openai.com/account/usage')
    }
  }

  const toggleLeadsMining = () => {
    const newStatus = casualMiningStatus === 'cRunning' ? 'cStopped' : 'cRunning'
    setUserConfig({ casualMiningStatus: newStatus })
    setCasualMiningStatus(newStatus)
  }

  return (
    <div className="container-popup-mode">
      <Header />
      <div className="popup-page-wrapper">
        <FeatureHeader title="推荐功能" seeMore="更多功能" />
        <div className="feature-grid">
          <FeatureItem
            icon={<RocketOutlined />}
            onClick={toggleLeadsMining}
            color="blue"
            title="客户开发"
            description="实时抓取互联网上公开信息，如邮箱、手机号等"
            badgeContent={
              casualMiningStatus === 'cRunning' ? <CheckOutlined style={{ color: 'red' }} /> : ''
            }
          />

          <FeatureItem
            icon={<GlobalOutlined />}
            color="red"
            title="AI生图"
            description="全球最先进的AI生图模型为您量身定做"
          />

          <FeatureItem
            icon={<PictureOutlined />}
            color="blue"
            title="AI图片处理"
            description="完全免费的AI抠图、扩图、去水印等功能"
          />

          <FeatureItem
            icon={<TranslationOutlined />}
            color="blue-light"
            title="AI翻译"
            description="最懂外贸的AI翻译，精准地道听不出人工痕迹"
          />
        </div>
        <FeatureHeader title="常用设置" seeMore="更多设置" href={moreSettingsHref} />
        <Form layout="vertical" autoComplete="off" style={{ marginTop: '12px', width: '100%' }}>
          <Form.Item
            label={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {t('API Mode')}
                <a
                  style={{ cursor: 'pointer' }}
                  href={moreSettingsHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  <EditOutlined />
                </a>
              </div>
            }
          >
            <div style={{ display: 'flex', gap: '15px' }}>
              <Select
                style={
                  isUsingOpenAiApiModel(config) ||
                  isUsingMultiModeModel(config) ||
                  isUsingSpecialCustomModel(config) ||
                  isUsingAzureOpenAiApiModel(config) ||
                  isUsingClaudeApiModel(config) ||
                  isUsingMoonshotApiModel(config)
                    ? { width: '50%' }
                    : { width: '100%' }
                }
                value={(() => {
                  if (!config.apiMode && config.modelName === 'customModel') return '-1'
                  const index = apiModes.findIndex((apiMode) => isApiModeSelected(apiMode, config))
                  return index !== -1 ? index.toString() : '-1'
                })()}
                onChange={(value) => {
                  if (value === '-1') {
                    updateConfig({ modelName: 'customModel', apiMode: null })
                    return
                  }
                  const apiMode = apiModes[parseInt(value)]
                  updateConfig({ apiMode: apiMode })
                }}
              >
                {apiModes.map((apiMode, index) => {
                  const modelName = apiModeToModelName(apiMode)
                  const desc = modelNameToDesc(modelName, t)
                  if (desc) {
                    return (
                      <Select.Option value={index.toString()} key={index}>
                        {desc}
                      </Select.Option>
                    )
                  }
                  return null
                })}
                <Select.Option value="-1">{t(Models.customModel.desc)}</Select.Option>
              </Select>
              {isUsingMultiModeModel(config) && (
                <Select
                  style={{ width: '50%' }}
                  value={config.modelMode}
                  onChange={(value) => {
                    updateConfig({ modelMode: value })
                  }}
                >
                  {Object.entries(ModelMode).map(([key, desc]) => (
                    <Select.Option value={key} key={key}>
                      {t(desc)}
                    </Select.Option>
                  ))}
                </Select>
              )}
              {isUsingOpenAiApiModel(config) && (
                <div style={{ width: '50%', display: 'flex', gap: '5px' }}>
                  <Input.Password
                    value={config.apiKey}
                    placeholder={t('API Key')}
                    onChange={(e) => {
                      const apiKey = e.target.value
                      updateConfig({ apiKey: apiKey })
                    }}
                  />
                  {config.apiKey.length === 0 ? (
                    <a
                      href="https://platform.openai.com/account/api-keys"
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                    >
                      <Button style={{ whiteSpace: 'nowrap' }} type="primary">
                        {t('Get')}
                      </Button>
                    </a>
                  ) : balance ? (
                    <Button onClick={getBalance}>{balance}</Button>
                  ) : (
                    <Button onClick={getBalance}>{t('Balance')}</Button>
                  )}
                </div>
              )}
              {isUsingSpecialCustomModel(config) && (
                <Input
                  style={{ width: '50%' }}
                  type="text"
                  value={config.customModelName}
                  placeholder={t('Model Name')}
                  onChange={(e) => {
                    const customModelName = e.target.value
                    updateConfig({ customModelName: customModelName })
                  }}
                />
              )}
              {isUsingAzureOpenAiApiModel(config) && (
                <Input
                  type="password"
                  style={{ width: '50%' }}
                  value={config.azureApiKey}
                  placeholder={t('Azure API Key')}
                  onChange={(e) => {
                    const apiKey = e.target.value
                    updateConfig({ azureApiKey: apiKey })
                  }}
                />
              )}
              {isUsingClaudeApiModel(config) && (
                <Input
                  type="password"
                  style={{ width: '50%' }}
                  value={config.claudeApiKey}
                  placeholder={t('Claude API Key')}
                  onChange={(e) => {
                    const apiKey = e.target.value
                    updateConfig({ claudeApiKey: apiKey })
                  }}
                />
              )}
              {isUsingChatGLMApiModel(config) && (
                <Input
                  type="password"
                  style={{ width: '50%' }}
                  value={config.chatglmApiKey}
                  placeholder={t('ChatGLM API Key')}
                  onChange={(e) => {
                    const apiKey = e.target.value
                    updateConfig({ chatglmApiKey: apiKey })
                  }}
                />
              )}
              {isUsingMoonshotApiModel(config) && (
                <div style={{ width: '50%', display: 'flex', gap: '5px' }}>
                  <Input
                    type="password"
                    value={config.moonshotApiKey}
                    placeholder={t('Moonshot API Key')}
                    onChange={(e) => {
                      const apiKey = e.target.value
                      updateConfig({ moonshotApiKey: apiKey })
                    }}
                  />
                  {config.moonshotApiKey.length === 0 && (
                    <a
                      href="https://platform.moonshot.cn/console/api-keys"
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                    >
                      <Button style={{ whiteSpace: 'nowrap' }} type="primary">
                        {t('Get')}
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
            {isUsingSpecialCustomModel(config) && (
              <Input
                type="text"
                value={config.customModelApiUrl}
                placeholder={t('Custom Model API Url')}
                onChange={(e) => {
                  const value = e.target.value
                  updateConfig({ customModelApiUrl: value })
                }}
              />
            )}
            {isUsingSpecialCustomModel(config) && (
              <Input
                type="password"
                value={config.customApiKey}
                placeholder={t('API Key')}
                onChange={(e) => {
                  const apiKey = e.target.value
                  updateConfig({ customApiKey: apiKey })
                }}
              />
            )}
            {isUsingOllamaApiModel(config) && (
              <div style={{ display: 'flex', gap: '10px' }}>
                {t('Keep-Alive Time') + ':'}
                <label>
                  <input
                    type="radio"
                    name="ollamaKeepAliveTime"
                    value="5m"
                    checked={config.ollamaKeepAliveTime === '5m'}
                    onChange={(e) => {
                      updateConfig({ ollamaKeepAliveTime: e.target.value })
                    }}
                  />
                  {t('5m')}
                </label>
                <label>
                  <input
                    type="radio"
                    name="ollamaKeepAliveTime"
                    value="30m"
                    checked={config.ollamaKeepAliveTime === '30m'}
                    onChange={(e) => {
                      updateConfig({ ollamaKeepAliveTime: e.target.value })
                    }}
                  />
                  {t('30m')}
                </label>
                <label>
                  <input
                    type="radio"
                    name="ollamaKeepAliveTime"
                    value="-1"
                    checked={config.ollamaKeepAliveTime === '-1'}
                    onChange={(e) => {
                      updateConfig({ ollamaKeepAliveTime: e.target.value })
                    }}
                  />
                  {t('Forever')}
                </label>
              </div>
            )}
            {isUsingOllamaApiModel(config) && (
              <Input
                type="text"
                value={config.ollamaEndpoint}
                placeholder={t('Ollama Endpoint')}
                onChange={(e) => {
                  const value = e.target.value
                  updateConfig({ ollamaEndpoint: value })
                }}
              />
            )}
            {isUsingOllamaApiModel(config) && (
              <Input
                type="password"
                value={config.ollamaApiKey}
                placeholder={t('API Key')}
                onChange={(e) => {
                  const apiKey = e.target.value
                  updateConfig({ ollamaApiKey: apiKey })
                }}
              />
            )}
            {isUsingAzureOpenAiApiModel(config) && (
              <Input
                type="password"
                value={config.azureEndpoint}
                placeholder={t('Azure Endpoint')}
                onChange={(e) => {
                  const endpoint = e.target.value
                  updateConfig({ azureEndpoint: endpoint })
                }}
              />
            )}
            {isUsingGithubThirdPartyApiModel(config) && (
              <Input
                type="text"
                value={config.githubThirdPartyUrl}
                placeholder={t('API Url')}
                onChange={(e) => {
                  const url = e.target.value
                  updateConfig({ githubThirdPartyUrl: url })
                }}
              />
            )}
          </Form.Item>
          <Form.Item label={t('Preferred Language')}>
            <Select
              style={{ width: '100%' }}
              value={config.preferredLanguage}
              onChange={(value) => {
                const preferredLanguageKey = value
                updateConfig({ preferredLanguage: preferredLanguageKey })

                let lang
                if (preferredLanguageKey === 'auto') lang = config.userLanguage
                else lang = preferredLanguageKey
                i18n.changeLanguage(lang)

                Browser.tabs.query({}).then((tabs) => {
                  tabs.forEach((tab) => {
                    Browser.tabs
                      .sendMessage(tab.id, {
                        type: 'CHANGE_LANG',
                        data: {
                          lang,
                        },
                      })
                      .catch(() => {})
                  })
                })
              }}
            >
              {Object.entries(languageList).map(([k, v]) => {
                return (
                  <Select.Option value={k} key={k}>
                    {v.native}
                  </Select.Option>
                )
              })}
            </Select>
          </Form.Item>
          <Form.Item>
            <Checkbox
              checked={config.alwaysShowToolSidebar}
              onChange={(e) => {
                updateConfig({ alwaysShowToolSidebar: e.target.checked })
              }}
            >
              {t('Always Show Tool Sidebar')}
            </Checkbox>
          </Form.Item>
          <Form.Item>
            <Checkbox
              checked={config.insertAtTop}
              onChange={(e) => {
                updateConfig({ insertAtTop: e.target.checked })
              }}
            >
              {t('Insert ChatGPT at the top of search results')}
            </Checkbox>
          </Form.Item>
          <Form.Item>
            <Checkbox
              checked={config.alwaysShowIcons}
              onChange={(e) => {
                updateConfig({ alwaysShowIcons: e.target.checked })
              }}
            >
              {t('Always display floating window, disable sidebar for all site adapters')}
            </Checkbox>
          </Form.Item>
          {!isMobile() && !isFirefox() && !isSafari() && (
            <Form.Item>
              <Button
                type="primary"
                onClick={() => {
                  if (isEdge()) openUrl('edge://extensions/shortcuts')
                  else openUrl('chrome://extensions/shortcuts')
                }}
              >
                {t('Keyboard Shortcuts')}
              </Button>
            </Form.Item>
          )}
        </Form>
      </div>
    </div>
  )
}

export default SimpleSettings

const FeatureItem = ({ icon, color, title, description, onClick, badgeContent = '' }) => (
  <div className="feature-item" onClick={onClick}>
    <Badge count={badgeContent}>
      <div className="center">
        <div className={`feature-icon ${color}`}>{icon}</div>
        <div className="feature-label">{title}</div>
        <div className="feature-desc">{description}</div>
      </div>
    </Badge>
  </div>
)
const FeatureHeader = ({ title, seeMore, href }) => (
  <div className="section-header">
    <span className="section-title">{title}</span>
    <a className="see-more" href={href} target="_blank" rel="noreferrer">
      {seeMore}
    </a>
  </div>
)
