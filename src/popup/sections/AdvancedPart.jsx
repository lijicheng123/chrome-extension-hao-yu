import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Tabs, Slider, Input, Checkbox, Form } from 'antd'
import Browser from 'webextension-polyfill'

ApiParams.propTypes = {
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
}

function ApiParams({ config, updateConfig }) {
  const { t } = useTranslation()

  return (
    <Form layout="vertical">
      <Form.Item label={`${t('Max Response Token Length')}: ${config.maxResponseTokenLength}`}>
        <Slider
          min={100}
          max={40000}
          step={100}
          value={config.maxResponseTokenLength}
          onChange={(value) => {
            updateConfig({ maxResponseTokenLength: value })
          }}
        />
      </Form.Item>
      <Form.Item label={`${t('Max Conversation Length')}: ${config.maxConversationContextLength}`}>
        <Slider
          min={0}
          max={100}
          step={1}
          value={config.maxConversationContextLength}
          onChange={(value) => {
            updateConfig({ maxConversationContextLength: value })
          }}
        />
      </Form.Item>
      <Form.Item label={`${t('Temperature')}: ${config.temperature}`}>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={config.temperature}
          onChange={(value) => {
            updateConfig({ temperature: value })
          }}
        />
      </Form.Item>
    </Form>
  )
}

ApiUrl.propTypes = {
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
}

function ApiUrl({ config, updateConfig }) {
  const { t } = useTranslation()

  return (
    <Form layout="vertical">
      <Form.Item label={t('Custom ChatGPT Web API Url')}>
        <Input
          value={config.customChatGptWebApiUrl}
          onChange={(e) => {
            const value = e.target.value
            updateConfig({ customChatGptWebApiUrl: value })
          }}
        />
      </Form.Item>
      <Form.Item label={t('Custom ChatGPT Web API Path')}>
        <Input
          value={config.customChatGptWebApiPath}
          onChange={(e) => {
            const value = e.target.value
            updateConfig({ customChatGptWebApiPath: value })
          }}
        />
      </Form.Item>
      <Form.Item label={t('Custom OpenAI API Url')}>
        <Input
          value={config.customOpenAiApiUrl}
          onChange={(e) => {
            const value = e.target.value
            updateConfig({ customOpenAiApiUrl: value })
          }}
        />
      </Form.Item>
      <Form.Item label={t('Custom Claude API Url')}>
        <Input
          value={config.customClaudeApiUrl}
          onChange={(e) => {
            const value = e.target.value
            updateConfig({ customClaudeApiUrl: value })
          }}
        />
      </Form.Item>
    </Form>
  )
}

Others.propTypes = {
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
}

function Others({ config, updateConfig }) {
  const { t } = useTranslation()

  return (
    <Form layout="vertical">
      <Form.Item>
        <Checkbox
          checked={config.disableWebModeHistory}
          onChange={(e) => {
            updateConfig({ disableWebModeHistory: e.target.checked })
          }}
        >
          {t(
            'Disable web mode history for better privacy protection, but it will result in unavailable conversations after a period of time',
          )}
        </Checkbox>
      </Form.Item>
      <Form.Item>
        <Checkbox
          checked={config.hideContextMenu}
          onChange={async (e) => {
            await updateConfig({ hideContextMenu: e.target.checked })
            Browser.runtime.sendMessage({
              type: 'REFRESH_MENU',
            })
          }}
        >
          {t('Hide context menu of this extension')}
        </Checkbox>
      </Form.Item>
      <Form.Item label={t('Custom Site Regex')}>
        <Input
          value={config.siteRegex}
          onChange={(e) => {
            const regex = e.target.value
            updateConfig({ siteRegex: regex })
          }}
        />
      </Form.Item>
      <Form.Item>
        <Checkbox
          checked={config.useSiteRegexOnly}
          onChange={(e) => {
            updateConfig({ useSiteRegexOnly: e.target.checked })
          }}
        >
          {t('Exclusively use Custom Site Regex for website matching, ignoring built-in rules')}
        </Checkbox>
      </Form.Item>
      <Form.Item label={t('Input Query')}>
        <Input
          value={config.inputQuery}
          onChange={(e) => {
            const query = e.target.value
            updateConfig({ inputQuery: query })
          }}
        />
      </Form.Item>
      <Form.Item label={t('Append Query')}>
        <Input
          value={config.appendQuery}
          onChange={(e) => {
            const query = e.target.value
            updateConfig({ appendQuery: query })
          }}
        />
      </Form.Item>
    </Form>
  )
}

AdvancedPart.propTypes = {
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
}

export function AdvancedPart({ config, updateConfig }) {
  const { t } = useTranslation()

  const items = [
    {
      key: '1',
      label: t('API Params'),
      children: <ApiParams config={config} updateConfig={updateConfig} />,
    },
    {
      key: '2',
      label: t('API Url'),
      children: <ApiUrl config={config} updateConfig={updateConfig} />,
    },
    {
      key: '3',
      label: t('Others'),
      children: <Others config={config} updateConfig={updateConfig} />,
    },
  ]

  return (
    <>
      <Tabs className="popup-tabs" items={items} />
    </>
  )
}
