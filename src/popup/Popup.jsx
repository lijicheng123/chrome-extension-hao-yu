import '@picocss/pico'
import { useEffect, useState } from 'react'
import {
  defaultConfig,
  getPreferredLanguageKey,
  getUserConfig,
  setUserConfig,
} from '../config/index.mjs'
import { Button, Space } from 'antd'
import './styles.scss'
import { FormOutlined, SettingOutlined } from '@ant-design/icons'
import Browser from 'webextension-polyfill'
import { useTranslation } from 'react-i18next'
import { SimpleSettings } from './sections/SimpleSettings'

// eslint-disable-next-line react/prop-types
function Footer({ currentVersion, latestVersion }) {
  const { t } = useTranslation()

  return (
    <Space className="footer" justify="space-between" align="center">
      <div>
        当前是测试版，更多功能正在开发中……
        {/* {`${t('Current Version')}: ${currentVersion} `}
        {currentVersion >= latestVersion ? (
          `(${t('Latest')})`
        ) : (
          <>
            ({`${t('Latest')}: `}
            <a
              href={'https://github.com/josStorer/chatGPTBox/releases/tag/v' + latestVersion}
              target="_blank"
              rel="nofollow noopener noreferrer"
            >
              {latestVersion}
            </a>
            )
          </>
        )} */}
      </div>
      <a
        href={`chrome-extension://${Browser.runtime.id}/options.html#feedback`}
        target="_blank"
        rel="noreferrer"
      >
        <FormOutlined style={{ marginRight: '4px' }} />
        联系我们
      </a>
    </Space>
  )
}

function Popup() {
  const { t, i18n } = useTranslation()
  const [config, setConfig] = useState(defaultConfig)
  const [currentVersion, setCurrentVersion] = useState('')
  const [latestVersion, setLatestVersion] = useState('')

  const updateConfig = async (value) => {
    setConfig({ ...config, ...value })
    await setUserConfig(value)
  }

  useEffect(() => {
    getPreferredLanguageKey().then((lang) => {
      i18n.changeLanguage(lang)
    })
    getUserConfig().then((config) => {
      setConfig(config)
      setCurrentVersion(Browser.runtime.getManifest().version.replace('v', ''))
      fetch('https://api.github.com/repos/josstorer/chatGPTBox/releases/latest').then((response) =>
        response.json().then((data) => {
          setLatestVersion(data.tag_name.replace('v', ''))
        }),
      )
    })
  }, [])

  return (
    <div className="popup-container">
      <SimpleSettings
        config={config}
        updateConfig={updateConfig}
        moreSettingsHref={`chrome-extension://${Browser.runtime.id}/options.html#setting`}
      />
      <Footer currentVersion={currentVersion} latestVersion={latestVersion} />
    </div>
  )
}

export default Popup
