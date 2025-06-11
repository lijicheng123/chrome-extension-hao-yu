import React from 'react'
import { Card, Typography, Space, Empty, Divider, Button, Badge, Tooltip, Modal } from 'antd'
import { API_CONFIG } from '../../../constants/api'
const { Paragraph, Text, Link } = Typography
import { ReloadOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
import * as XLSX from 'xlsx'
import {
  getPlatformDisplayName,
  isGoogleMapsPage,
  detectCurrentPlatform,
} from '../../../utils/platformDetector'
import Browser from 'webextension-polyfill'

/**
 * 清除storage中的联系方式
 */
const clearStorageContacts = async () => {
  try {
    const platformId = detectCurrentPlatform() || 'default'

    const storageKey = `${platformId}_contact_list`
    await Browser.storage.local.set({
      [storageKey]: [],
    })

    console.log(`已清除storage中的联系方式`, { platform: platformId })
  } catch (error) {
    console.error('清除storage联系方式失败:', error)
  }
}

/**
 * 邮箱列表组件
 * 显示发现的邮箱列表
 */
const EmailList = ({
  isShowCurrentPageEmails,
  emailList,
  locateEmail,
  style,
  extractCurrentPageEmails,
}) => {
  // 手动删除所有联系方式
  const handleClearContacts = () => {
    Modal.confirm({
      title: '确认删除',
      content: '是否删除本地所有联系方式？删除后只能到好雨AI后台查看',
      okText: '确认删除',
      cancelText: '取消',
      onOk: () => {
        clearStorageContacts()
      },
    })
  }

  // 导出Excel功能
  const exportToExcel = () => {
    if (emailList.length === 0) {
      return
    }

    // 定义表头
    const headers = [
      '平台',
      '邮箱',
      '姓名',
      '职位',
      '电话',
      '手机',
      '公司名称',
      '公司电话',
      '公司邮箱',
      '公司网站',
      '国家',
      '城市',
      '街道地址',
      'LinkedIn',
      '标签',
    ]

    // 如果当前是谷歌地图页面，添加plusCode字段
    if (isGoogleMapsPage()) {
      headers.splice(-2, 0, 'Plus Code') // 在LinkedIn前插入Plus Code
    }

    // 转换数据格式
    const data = emailList.map((emailInfo) => {
      const rowData = [
        getPlatformDisplayName(), // 平台字段：好雨AI-{平台}
        emailInfo.user_email || '',
        emailInfo.user_name || '',
        emailInfo.user_function || '',
        emailInfo.user_phone || '',
        emailInfo.user_mobile || '',
        emailInfo.company_name || '',
        emailInfo.company_phone || '',
        emailInfo.company_email || '',
        emailInfo.company_website || '',
        emailInfo.user_country || emailInfo.country || '', // 国家
        emailInfo.user_city || emailInfo.city || '', // 城市
        emailInfo.user_street || emailInfo.street || '', // 街道地址
        emailInfo.linkin_site || '',
        Array.isArray(emailInfo.tag_names) ? emailInfo.tag_names.join(', ') : '',
      ]

      // 如果当前是谷歌地图页面，添加plusCode数据
      if (isGoogleMapsPage()) {
        rowData.splice(-2, 0, emailInfo.user_zip || emailInfo.plusCode || '') // 在LinkedIn前插入Plus Code数据
      }

      return rowData
    })

    // 创建工作簿
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data])

    // 设置列宽
    const columnWidths = [
      { wch: 20 }, // 平台
      { wch: 30 }, // 邮箱
      { wch: 15 }, // 姓名
      { wch: 20 }, // 职位
      { wch: 15 }, // 电话
      { wch: 15 }, // 手机
      { wch: 25 }, // 公司名称
      { wch: 15 }, // 公司电话
      { wch: 30 }, // 公司邮箱
      { wch: 40 }, // 公司网站
      { wch: 15 }, // 国家
      { wch: 15 }, // 城市
      { wch: 40 }, // 街道地址
      { wch: 40 }, // LinkedIn
      { wch: 80 }, // 标签
    ]

    // 如果当前是谷歌地图页面，为plusCode添加列宽
    if (isGoogleMapsPage()) {
      columnWidths.splice(-2, 0, { wch: 15 }) // 在LinkedIn前插入Plus Code列宽
    }

    worksheet['!cols'] = columnWidths

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '线索联系方式')

    // 生成文件名
    const now = new Date()
    const timeStr =
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0')
    const fileName = `好雨AI-线索挖掘-${timeStr}.xlsx`

    // 导出文件
    XLSX.writeFile(workbook, fileName)

    // 导出完成后，将storage里的联系方式删除
    clearStorageContacts()
  }

  return (
    <>
      <Divider orientation="left">
        <Badge count={emailList.length} offset={[2, -2]} size="small">
          {isShowCurrentPageEmails ? '当前联系方式' : '发现的联系方式'}
        </Badge>
        <Link
          size="small"
          href={`${API_CONFIG.BASE_URL}/web#action=crm.crm_lead_all_leads`}
          target="_blank"
          style={{ marginLeft: 16 }}
        >
          查看全部
        </Link>
        <Button
          title="重新抓取"
          type="link"
          disabled={!isShowCurrentPageEmails}
          icon={<ReloadOutlined />}
          onClick={extractCurrentPageEmails}
        />
        <Button
          title="导出Excel"
          type="link"
          icon={<DownloadOutlined />}
          onClick={exportToExcel}
          disabled={emailList.length === 0}
        />
        <Button
          title="清空联系方式"
          type="link"
          icon={<DeleteOutlined />}
          onClick={handleClearContacts}
          disabled={emailList.length === 0}
          danger
        />
      </Divider>

      {emailList.length > 0 ? (
        emailList.map((emailInfo = {}, index) => {
          const { user_name, user_function, user_phone, company_name, company_website } = emailInfo

          const user_email = emailInfo.user_email || user_name

          return (
            <Card key={`${user_email}-${index}`} style={{ marginBottom: 8 }} hoverable>
              <div className={style['email-list-card']}>
                <Paragraph copyable={{ text: user_email }}>
                  <Tooltip
                    title={
                      <div style={{ maxWidth: '300px' }}>
                        <p>
                          <strong>平台：</strong>
                          {getPlatformDisplayName()}
                        </p>
                        <p>
                          <strong>邮箱：</strong>
                          {user_email}
                        </p>
                        {user_name && (
                          <p>
                            <strong>姓名：</strong>
                            {user_name}
                          </p>
                        )}
                        {user_function && (
                          <p>
                            <strong>职位：</strong>
                            {user_function}
                          </p>
                        )}
                        {user_phone && (
                          <p>
                            <strong>电话：</strong>
                            {user_phone}
                          </p>
                        )}
                        {company_name && (
                          <p>
                            <strong>公司：</strong>
                            {company_name}
                          </p>
                        )}
                        {company_website && (
                          <p>
                            <strong>网站：</strong>
                            {company_website}
                          </p>
                        )}
                        {(emailInfo.user_country || emailInfo.country) && (
                          <p>
                            <strong>国家：</strong>
                            {emailInfo.user_country || emailInfo.country}
                          </p>
                        )}
                        {(emailInfo.user_city || emailInfo.city) && (
                          <p>
                            <strong>城市：</strong>
                            {emailInfo.user_city || emailInfo.city}
                          </p>
                        )}
                        {(emailInfo.user_street || emailInfo.street) && (
                          <p>
                            <strong>地址：</strong>
                            {emailInfo.user_street || emailInfo.street}
                          </p>
                        )}
                        {isGoogleMapsPage() && (emailInfo.user_zip || emailInfo.plusCode) && (
                          <p>
                            <strong>Plus Code：</strong>
                            {emailInfo.user_zip || emailInfo.plusCode}
                          </p>
                        )}
                      </div>
                    }
                  >
                    <Text strong>{user_email}</Text>
                  </Tooltip>
                </Paragraph>
                <Space>
                  <a onClick={() => locateEmail(emailInfo)}>定位</a>
                </Space>
              </div>
            </Card>
          )
        })
      ) : (
        <Empty description="暂无发现的邮箱" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </>
  )
}

EmailList.propTypes = {
  isShowCurrentPageEmails: PropTypes.bool,
  emailList: PropTypes.arrayOf(
    PropTypes.shape({
      user_email: PropTypes.string.isRequired,
      user_name: PropTypes.string,
      user_function: PropTypes.string,
      user_phone: PropTypes.string,
      user_mobile: PropTypes.string,
      company_name: PropTypes.string,
      company_phone: PropTypes.string,
      company_email: PropTypes.string,
      company_website: PropTypes.string,
      linkin_site: PropTypes.string,
      tag_names: PropTypes.arrayOf(PropTypes.string),
    }),
  ),
  locateEmail: PropTypes.func.isRequired,
  style: PropTypes.object.isRequired,
  extractCurrentPageEmails: PropTypes.func.isRequired,
}

export default EmailList
