import React, { useState, useEffect } from 'react'
import { Button, Input, Space, Card, Typography, message, Tabs, Collapse, Badge } from 'antd'
import { SaveOutlined, UndoOutlined } from '@ant-design/icons'
import Browser from 'webextension-polyfill'
import {
  getModulePromptsFromConfig,
  getModulePromptTypes,
  getAllModules,
  MODULES,
} from '../../../config/promptConfig.js'

const { TextArea } = Input
const { Title, Text } = Typography
const { Panel } = Collapse

/**
 * AI Prompt 配置管理组件
 * 支持多个模块的 Prompt 配置管理，提供精确到单个 Prompt 的重置和保存功能
 */
const PromptsConfig = () => {
  const [modulePrompts, setModulePrompts] = useState({})
  const [originalPrompts, setOriginalPrompts] = useState({}) // 用于跟踪原始数据
  const [activeTab, setActiveTab] = useState(MODULES.LEADS_MINING)
  const [resetLoading, setResetLoading] = useState({}) // 用于跟踪单个 prompt 的重置状态
  const [saveLoading, setSaveLoading] = useState({}) // 用于跟踪单个 prompt 的保存状态

  // 获取所有模块的 Prompt 配置
  const loadAllPrompts = async () => {
    try {
      const modules = getAllModules()
      const promptsData = {}

      for (const { module } of modules) {
        promptsData[module] = await getModulePromptsFromConfig(module)
      }

      setModulePrompts(promptsData)
      setOriginalPrompts(JSON.parse(JSON.stringify(promptsData))) // 深拷贝作为原始数据
    } catch (error) {
      console.error('加载 Prompt 配置失败:', error)
      message.error('加载配置失败')
    }
  }

  useEffect(() => {
    loadAllPrompts()
  }, [])

  // 保存单个 Prompt 配置
  const handleSavePrompt = async (module, promptType, promptTitle) => {
    const saveKey = `${module}-${promptType}`
    setSaveLoading((prev) => ({ ...prev, [saveKey]: true }))

    try {
      const moduleConfig = getAllModules().find((m) => m.module === module)
      if (!moduleConfig) {
        throw new Error('模块配置未找到')
      }

      // 获取当前配置
      const currentConfig = await Browser.storage.local.get(moduleConfig.configKey)

      // 更新单个 Prompt 配置
      const updatedPrompts = {
        ...currentConfig[moduleConfig.configKey],
        [promptType]: modulePrompts[module][promptType],
      }

      // 保存到扩展配置
      await Browser.storage.local.set({ [moduleConfig.configKey]: updatedPrompts })

      // 更新原始数据，表示这个 Prompt 已保存
      setOriginalPrompts((prev) => ({
        ...prev,
        [module]: {
          ...prev[module],
          [promptType]: modulePrompts[module][promptType],
        },
      }))

      message.success(`${promptTitle} 保存成功`)
    } catch (error) {
      console.error('保存 Prompt 配置失败:', error)
      message.error('保存失败')
    } finally {
      setSaveLoading((prev) => ({ ...prev, [saveKey]: false }))
    }
  }

  // 重置单个 Prompt
  const handleResetPrompt = async (module, promptType, promptTitle) => {
    const resetKey = `${module}-${promptType}`
    setResetLoading((prev) => ({ ...prev, [resetKey]: true }))

    try {
      const moduleConfig = getAllModules().find((m) => m.module === module)
      if (moduleConfig && moduleConfig.defaultPrompts[promptType]) {
        setModulePrompts((prev) => ({
          ...prev,
          [module]: {
            ...prev[module],
            [promptType]: moduleConfig.defaultPrompts[promptType],
          },
        }))
        message.success(`${promptTitle} 已重置为默认值`)
      }
    } catch (error) {
      console.error('重置 Prompt 失败:', error)
      message.error('重置失败')
    } finally {
      setResetLoading((prev) => ({ ...prev, [resetKey]: false }))
    }
  }

  // 更新 Prompt
  const handlePromptChange = (module, promptType, value) => {
    setModulePrompts((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [promptType]: value,
      },
    }))
  }

  // 检查 Prompt 是否已修改但未保存
  const isPromptModified = (module, promptType) => {
    const current = modulePrompts[module]?.[promptType] || ''
    const original = originalPrompts[module]?.[promptType] || ''
    return current !== original
  }

  // 获取模块名称
  const getModuleName = (module) => {
    switch (module) {
      case MODULES.LEADS_MINING:
        return '线索挖掘'
      case MODULES.SELECTION_TOOLS:
        return '划词工具'
      default:
        return module
    }
  }

  // 渲染单个模块的 Prompt 配置
  const renderModulePrompts = (module) => {
    const prompts = modulePrompts[module] || {}
    const promptTypes = getModulePromptTypes(module)

    if (promptTypes.length === 0) {
      return <Text type="secondary">该模块暂无可配置的 Prompt</Text>
    }

    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Prompt 配置列表 */}
        <Collapse size="small" ghost>
          {promptTypes.map(({ type, title, description, usage, category }) => {
            const resetKey = `${module}-${type}`
            const saveKey = `${module}-${type}`
            const isResetLoading = resetLoading[resetKey]
            const isSaveLoading = saveLoading[saveKey]
            const isModified = isPromptModified(module, type)

            return (
              <Panel
                header={
                  <Space>
                    {isModified ? (
                      <Badge dot>
                        <Text strong>{title}</Text>
                      </Badge>
                    ) : (
                      <Text strong>{title}</Text>
                    )}
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      [{category}]
                    </Text>
                    {isModified && (
                      <Text type="warning" style={{ fontSize: '11px' }}>
                        未保存
                      </Text>
                    )}
                  </Space>
                }
                key={type}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {description}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    使用场景：{usage}
                  </Text>
                  <TextArea
                    value={prompts[type] || ''}
                    onChange={(e) => handlePromptChange(module, type, e.target.value)}
                    placeholder={`请输入${title}...`}
                    autoSize={{ minRows: 4, maxRows: 15 }}
                    style={{ fontSize: '12px' }}
                  />
                  <Space direction="horizontal" size="small">
                    <Button
                      type="primary"
                      size="small"
                      icon={<SaveOutlined />}
                      loading={isSaveLoading}
                      disabled={!isModified}
                      onClick={() => handleSavePrompt(module, type, title)}
                      title={`保存 ${title}`}
                    >
                      保存
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      icon={<UndoOutlined />}
                      loading={isResetLoading}
                      onClick={(e) => {
                        e.stopPropagation() // 防止触发面板展开/收起
                        handleResetPrompt(module, type, title)
                      }}
                      title={`重置 ${title}`}
                    >
                      重置
                    </Button>
                  </Space>
                </Space>
              </Panel>
            )
          })}
        </Collapse>
      </Space>
    )
  }

  // 创建标签页项
  const createTabItems = () => {
    const modules = getAllModules()
    return modules.map(({ module }) => ({
      key: module,
      label: getModuleName(module),
      children: renderModulePrompts(module),
    }))
  }

  return (
    <div style={{ padding: '16px' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 标题 */}
          <div>
            <Title level={4} style={{ margin: 0 }}>
              AI Prompt 配置管理
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              管理各个模块的AI Prompt，支持单个Prompt的精确重置和保存
            </Text>
          </div>

          {/* 模块标签页 */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={createTabItems()}
            size="small"
          />

          {/* 使用说明 */}
          <Card size="small" style={{ backgroundColor: '#f8f9fa' }}>
            <Title level={5} style={{ margin: '0 0 8px 0' }}>
              使用说明
            </Title>
            <ul style={{ marginBottom: 0, paddingLeft: '20px', fontSize: '12px' }}>
              <li>
                <strong>单个保存</strong>：修改后点击&quot;保存&quot;按钮，只保存当前
                Prompt，避免批量覆盖
              </li>
              <li>
                <strong>变更提示</strong>：已修改但未保存的 Prompt
                会显示红点和&quot;未保存&quot;标识
              </li>
              <li>
                <strong>单个重置</strong>：点击&quot;重置&quot;按钮可以单独重置该 Prompt 为默认值
              </li>
              <li>
                <strong>本地存储</strong>：所有配置仅保存在本地浏览器中，不会上传到云端
              </li>
            </ul>
          </Card>
        </Space>
      </Card>
    </div>
  )
}

export default PromptsConfig
