import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Tabs } from 'antd'
import { ApiModes } from './ApiModes'
import { SelectionTools } from './SelectionTools'
import { SiteAdapters } from './SiteAdapters'

ModulesPart.propTypes = {
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
}

export function ModulesPart({ config, updateConfig }) {
  const { t } = useTranslation()

  const items = [
    {
      key: '1',
      label: t('API Modes'),
      children: <ApiModes config={config} updateConfig={updateConfig} />,
    },
    {
      key: '2',
      label: t('Selection Tools'),
      children: <SelectionTools config={config} updateConfig={updateConfig} />,
    },
    {
      key: '3',
      label: t('Sites'),
      children: <SiteAdapters config={config} updateConfig={updateConfig} />,
    },
  ]

  return (
    <>
      <Tabs className="popup-tabs" items={items} />
    </>
  )
}
