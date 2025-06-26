import { useTranslation } from 'react-i18next'
import { config as toolsConfig } from '../../content-script/selection-tools/index.mjs'
import PropTypes from 'prop-types'
import { useState } from 'react'
import { defaultConfig } from '../../config/index.mjs'
import { PencilIcon, TrashIcon } from '@primer/octicons-react'

SelectionTools.propTypes = {
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
}

const defaultTool = {
  name: '',
  iconKey: 'explain',
  prompt: 'Explain this: {{selection}}',
  active: true,
}

export function SelectionTools({ config, updateConfig }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [editingTool, setEditingTool] = useState(defaultTool)
  const [editingIndex, setEditingIndex] = useState(-1)

  const editingComponent = (
    <div style={{ display: 'flex', flexDirection: 'column', '--spacing': '4px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={(e) => {
            e.preventDefault()
            setEditing(false)
          }}
        >
          {t('Cancel')}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            if (!editingTool.name) {
              setErrorMessage(t('Name is required'))
              return
            }
            if (!editingTool.prompt.includes('{{selection}}')) {
              setErrorMessage(t('Prompt template should include {{selection}}'))
              return
            }
            if (editingIndex === -1) {
              updateConfig({
                customSelectionTools: [...config.customSelectionTools, editingTool],
              })
            } else {
              const customSelectionTools = [...config.customSelectionTools]
              customSelectionTools[editingIndex] = editingTool
              updateConfig({ customSelectionTools })
            }
            setEditing(false)
          }}
        >
          {t('Save')}
        </button>
      </div>
      {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', whiteSpace: 'noWrap' }}>
        {t('Name')}
        <input
          type="text"
          value={editingTool.name}
          onChange={(e) => setEditingTool({ ...editingTool, name: e.target.value })}
        />
        {t('Icon')}
        <select
          value={editingTool.iconKey}
          onChange={(e) => setEditingTool({ ...editingTool, iconKey: e.target.value })}
        >
          {defaultConfig.selectionTools.map((key) => (
            <option key={key} value={key}>
              {t(toolsConfig[key].label)}
            </option>
          ))}
        </select>
      </div>
      {t('Prompt Template')}
      <textarea
        type="text"
        placeholder={t('Explain this: {{selection}}')}
        style={{
          resize: 'vertical',
          minHeight: '80px',
        }}
        value={editingTool.prompt}
        onChange={(e) => setEditingTool({ ...editingTool, prompt: e.target.value })}
      />
    </div>
  )

  return (
    <>
      {/* 内置工具配置 - 仅控制启用/禁用 */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ marginBottom: '12px', color: '#666' }}>内置划词工具</h4>
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '16px' }}>
          注意：Prompt配置请到&quot;AI Prompt配置&quot;标签页中统一管理
        </div>
        {config.selectionTools.map((key) => (
          <div
            key={key}
            style={{
              marginBottom: '8px',
              padding: '8px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <input
              type="checkbox"
              checked={config.activeSelectionTools.includes(key)}
              onChange={(e) => {
                const checked = e.target.checked
                const activeSelectionTools = config.activeSelectionTools.filter((i) => i !== key)
                if (checked) activeSelectionTools.push(key)
                updateConfig({ activeSelectionTools })
              }}
            />
            <span style={{ flexGrow: 1 }}>{t(toolsConfig[key].label)}</span>
            <span style={{ fontSize: '11px', color: '#999' }}>
              {config.activeSelectionTools.includes(key) ? '已启用' : '已禁用'}
            </span>
          </div>
        ))}
      </div>

      {/* 自定义工具配置 */}
      <div>
        <h4 style={{ marginBottom: '12px', color: '#666' }}>自定义划词工具</h4>
        {config.customSelectionTools.map(
          (tool, index) =>
            tool.name &&
            (editing && editingIndex === index ? (
              editingComponent
            ) : (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px',
                  padding: '8px 12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                }}
              >
                <input
                  type="checkbox"
                  checked={tool.active}
                  onChange={(e) => {
                    const customSelectionTools = [...config.customSelectionTools]
                    customSelectionTools[index] = { ...tool, active: e.target.checked }
                    updateConfig({ customSelectionTools })
                  }}
                />
                <span style={{ marginLeft: '8px', flexGrow: 1 }}>{tool.name}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div
                    style={{ cursor: 'pointer', padding: '4px' }}
                    onClick={(e) => {
                      e.preventDefault()
                      setEditing(true)
                      setEditingTool(tool)
                      setEditingIndex(index)
                      setErrorMessage('')
                    }}
                    title="编辑"
                  >
                    <PencilIcon />
                  </div>
                  <div
                    style={{ cursor: 'pointer', padding: '4px' }}
                    onClick={(e) => {
                      e.preventDefault()
                      const customSelectionTools = [...config.customSelectionTools]
                      customSelectionTools.splice(index, 1)
                      updateConfig({ customSelectionTools })
                    }}
                    title="删除"
                  >
                    <TrashIcon />
                  </div>
                </div>
              </label>
            )),
        )}

        <div style={{ marginTop: '16px' }}>
          {editing ? (
            editingIndex === -1 ? (
              editingComponent
            ) : undefined
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault()
                setEditing(true)
                setEditingTool(defaultTool)
                setEditingIndex(-1)
                setErrorMessage('')
              }}
              style={{
                padding: '8px 16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                background: '#f9f9f9',
                cursor: 'pointer',
              }}
            >
              {t('New')}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
