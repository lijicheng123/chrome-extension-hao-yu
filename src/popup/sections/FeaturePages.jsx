import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { isEdge, isFirefox, isMobile, isSafari, openUrl } from '../../utils/index.mjs'
import Browser from 'webextension-polyfill'
import PropTypes from 'prop-types'
import { UiContentAPI } from '../../services/messaging/ui'
import { Button, Checkbox, Form } from 'antd'

FeaturePages.propTypes = {
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
}

export function FeaturePages({ config, updateConfig }) {
  const { t } = useTranslation()
  const [backgroundPermission, setBackgroundPermission] = useState(false)

  if (!isMobile() && !isFirefox() && !isSafari())
    Browser.permissions.contains({ permissions: ['background'] }).then((result) => {
      setBackgroundPermission(result)
    })

  return (
    <Form layout="vertical">
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
      <Form.Item>
        <Button
          type="primary"
          onClick={() => {
            UiContentAPI.openUrl(Browser.runtime.getURL('IndependentPanel.html'))
          }}
        >
          {t('Open Conversation Page')}
        </Button>
      </Form.Item>
      {!isMobile() && (
        <Form.Item>
          <Button
            type="primary"
            onClick={() => {
              UiContentAPI.openChatWindow()
            }}
          >
            {t('Open Conversation Window')}
          </Button>
        </Form.Item>
      )}
      {!isMobile() && !isFirefox() && !isSafari() && (
        <Form.Item>
          <Checkbox
            checked={backgroundPermission}
            onChange={(e) => {
              const checked = e.target.checked
              if (checked)
                Browser.permissions.request({ permissions: ['background'] }).then((result) => {
                  setBackgroundPermission(result)
                })
              else
                Browser.permissions.remove({ permissions: ['background'] }).then((result) => {
                  setBackgroundPermission(result)
                })
            }}
          >
            {t('Keep Conversation Window in Background')}
          </Checkbox>
        </Form.Item>
      )}
      {!isMobile() && (
        <Form.Item>
          <Checkbox
            checked={config.alwaysCreateNewConversationWindow}
            onChange={(e) => {
              updateConfig({ alwaysCreateNewConversationWindow: e.target.checked })
            }}
          >
            {t('Always Create New Conversation Window')}
          </Checkbox>
        </Form.Item>
      )}
    </Form>
  )
}
