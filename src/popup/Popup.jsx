import '@picocss/pico'
import { useEffect, useState } from 'react'
import {
  defaultConfig,
  getPreferredLanguageKey,
  getUserConfig,
  setUserConfig,
} from '../config/index.mjs'
import { Tabs } from 'antd'
import './styles.scss'
import { FormOutlined, SettingOutlined } from '@ant-design/icons'
import Browser from 'webextension-polyfill'
import { useWindowTheme } from '../hooks/use-window-theme.mjs'
import { isMobile } from '../utils/index.mjs'
import { useTranslation } from 'react-i18next'
import { GeneralPart } from './sections/GeneralPart'
import { FeaturePages } from './sections/FeaturePages'
import { AdvancedPart } from './sections/AdvancedPart'
import { ModulesPart } from './sections/ModulesPart'

// eslint-disable-next-line react/prop-types
function Footer({ currentVersion, latestVersion }) {
  const { t } = useTranslation()

  return (
    <div className="footer">
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
      <div>
        <a
          href={`chrome-extension://${Browser.runtime.id}/options.html#feedback`}
          target="_blank"
          rel="noreferrer"
        >
          <FormOutlined />
          <span style={{ marginLeft: '4px' }}>联系我们</span>
        </a>
        <a
          href={`chrome-extension://${Browser.runtime.id}/options.html#setting`}
          target="_blank"
          rel="noreferrer"
          style={{ marginLeft: '8px' }}
        >
          <SettingOutlined />
          <span style={{ marginLeft: '4px' }}>更多设置</span>
        </a>
      </div>
    </div>
  )
}

function Popup() {
  const { t, i18n } = useTranslation()
  const [config, setConfig] = useState(defaultConfig)
  const [currentVersion, setCurrentVersion] = useState('')
  const [latestVersion, setLatestVersion] = useState('')
  const [tabIndex, setTabIndex] = useState(0)
  const theme = useWindowTheme()

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

  useEffect(() => {
    document.documentElement.dataset.theme = config.themeMode === 'auto' ? theme : config.themeMode
  }, [config.themeMode, theme])

  const search = new URLSearchParams(window.location.search)
  const popup = !isMobile() && search.get('popup') // manifest v2

  const tabItems = [
    {
      key: '0',
      label: t('General'),
      children: (
        <GeneralPart config={config} updateConfig={updateConfig} setTabIndex={setTabIndex} />
      ),
    },
    {
      key: '1',
      label: t('Feature Pages'),
      children: <FeaturePages config={config} updateConfig={updateConfig} />,
    },
    {
      key: '2',
      label: t('Modules'),
      children: <ModulesPart config={config} updateConfig={updateConfig} />,
    },
    {
      key: '3',
      label: t('Advanced'),
      children: <AdvancedPart config={config} updateConfig={updateConfig} />,
    },
  ]

  return (
    <div className={popup === 'true' ? 'container-popup-mode' : 'container-page-mode'}>
      <form style={{ width: '100%' }}>
        <Tabs
          activeKey={tabIndex.toString()}
          onChange={(key) => setTabIndex(parseInt(key))}
          className="popup-tabs"
          items={tabItems}
        />
      </form>
      <br />
      <Footer currentVersion={currentVersion} latestVersion={latestVersion} />
    </div>
  )
}

export default Popup
