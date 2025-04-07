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
import { FeaturePages } from '../../../popup/sections/FeaturePages'
import { AdvancedPart } from '../../../popup/sections/AdvancedPart'
import { ModulesPart } from '../../../popup/sections/ModulesPart'
function Setting() {
  const { t, i18n } = useTranslation()
  const [config, setConfig] = useState(defaultConfig)
  const [tabIndex, setTabIndex] = useState(0)

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
    <div className="container-page-mode">
      <form style={{ width: '100%' }}>
        <Tabs
          activeKey={tabIndex.toString()}
          onChange={(key) => setTabIndex(parseInt(key))}
          className="popup-tabs"
          items={tabItems}
        />
      </form>
      <br />
    </div>
  )
}

export default Setting
