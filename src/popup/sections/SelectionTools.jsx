import { useTranslation } from 'react-i18next'
import {
  config as toolsConfig,
  defaultPromptTemplates,
} from '../../content-script/selection-tools/index.mjs'
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
  const [expandedPrompts, setExpandedPrompts] = useState({})

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
      {config.selectionTools.map((key) => {
        const isExpanded = expandedPrompts[key]
        const customPrompt = config.selectionToolsPrompts?.[key] || ''
        const defaultPrompt = defaultPromptTemplates[key] || ''
        const currentPrompt = customPrompt || defaultPrompt

        return (
          <div
            key={key}
            style={{
              marginBottom: '16px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <button
                type="button"
                onClick={() => setExpandedPrompts((prev) => ({ ...prev, [key]: !prev[key] }))}
                style={{
                  background: 'none',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {isExpanded ? '收起' : '编辑Prompt'}
              </button>
            </div>

            {isExpanded && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  Prompt模板 (使用{`{{selection}}`}表示选中的文本):
                </div>
                <textarea
                  value={currentPrompt}
                  onChange={(e) => {
                    const newPrompts = { ...config.selectionToolsPrompts }
                    newPrompts[key] = e.target.value
                    updateConfig({ selectionToolsPrompts: newPrompts })
                  }}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '12px',
                    resize: 'vertical',
                  }}
                  placeholder={`默认: ${defaultPrompt}`}
                />
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const newPrompts = { ...config.selectionToolsPrompts }
                      newPrompts[key] = defaultPrompt
                      updateConfig({ selectionToolsPrompts: newPrompts })
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    恢复默认
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
      {config.customSelectionTools.map(
        (tool, index) =>
          tool.name &&
          (editing && editingIndex === index ? (
            editingComponent
          ) : (
            <label key={index} style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={tool.active}
                onChange={(e) => {
                  const customSelectionTools = [...config.customSelectionTools]
                  customSelectionTools[index] = { ...tool, active: e.target.checked }
                  updateConfig({ customSelectionTools })
                }}
              />
              {tool.name}
              <div style={{ flexGrow: 1 }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.preventDefault()
                    setEditing(true)
                    setEditingTool(tool)
                    setEditingIndex(index)
                    setErrorMessage('')
                  }}
                >
                  <PencilIcon />
                </div>
                <div
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.preventDefault()
                    const customSelectionTools = [...config.customSelectionTools]
                    customSelectionTools.splice(index, 1)
                    updateConfig({ customSelectionTools })
                  }}
                >
                  <TrashIcon />
                </div>
              </div>
            </label>
          )),
      )}
      <div style={{ height: '30px' }} />
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
        >
          {t('New')}
        </button>
      )}
    </>
  )
}
