import React, { useState, useEffect } from 'react'
import { Modal, Checkbox, Button, List, Image, message, Progress, Space } from 'antd'
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
import JSZip from 'jszip'
import { getCurrentDate } from '../../utils/date-formatter.mjs'
import './styles.scss'

function BatchImageDownloader({ visible, onClose }) {
  const [images, setImages] = useState([])
  const [selectedImages, setSelectedImages] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // 获取页面所有图片
  const getAllImages = () => {
    const imageElements = document.querySelectorAll('img')
    const imageList = []
    const seenUrls = new Set()

    imageElements.forEach((img, index) => {
      let imageUrl = img.src || img.dataset.src || img.dataset.original

      // 过滤掉无效的图片和重复的图片
      if (
        imageUrl &&
        !imageUrl.startsWith('data:') &&
        !seenUrls.has(imageUrl) &&
        imageUrl.startsWith('http')
      ) {
        seenUrls.add(imageUrl)

        // 生成文件名
        const url = new URL(imageUrl)
        const pathParts = url.pathname.split('/')
        const originalName = pathParts[pathParts.length - 1] || `image_${index}`
        const fileName = originalName.includes('.') ? originalName : `${originalName}.jpg`

        imageList.push({
          id: index,
          url: imageUrl,
          fileName: fileName,
          alt: img.alt || '',
          width: img.naturalWidth || img.width || 'unknown',
          height: img.naturalHeight || img.height || 'unknown',
        })
      }
    })

    return imageList
  }

  // 初始化图片列表
  useEffect(() => {
    if (visible) {
      const imageList = getAllImages()
      setImages(imageList)
      // 默认全选
      setSelectedImages(new Set(imageList.map((img) => img.id)))
      setDownloadProgress(0)
    }
  }, [visible])

  // 全选/取消全选
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedImages(new Set(images.map((img) => img.id)))
    } else {
      setSelectedImages(new Set())
    }
  }

  // 单个选择
  const handleSelectImage = (imageId, checked) => {
    const newSelected = new Set(selectedImages)
    if (checked) {
      newSelected.add(imageId)
    } else {
      newSelected.delete(imageId)
    }
    setSelectedImages(newSelected)
  }

  // 下载图片并打包
  const handleDownload = async () => {
    if (selectedImages.size === 0) {
      message.warning('请至少选择一张图片')
      return
    }

    setLoading(true)
    setDownloadProgress(0)

    try {
      const zip = new JSZip()
      const selectedImageList = images.filter((img) => selectedImages.has(img.id))

      // 生成文件夹名称：域名+路径+截图
      const currentUrl = new URL(window.location.href)
      const domain = currentUrl.hostname
      const path = currentUrl.pathname.replace(/\//g, '_').replace(/^_|_$/g, '') || 'root'
      const timestamp = getCurrentDate()
      const folderName = `${domain}_${path}_截图_${timestamp}`

      let completedCount = 0

      // 下载每张图片
      for (const image of selectedImageList) {
        try {
          const response = await fetch(image.url)
          if (response.ok) {
            const blob = await response.blob()
            zip.file(`${folderName}/${image.fileName}`, blob)
          }
        } catch (error) {
          console.warn(`下载图片失败: ${image.url}`, error)
        }

        completedCount++
        setDownloadProgress(Math.round((completedCount / selectedImageList.length) * 100))
      }

      // 生成zip文件并下载
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const downloadUrl = URL.createObjectURL(zipBlob)

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${folderName}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)

      message.success(`成功下载 ${selectedImages.size} 张图片`)
      onClose()
    } catch (error) {
      console.error('下载失败:', error)
      message.error('下载失败，请重试')
    } finally {
      setLoading(false)
      setDownloadProgress(0)
    }
  }

  const allSelected = images.length > 0 && selectedImages.size === images.length
  const indeterminate = selectedImages.size > 0 && selectedImages.size < images.length

  return (
    <Modal
      title="批量下载图片"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      className="batch-image-downloader"
    >
      <div className="batch-image-downloader-content">
        <div className="batch-image-downloader-header">
          <Space>
            <Checkbox
              indeterminate={indeterminate}
              checked={allSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
            >
              全选 ({selectedImages.size}/{images.length})
            </Checkbox>
            <span className="image-count">共找到 {images.length} 张图片</span>
          </Space>

          <Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              loading={loading}
              disabled={selectedImages.size === 0}
            >
              下载选中图片 ({selectedImages.size})
            </Button>
            <Button icon={<CloseOutlined />} onClick={onClose}>
              取消
            </Button>
          </Space>
        </div>

        {loading && (
          <div className="download-progress">
            <Progress percent={downloadProgress} status="active" />
            <div>正在下载图片... {downloadProgress}%</div>
          </div>
        )}

        <div className="batch-image-downloader-list">
          <List
            grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 5, xl: 6 }}
            dataSource={images}
            renderItem={(image) => (
              <List.Item>
                <div className="image-item">
                  <Checkbox
                    checked={selectedImages.has(image.id)}
                    onChange={(e) => handleSelectImage(image.id, e.target.checked)}
                    className="image-checkbox"
                  />
                  <div className="image-preview">
                    <Image
                      src={image.url}
                      alt={image.alt}
                      width="100%"
                      height={120}
                      style={{ objectFit: 'cover' }}
                      fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RUG8O+L0p8BQoA="
                    />
                  </div>
                  <div className="image-info">
                    <div className="image-filename" title={image.fileName}>
                      {image.fileName}
                    </div>
                    <div className="image-dimensions">
                      {image.width} × {image.height}
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      </div>
    </Modal>
  )
}

BatchImageDownloader.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default BatchImageDownloader
