import { createRoot } from 'react-dom/client'
import BatchImageDownloader from '../../components/BatchImageDownloader'

/**
 * 渲染批量下载图片组件
 */
export function renderBatchImageDownloader() {
  // 创建容器
  const container = document.createElement('div')
  container.id = 'batch-image-downloader-container'
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.width = '100%'
  container.style.height = '100%'
  container.style.zIndex = '999999'
  container.style.pointerEvents = 'none'

  // 关闭函数
  const handleClose = () => {
    if (container.parentNode) {
      const root = container._reactRoot
      if (root) {
        root.unmount()
      }
      container.remove()
    }
  }

  // 添加到页面
  document.body.appendChild(container)

  // 创建React根并渲染
  const root = createRoot(container)
  container._reactRoot = root

  root.render(
    <div style={{ pointerEvents: 'auto' }}>
      <BatchImageDownloader visible={true} onClose={handleClose} />
    </div>,
  )
} 