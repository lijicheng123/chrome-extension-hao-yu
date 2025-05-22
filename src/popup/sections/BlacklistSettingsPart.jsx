import React from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button, Divider, Typography } from 'antd'
import PropTypes from 'prop-types'

const { TextArea } = Input
const { Paragraph } = Typography

BlacklistSettingsPart.propTypes = {
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
}

export function BlacklistSettingsPart({ config, updateConfig }) {
  const { t } = useTranslation()

  const handleSidebarBlacklistChange = (e) => {
    const value = e.target.value
    try {
      // 将文本转换为数组
      const blacklist = value.split('\n').filter((item) => item.trim() !== '')
      updateConfig({ sidebarBlacklist: blacklist })
    } catch (error) {
      console.error(t('更新侧边栏黑名单失败:'), error)
    }
  }

  const handleMiningBlacklistChange = (e) => {
    const value = e.target.value
    try {
      // 将文本转换为数组
      const blacklist = value.split('\n').filter((item) => item.trim() !== '')
      updateConfig({ miningBlacklist: blacklist })
    } catch (error) {
      console.error(t('更新挖掘面板黑名单失败:'), error)
    }
  }

  // 将数组转换为每行一个域名的文本
  const formatBlacklist = (blacklist) => {
    if (!blacklist || !Array.isArray(blacklist)) return ''
    return blacklist.join('\n')
  }

  // 重置为默认黑名单
  const resetToDefault = (listType) => {
    const defaultDomains = ['hoayuai.cn', 'haoyu.ai', 'localhost']
    if (listType === 'sidebar') {
      updateConfig({ sidebarBlacklist: [...defaultDomains] })
    } else {
      updateConfig({ miningBlacklist: [...defaultDomains] })
    }
  }

  return (
    <div>
      <Form layout="vertical" style={{ maxWidth: '600px' }} autoComplete="off">
        <Divider orientation="left">{t('侧边栏黑名单')}</Divider>
        <Paragraph>{t('在以下域名中不显示侧边栏，每行一个域名或URL片段')}</Paragraph>
        <Form.Item>
          <TextArea
            rows={6}
            value={formatBlacklist(config.sidebarBlacklist)}
            onChange={handleSidebarBlacklistChange}
            placeholder={t('例如: hoayuai.cn\nhaoyu.ai\nlocalhost')}
          />
        </Form.Item>
        <Form.Item>
          <Button type="default" onClick={() => resetToDefault('sidebar')}>
            {t('恢复默认')}
          </Button>
        </Form.Item>

        <Divider orientation="left">{t('挖掘面板黑名单')}</Divider>
        <Paragraph>{t('在以下域名中不显示挖掘面板，每行一个域名或URL片段')}</Paragraph>
        <Form.Item>
          <TextArea
            rows={6}
            value={formatBlacklist(config.miningBlacklist)}
            onChange={handleMiningBlacklistChange}
            placeholder={t('例如: hoayuai.cn\nhaoyu.ai\nlocalhost')}
          />
        </Form.Item>
        <Form.Item>
          <Button type="default" onClick={() => resetToDefault('mining')}>
            {t('恢复默认')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
