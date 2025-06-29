import React, { useState, useEffect } from 'react'
import { Tabs } from 'antd'
import '../../../popup/styles.scss'
import {
  defaultConfig,
  getPreferredLanguageKey,
  getUserConfig,
  setUserConfig,
} from '../../../config/index.mjs'
import { useTranslation } from 'react-i18next'
import { GeneralPart } from '../../../popup/sections/GeneralPart'
import { AdvancedPart } from '../../../popup/sections/AdvancedPart'
import { ModulesPart } from '../../../popup/sections/ModulesPart'
import { BlacklistSettingsPart } from '../../../popup/sections/BlacklistSettingsPart'
import PromptsConfig from './prompts-config'

function Setting() {
  const { t, i18n } = useTranslation()
  const [config, setConfig] = useState(defaultConfig)
  const [tabIndex, setTabIndex] = useState(
    () => Number.parseInt(localStorage.getItem('sider-config-tab'), 10) || 0,
  )

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
    })
  }, [])

  const updateTabIndex = (newTabIndex) => {
    setTabIndex(newTabIndex)
    localStorage.setItem('sider-config-tab', newTabIndex)
  }

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
      label: 'AI Prompt',
      children: <PromptsConfig />,
    },
    // {
    //   key: '1',
    //   label: t('Feature Pages'),
    //   children: <FeaturePages config={config} updateConfig={updateConfig} />,
    // },
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
    {
      key: '4',
      label: t('黑名单设置'),
      children: <BlacklistSettingsPart config={config} updateConfig={updateConfig} />,
    },
  ]

  return (
    <div className="container-page-mode">
      <Tabs
        style={{
          width: '100%',
        }}
        activeKey={tabIndex.toString()}
        onChange={(activeKey) => updateTabIndex(Number.parseInt(activeKey, 10))}
        className="popup-tabs"
        items={tabItems}
      />
    </div>
  )
}

export default Setting
