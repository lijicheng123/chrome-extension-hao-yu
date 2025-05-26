import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, Button, Select, Switch, message } from 'antd'
import { TranslationOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
import { getUserConfig, setUserConfig } from '../../config/index.mjs'
import { TranslationManager, TRANSLATE_SERVICES } from './services'
import { immersiveTranslateStyles } from './styles.js'
import { HIGH_Z_INDEX_CONFIG, MAX_Z_INDEX } from '../../config/ui-config.mjs'

// 创建全局翻译管理器实例
const translationManager = new TranslationManager()

// 翻译状态管理
let isTranslating = false
let translatedElements = new Map()
let originalTexts = new Map()
let allTextNodes = []
let currentTranslateConfig = null
let scrollTimer = null
let translationStateCallbacks = new Set()
let domObserver = null
let processedTextNodes = new Set()

// HTML元素常量
const BLOCK_ELEMENTS = [
  'div',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'aside',
  'nav',
  'blockquote',
  'pre',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'table',
  'tr',
  'td',
  'th',
  'thead',
  'tbody',
  'tfoot',
  'form',
  'fieldset',
  'address',
  'hr',
]

const INLINE_ELEMENTS = [
  'a',
  'span',
  'strong',
  'em',
  'b',
  'i',
  'code',
  'kbd',
  'small',
  'sub',
  'sup',
  'mark',
  'label',
]

const INTERACTIVE_ELEMENTS = ['a', 'button', 'input', 'select', 'textarea']

// 翻译相关的CSS类名
const TRANSLATION_CLASS_NAMES = [
  'haoyu-immersive-translate-container',
  'haoyu-immersive-translate-panel-container',
  'haoyu-immersive-translate-result-container',
]

// 文本长度常量
const TEXT_LENGTH_LIMITS = {
  MIN_CONTENT_LENGTH: 200, // 主要内容区域最小长度
  MIN_TRANSLATION_LENGTH: 3, // 最小翻译文本长度
  MAX_INLINE_LENGTH: 30, // 内联显示最大长度
  MAX_INLINE_CHECK_LENGTH: 50, // 内联检查最大长度
  SHORT_TEXT_LIMIT: 5, // 短文本限制
  VERY_SHORT_TEXT_LIMIT: 3, // 极短文本限制
}

// 翻译配置
const TRANSLATE_CONFIG = {
  targetLanguages: {
    'zh-CN': '简体中文',
    en: 'English',
    ja: '日本語',
    ko: '한국어',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    ru: 'Русский',
  },
  excludeSelectors: [
    'script',
    'style',
    'code',
    'pre',
    '[data-translated]',
    '.chatgptbox-container',
    '.chatgptbox-toolbar-container',
    '[contenteditable]',
  ],
  lazyTranslate: {
    viewportBuffer: 300,
    scrollDelay: 800,
    batchSize: 5,
  },
}

/**
 * 智能识别页面主要内容区域
 */
function identifyMainContentArea() {
  const candidates = [
    'main',
    '[role="main"]',
    'article',
    '.content',
    '.main-content',
    '#content',
    '#main',
    '.post-content',
    '.entry-content',
    '.article-content',
  ]

  // 查找主要内容区域
  for (const selector of candidates) {
    const element = document.querySelector(selector)
    if (element && element.textContent.trim().length > TEXT_LENGTH_LIMITS.MIN_CONTENT_LENGTH) {
      return element
    }
  }

  return document.body
}

/**
 * 判断文本是否值得翻译
 */
function isWorthTranslating(text) {
  if (!text || text.length < 2) return false

  const trimmedText = text.trim()

  // 基础过滤：纯数字、单字母、纯符号、纯空格
  if (/^\d+$/.test(trimmedText)) return false
  if (/^[A-Za-z]{1,2}$/.test(trimmedText)) return false
  if (/^[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]+$/.test(trimmedText)) return false
  if (/^\s+$/.test(trimmedText)) return false

  // 货币和数字格式
  if (/^[¥$€£₹₽₩¢₪₨₡₦₴₸₵₫₾₿￥]\s*\d+(\.\d+)?([KMB万千百亿])?$/i.test(trimmedText)) return false
  if (/^\d+(\.\d+)?\s*[¥$€£₹₽₩¢₪₨₡₦₴₸₵₫₾₿￥]([KMB万千百亿])?$/i.test(trimmedText)) return false

  // 日期时间格式
  if (
    /^\d{1,4}[/.:-年月日时分秒]\d{1,4}([/.:-年月日时分秒]\d{1,4})?([/.:-年月日时分秒]\d{1,4})?$/i.test(
      trimmedText,
    )
  )
    return false
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmedText)) return false

  // 技术格式：版本号、CSS单位、HTML实体、颜色代码
  if (/^v?\d+(\.\d+){1,3}$/i.test(trimmedText)) return false
  if (/^\d+(\.\d+)?(px|em|rem|%|pt|vh|vw|cm|mm|in)$/i.test(trimmedText)) return false
  if (/^&[a-z]+;$/i.test(trimmedText)) return false
  if (/^#[a-f0-9]{3,8}$/i.test(trimmedText)) return false

  // 网络格式：邮箱、URL
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedText)) return false
  if (/^(https?:\/\/|www\.)[^\s]+$/i.test(trimmedText)) return false

  // 文件和路径
  if (/^\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)$/i.test(trimmedText))
    return false
  if (/^[/\\]$/.test(trimmedText)) return false

  // 缩写和单位
  if (/^\/?(mo|yr|min|sec|hr|day|week|month|year)\.?$/i.test(trimmedText)) return false
  if (/^(etc|inc|ltd|corp|llc|co|org|com|net|gov|edu)\.?$/i.test(trimmedText)) return false

  // 标点符号
  if (/^[.,;:!?()[\]{}'"<>]+$/.test(trimmedText)) return false

  // 常见UI文字检查
  const commonUITexts = [
    'ok',
    'yes',
    'no',
    'on',
    'off',
    'go',
    'back',
    'next',
    'prev',
    'up',
    'down',
    'new',
    'add',
    'del',
    'edit',
    'save',
    'load',
    'stop',
    'play',
    'pause',
    'menu',
    'home',
    'help',
    'info',
    'more',
    'less',
    'show',
    'hide',
    'view',
  ]
  if (commonUITexts.includes(trimmedText.toLowerCase())) return false

  // 过滤包含大量符号的短文本和很短的纯英文
  if (
    trimmedText.length <= TEXT_LENGTH_LIMITS.SHORT_TEXT_LIMIT &&
    /[^\w\s]/.test(trimmedText) &&
    !/^[a-zA-Z\s]+$/.test(trimmedText)
  )
    return false
  if (
    trimmedText.length <= TEXT_LENGTH_LIMITS.VERY_SHORT_TEXT_LIMIT &&
    /^[a-zA-Z]+$/.test(trimmedText)
  )
    return false

  return true
}

/**
 * 检测元素是否为块级元素
 */
function isBlockElement(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return false
  return BLOCK_ELEMENTS.includes(element.tagName.toLowerCase())
}

/**
 * 检测元素是否包含块级子元素
 */
function hasBlockChildren(element) {
  return Array.from(element.children).some((child) => isBlockElement(child))
}

/**
 * 检测元素是否包含交互式子元素
 */
function hasInteractiveChildren(element) {
  function checkElement(el) {
    if (INTERACTIVE_ELEMENTS.includes(el.tagName.toLowerCase())) return true
    return Array.from(el.children).some((child) => checkElement(child))
  }

  return checkElement(element)
}

/**
 * 提取元素的所有文本内容，忽略内联标签
 */
function extractElementText(element) {
  let text = ''

  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent
    } else if (node.nodeType === Node.ELEMENT_NODE && !isBlockElement(node)) {
      text += extractElementText(node)
    }
  }

  return text.trim()
}

/**
 * 检查元素是否应该被排除
 */
function shouldExcludeElement(element) {
  // 检查可见性
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return true
  }

  // 检查排除选择器
  return TRANSLATE_CONFIG.excludeSelectors.some((selector) => {
    return (
      (element.matches && element.matches(selector)) ||
      (element.closest && element.closest(selector))
    )
  })
}

/**
 * 提取翻译单元
 */
function extractTranslationUnits(container) {
  const translationUnits = []
  const processedElements = new Set()

  const processElement = (element) => {
    if (processedElements.has(element) || shouldExcludeElement(element)) return
    processedElements.add(element)

    if (isBlockElement(element)) {
      // 块级元素：如果没有块级子元素且没有交互式子元素，作为翻译单元
      if (!hasBlockChildren(element) && !hasInteractiveChildren(element)) {
        const text = extractElementText(element)
        if (text.length >= TEXT_LENGTH_LIMITS.MIN_TRANSLATION_LENGTH && isWorthTranslating(text)) {
          translationUnits.push({
            type: 'block',
            element: element,
            text: text,
          })
        }
        return
      } else {
        // 继续处理子元素
        Array.from(element.children).forEach(processElement)
      }
    } else {
      // 非块级元素：处理子元素和文本节点
      Array.from(element.children).forEach(processElement)

      Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .forEach((node) => {
          const text = node.textContent.trim()
          if (
            text.length >= TEXT_LENGTH_LIMITS.MIN_TRANSLATION_LENGTH &&
            isWorthTranslating(text)
          ) {
            translationUnits.push({
              type: 'text',
              node: node,
              text: text,
            })
          }
        })
    }
  }

  processElement(container)

  // 按文档顺序排序
  translationUnits.sort((a, b) => {
    const elementA = a.type === 'block' ? a.element : a.node.parentElement
    const elementB = b.type === 'block' ? b.element : b.node.parentElement

    if (!elementA || !elementB) return 0

    const position = elementA.compareDocumentPosition(elementB)
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
    return 0
  })

  return translationUnits
}

/**
 * 调用翻译API
 */
async function translateText(text, targetLang = 'zh-CN', serviceId = null, customPrompt = '') {
  try {
    const result = await translationManager.translate(
      text,
      targetLang,
      'auto',
      serviceId,
      customPrompt,
    )

    if (result.fallback) {
      message.warning(
        `主要翻译服务失败，已使用备用服务: ${TRANSLATE_SERVICES[result.service]?.name}`,
      )
    }

    return result.text
  } catch (error) {
    console.error('Translation error:', error)
    message.error('翻译失败: ' + error.message)
    return text
  }
}

/**
 * 检测元素是否应该使用内联显示
 */
function shouldUseInlineDisplay(element, textContent) {
  if (!element || !textContent) return false

  const text = textContent.trim()
  if (text.length > TEXT_LENGTH_LIMITS.MAX_INLINE_CHECK_LENGTH) return false

  // 检查元素及其父元素
  let current = element
  while (current) {
    if (BLOCK_ELEMENTS.includes(current.tagName.toLowerCase())) {
      return false
    }
    current = current.parentElement
  }

  // 检查CSS display属性
  const computedStyle = window.getComputedStyle(element)
  const inlineDisplayTypes = ['inline', 'inline-block']
  if (!inlineDisplayTypes.includes(computedStyle.display)) {
    return false
  }

  // 检查元素语义
  return (
    INLINE_ELEMENTS.includes(element.tagName.toLowerCase()) &&
    text.length <= TEXT_LENGTH_LIMITS.MAX_INLINE_LENGTH
  )
}

/**
 * 创建翻译loading元素
 */
function createTranslatingElement(translationUnit) {
  if (translationUnit.type === 'block') {
    const element = translationUnit.element
    const originalText = translationUnit.text

    originalTexts.set(element, {
      html: element.innerHTML,
      text: originalText,
    })

    const loadingContainer = document.createElement('div')
    loadingContainer.className =
      'haoyu-immersive-translate-container haoyu-immersive-translate-loading'
    loadingContainer.setAttribute('data-translating', 'true')

    const originalElement = document.createElement('div')
    originalElement.className = 'haoyu-immersive-translate-original'
    originalElement.textContent = originalText

    const loadingElement = document.createElement('div')
    loadingElement.className = 'haoyu-immersive-translate-loading-text'
    loadingElement.innerHTML =
      '<span class="haoyu-loading-dots">翻译中</span><span class="haoyu-dots">...</span>'

    loadingContainer.appendChild(originalElement)
    loadingContainer.appendChild(loadingElement)

    element.innerHTML = ''
    element.appendChild(loadingContainer)

    return { container: loadingContainer, unit: translationUnit }
  } else {
    const originalNode = translationUnit.node
    const parent = originalNode.parentElement
    if (!parent) return null

    const originalText = translationUnit.text
    originalTexts.set(originalNode, originalText)

    const useInlineDisplay = shouldUseInlineDisplay(parent, originalText)
    const loadingContainer = document.createElement(useInlineDisplay ? 'span' : 'div')
    loadingContainer.className =
      'haoyu-immersive-translate-container haoyu-immersive-translate-loading'
    loadingContainer.setAttribute('data-translating', 'true')

    const originalElement = document.createElement(useInlineDisplay ? 'span' : 'div')
    originalElement.className = `haoyu-immersive-translate-original${
      useInlineDisplay ? ' haoyu-inline' : ''
    }`
    originalElement.textContent = originalText

    const loadingElement = document.createElement(useInlineDisplay ? 'span' : 'div')
    loadingElement.className = `haoyu-immersive-translate-loading-text${
      useInlineDisplay ? ' haoyu-inline' : ''
    }`
    loadingElement.innerHTML =
      '<span class="haoyu-loading-dots">翻译中</span><span class="haoyu-dots">...</span>'

    loadingContainer.appendChild(originalElement)

    if (useInlineDisplay) {
      const separator = document.createElement('span')
      separator.className = 'haoyu-translate-separator'
      separator.textContent = ' → '
      loadingContainer.appendChild(separator)
    }

    loadingContainer.appendChild(loadingElement)

    originalNode.textContent = ''
    parent.insertBefore(loadingContainer, originalNode.nextSibling)

    return { container: loadingContainer, unit: translationUnit }
  }
}

/**
 * 更新loading元素为翻译结果
 */
function updateTranslatingElementWithResult(loadingInfo, translatedText) {
  if (!loadingInfo?.container) return

  const { container: loadingContainer, unit: translationUnit } = loadingInfo

  loadingContainer.classList.remove('haoyu-immersive-translate-loading')
  loadingContainer.removeAttribute('data-translating')
  loadingContainer.setAttribute('data-translated', 'true')

  const loadingElement = loadingContainer.querySelector('.haoyu-immersive-translate-loading-text')
  if (!loadingElement) return

  const isInlineMode = loadingContainer.tagName.toLowerCase() === 'span'
  const translatedElement = document.createElement(isInlineMode ? 'span' : 'div')
  translatedElement.className = `haoyu-immersive-translate-translated${
    isInlineMode ? ' haoyu-inline' : ''
  }`
  translatedElement.textContent = translatedText

  loadingContainer.replaceChild(translatedElement, loadingElement)

  const key = translationUnit.type === 'block' ? translationUnit.element : translationUnit.node
  translatedElements.set(key, loadingContainer)
}

/**
 * 移除翻译
 */
function removeTranslations() {
  stopLazyTranslation()

  translatedElements.forEach((translatedElement, originalKey) => {
    if (originalKey.nodeType === Node.ELEMENT_NODE) {
      const originalData = originalTexts.get(originalKey)
      if (originalData?.html) {
        originalKey.innerHTML = originalData.html
      }
    } else {
      const originalText = originalTexts.get(originalKey)
      if (originalText) {
        originalKey.textContent = originalText
      }
      translatedElement.parentNode?.removeChild(translatedElement)
    }
  })

  // 清理loading状态的元素
  document.querySelectorAll('[data-translating="true"]').forEach((element) => {
    const parentElement = element.parentElement
    if (parentElement) {
      let restored = false

      for (const [key, data] of originalTexts.entries()) {
        if (key === parentElement && data.html) {
          parentElement.innerHTML = data.html
          restored = true
          break
        }
      }

      if (!restored) {
        element.remove()
      }
    }
  })

  translatedElements.clear()
  originalTexts.clear()
  allTextNodes = []
  processedTextNodes.clear()
  isTranslating = false

  // 通知状态变化
  notifyTranslationStateChange(false)

  // 同时通知完整状态变化，确保enabled状态正确更新
  notifyFullTranslationStateChange()
}

/**
 * 执行页面翻译（懒翻译模式）
 */
async function translatePage(targetLang = 'zh-CN', serviceId = null, customPrompt = '') {
  if (isTranslating) {
    message.warning('翻译正在进行中...')
    return
  }

  try {
    const mainContent = identifyMainContentArea()
    allTextNodes = extractTranslationUnits(mainContent)

    if (allTextNodes.length === 0) {
      message.info('没有找到需要翻译的文本')
      return
    }

    startLazyTranslation(targetLang, serviceId, customPrompt)

    message.success(
      `懒翻译模式已启动！共发现 ${allTextNodes.length} 个翻译单元，将按需翻译可见内容`,
    )

    await setUserConfig({
      immersiveTranslateEnabled: true,
      immersiveTranslateTargetLang: targetLang,
      immersiveTranslateService: serviceId,
      immersiveTranslateCustomPrompt: customPrompt,
    })

    // 通知状态变化，确保UI同步
    notifyTranslationStateChange(false) // 先发送false，然后在实际翻译开始时会发送true

    // 同时通知完整状态变化，确保enabled状态正确更新
    notifyFullTranslationStateChange()
  } catch (error) {
    console.error('启动懒翻译出错:', error)
    message.error('启动翻译失败，请重试')
  }
}

/**
 * 翻译控制面板组件
 */
function TranslateControlPanel({ onClose, onCollapse }) {
  const [config, setConfig] = useState({
    enabled: false,
    targetLang: 'zh-CN',
    translateService: 'auto',
  })
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showPromptEditor, setShowPromptEditor] = useState(false)

  const promptTemplates = {
    tech: '请保留专业术语，如cookie、API、URL等技术词汇不要翻译。翻译风格要准确专业。',
    business: '请使用商务正式的翻译风格，专业术语如"stakeholder"翻译为"利益相关者"。',
    academic: '请使用学术风格翻译，保持严谨准确，专业术语要准确翻译。',
    casual: '请使用轻松自然的翻译风格，让译文更口语化易懂。',
    medical: '请保留医学专业术语，如病名、药名、医疗器械名称等，确保翻译准确性。',
    legal: '请保留法律专业术语，如合同条款、法律概念等，确保翻译的法律准确性。',
  }

  useEffect(() => {
    getUserConfig().then((userConfig) => {
      // 获取实际的翻译状态
      const actualStatus = getTranslationStatus()
      setConfig({
        enabled: actualStatus.enabled, // 使用实际的翻译状态而不是配置中的状态
        targetLang: userConfig.immersiveTranslateTargetLang || 'zh-CN',
        translateService: userConfig.immersiveTranslateService || 'auto',
      })
      setCustomPrompt(userConfig.immersiveTranslateCustomPrompt || '')
    })

    const availableServices = Object.keys(TRANSLATE_SERVICES).map((id) => ({
      id,
      ...TRANSLATE_SERVICES[id],
    }))
    setServices(availableServices)

    const unsubscribe = addTranslationStatusListener((isTranslatingState, fullStatus) => {
      setTranslating(isTranslatingState)
      // 如果提供了完整状态信息，使用它来更新enabled状态
      if (fullStatus) {
        setConfig((prev) => ({ ...prev, enabled: fullStatus.enabled }))
      } else {
        // 否则手动获取当前状态
        const currentStatus = getTranslationStatus()
        setConfig((prev) => ({ ...prev, enabled: currentStatus.enabled }))
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleToggleTranslate = async () => {
    if (config.enabled) {
      removeTranslations()
      await setUserConfig({ immersiveTranslateEnabled: false })
      // 状态会通过监听器自动更新，不需要手动设置
    } else {
      const serviceId = config.translateService === 'auto' ? null : config.translateService
      await translatePage(config.targetLang, serviceId, customPrompt)
      await setUserConfig({ immersiveTranslateEnabled: true })
      // 状态会通过监听器自动更新，不需要手动设置
    }
  }

  const handleLanguageChange = async (value) => {
    setConfig((prev) => ({ ...prev, targetLang: value }))
    await setUserConfig({ immersiveTranslateTargetLang: value })

    if (config.enabled) {
      removeTranslations()
      const serviceId = config.translateService === 'auto' ? null : config.translateService
      await translatePage(value, serviceId, customPrompt)
    }
  }

  const handleServiceChange = async (value) => {
    setConfig((prev) => ({ ...prev, translateService: value }))
    await setUserConfig({ immersiveTranslateService: value })

    if (config.enabled) {
      removeTranslations()
      const serviceId = value === 'auto' ? null : value
      await translatePage(config.targetLang, serviceId, customPrompt)
    }
  }

  const handleRetranslate = async () => {
    setLoading(true)
    try {
      removeTranslations()
      const serviceId = config.translateService === 'auto' ? null : config.translateService
      await translatePage(config.targetLang, serviceId, customPrompt)
    } catch (error) {
      console.error('重新翻译失败:', error)
      message.error('重新翻译失败，请重试')
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }

  const handlePromptChange = async (value) => {
    setCustomPrompt(value)
    await setUserConfig({ immersiveTranslateCustomPrompt: value })
  }

  const handleTemplateSelect = (templateKey) => {
    const template = promptTemplates[templateKey]
    setCustomPrompt(template)
    setUserConfig({ immersiveTranslateCustomPrompt: template })
  }

  return (
    <ConfigProvider
      {...HIGH_Z_INDEX_CONFIG}
      getPopupContainer={(triggerNode) => {
        // 确保弹层渲染在面板容器内
        const panelContainer = triggerNode?.closest('.haoyu-immersive-translate-panel-container')
        return panelContainer || document.body
      }}
    >
      <div className="haoyu-immersive-translate-panel">
        <div className="haoyu-panel-header">
          <TranslationOutlined />
          <span>沉浸式翻译</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <Button type="text" size="small" onClick={onCollapse} title="折叠到右侧">
              ⟩
            </Button>
            <Button type="text" size="small" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>

        <div className="haoyu-panel-content">
          <div className="haoyu-control-item">
            <span>启用翻译</span>
            <Switch
              checked={config.enabled}
              onChange={handleToggleTranslate}
              loading={translating}
            />
          </div>

          <div className="haoyu-control-item">
            <span>翻译服务</span>
            <Select
              value={config.translateService}
              onChange={handleServiceChange}
              style={{ width: 150 }}
              size="small"
            >
              <Select.Option key="auto" value="auto">
                自动选择 (推荐)
              </Select.Option>
              {services.map((service) => (
                <Select.Option key={service.id} value={service.id}>
                  {service.name}
                  {service.type === 'free' && <span style={{ color: '#52c41a' }}> (免费)</span>}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div className="haoyu-control-item">
            <span>目标语言</span>
            <Select
              value={config.targetLang}
              onChange={handleLanguageChange}
              style={{ width: 120 }}
              size="small"
            >
              {Object.entries(TRANSLATE_CONFIG.targetLanguages).map(([code, name]) => (
                <Select.Option key={code} value={code}>
                  {name}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div className="haoyu-control-item">
            <span>自定义提示词</span>
            <Button
              size="small"
              onClick={() => setShowPromptEditor(!showPromptEditor)}
              type={customPrompt ? 'primary' : 'default'}
            >
              {customPrompt ? '已配置' : '配置'}
            </Button>
          </div>

          {showPromptEditor && (
            <div className="haoyu-prompt-editor">
              <div className="haoyu-prompt-templates">
                <span style={{ fontSize: '12px', color: '#666' }}>快速模板:</span>
                <div className="haoyu-template-buttons">
                  <Button size="small" onClick={() => handleTemplateSelect('tech')}>
                    技术
                  </Button>
                  <Button size="small" onClick={() => handleTemplateSelect('business')}>
                    商务
                  </Button>
                  <Button size="small" onClick={() => handleTemplateSelect('academic')}>
                    学术
                  </Button>
                  <Button size="small" onClick={() => handleTemplateSelect('casual')}>
                    日常
                  </Button>
                  <Button size="small" onClick={() => handleTemplateSelect('medical')}>
                    医学
                  </Button>
                  <Button size="small" onClick={() => handleTemplateSelect('legal')}>
                    法律
                  </Button>
                </div>
              </div>
              <textarea
                className="haoyu-prompt-textarea"
                value={customPrompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder="输入自定义翻译提示词，例如：请保留专业术语如cookie、API等，使用技术风格翻译..."
                rows={3}
              />
              {customPrompt && (
                <div className="haoyu-prompt-preview">
                  <strong>当前规则:</strong> {customPrompt.slice(0, 100)}
                  {customPrompt.length > 100 ? '...' : ''}
                </div>
              )}
            </div>
          )}

          <div className="haoyu-control-actions">
            <Button
              type="primary"
              size="small"
              onClick={handleRetranslate}
              loading={loading || translating}
            >
              重新翻译
            </Button>
            <Button size="small" onClick={removeTranslations} disabled={!config.enabled}>
              清除翻译
            </Button>
          </div>
        </div>
      </div>
    </ConfigProvider>
  )
}

TranslateControlPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
  onCollapse: PropTypes.func.isRequired,
}

/**
 * 获取当前翻译状态
 */
export function getTranslationStatus() {
  return {
    enabled: currentTranslateConfig !== null,
    isTranslating: isTranslating,
    translatedCount: translatedElements.size,
    totalCount: allTextNodes.length,
  }
}

/**
 * 添加翻译状态监听器
 */
export function addTranslationStatusListener(callback) {
  translationStateCallbacks.add(callback)
  return () => translationStateCallbacks.delete(callback)
}

/**
 * 渲染翻译控制面板
 */
export function renderTranslatePanel(options = {}) {
  const { collapsed = false } = options
  const existingPanel = document.getElementById('haoyu-immersive-translate-panel')
  if (existingPanel) {
    existingPanel.remove()
    return
  }

  // 配置高优先级message
  configureHighZIndexMessage()

  // 创建容器元素
  const container = document.createElement('div')
  container.id = 'haoyu-immersive-translate-panel'
  container.className = 'haoyu-immersive-translate-panel-container'

  // 根据collapsed参数决定位置
  if (collapsed) {
    // 折叠状态：隐藏在右边
    container.style.position = 'fixed'
    container.style.right = '-300px' // 隐藏在右边
    container.style.top = '100px'
    container.style.zIndex = MAX_Z_INDEX
    container.style.transition = 'right 0.3s ease'
  } else {
    // 正常状态
    container.style.position = 'fixed'
    container.style.right = '20px' // 距离右边20px
    container.style.top = '100px' // 距离顶部100px
    container.style.zIndex = MAX_Z_INDEX
  }

  // 添加到页面
  document.documentElement.appendChild(container)

  const root = createRoot(container)
  root.render(
    <TranslateControlPanel
      onClose={() => container.remove()}
      onCollapse={() => {
        // 折叠面板
        container.style.right = '-300px'
        setTimeout(() => {
          container.remove()
        }, 300)
      }}
    />,
  )
}

/**
 * 动态注入样式表
 */
async function injectStyles() {
  // 检查是否已经注入样式
  if (document.getElementById('haoyu-immersive-translate-styles')) return

  try {
    // 创建样式元素并直接注入CSS内容
    const style = document.createElement('style')
    style.id = 'haoyu-immersive-translate-styles'
    style.textContent = immersiveTranslateStyles

    document.head.appendChild(style)
  } catch (error) {
    console.error('注入沉浸式翻译样式时出错:', error)
  }
}

/**
 * 翻译选中文本
 */
export async function translateSelectedText(selectedText, targetLang = 'zh-CN') {
  if (!selectedText) return

  try {
    // 配置高优先级message
    configureHighZIndexMessage()

    message.loading('正在翻译选中文本...')
    const translatedText = await translateText(selectedText, targetLang)
    message.destroy()

    // 创建容器元素
    const container = document.createElement('div')
    container.className = 'haoyu-immersive-translate-result-container'

    // 使用居中定位，更好的用户体验
    container.style.position = 'fixed'
    container.style.left = '50%'
    container.style.top = '50%'
    container.style.transform = 'translate(-50%, -50%)' // 真正的居中
    container.style.zIndex = MAX_Z_INDEX

    // 添加到页面
    document.documentElement.appendChild(container)

    const root = createRoot(container)
    root.render(
      <ConfigProvider
        {...HIGH_Z_INDEX_CONFIG}
        getPopupContainer={(triggerNode) => {
          // 确保弹层渲染在结果容器内
          const resultContainer = triggerNode?.closest(
            '.haoyu-immersive-translate-result-container',
          )
          return resultContainer || document.body
        }}
      >
        <div className="haoyu-translate-result-panel">
          <div className="haoyu-result-header">
            <TranslationOutlined />
            <span>翻译结果</span>
            <Button type="text" size="small" onClick={() => container.remove()}>
              ×
            </Button>
          </div>
          <div className="haoyu-result-content">
            <div className="haoyu-original-text">
              <strong>原文：</strong>
              <div>{selectedText}</div>
            </div>
            <div className="haoyu-translated-text">
              <strong>译文：</strong>
              <div>{translatedText}</div>
            </div>
          </div>
          <div className="haoyu-result-actions">
            <Button
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(translatedText)
                message.success('已复制到剪贴板')
              }}
            >
              复制译文
            </Button>
          </div>
        </div>
      </ConfigProvider>,
    )

    setTimeout(() => {
      if (container.parentNode) {
        container.remove()
      }
    }, 5000)
  } catch (error) {
    console.error('选中文本翻译失败:', error)
    message.error('翻译失败，请重试')
  }
}

function isElementInViewport(element, buffer = TRANSLATE_CONFIG.lazyTranslate.viewportBuffer) {
  if (!element) return false

  const rect = element.getBoundingClientRect()
  const windowHeight = window.innerHeight

  return rect.top < windowHeight + buffer && rect.bottom > -buffer
}

function getVisibleTranslationUnits(translationUnits) {
  return translationUnits.filter((unit) => {
    if (processedTextNodes.has(unit)) return false

    const element = unit.type === 'block' ? unit.element : unit.node.parentElement
    if (!element) return false

    if (element.closest('[data-translated]') || element.closest('[data-translating]')) {
      return false
    }

    return isElementInViewport(element)
  })
}

/**
 * 检查翻译单元是否仍然有效
 */
function isTranslationUnitValid(unit) {
  const element = unit.type === 'block' ? unit.element : unit.node.parentElement
  return element && document.body.contains(element)
}

/**
 * 清理失效的翻译单元
 */
function cleanupInvalidUnits() {
  allTextNodes = allTextNodes.filter((unit) => {
    if (!isTranslationUnitValid(unit)) {
      processedTextNodes.delete(unit)
      const key = unit.type === 'block' ? unit.element : unit.node
      originalTexts.delete(key)
      translatedElements.delete(key)
      return false
    }
    return true
  })
}

async function performLazyTranslation() {
  if (!currentTranslateConfig || isTranslating) return

  cleanupInvalidUnits()

  const visibleUnits = getVisibleTranslationUnits(allTextNodes)
  if (visibleUnits.length === 0) return

  notifyTranslationStateChange(true)

  try {
    const batchSize = TRANSLATE_CONFIG.lazyTranslate.batchSize

    for (let i = 0; i < visibleUnits.length; i += batchSize) {
      const batch = visibleUnits.slice(i, i + batchSize)
      const validBatch = batch.filter(
        (unit) => isTranslationUnitValid(unit) && !processedTextNodes.has(unit),
      )

      if (validBatch.length === 0) continue

      validBatch.forEach((unit) => processedTextNodes.add(unit))

      const batchTasks = validBatch
        .map((unit) => {
          const text = unit.text

          if (!isWorthTranslating(text)) {
            const loadingInfo = createTranslatingElement(unit)
            if (loadingInfo) {
              updateTranslatingElementWithResult(loadingInfo, text)
            }
            return null
          }

          const loadingInfo = createTranslatingElement(unit)
          return { unit, text, loadingInfo }
        })
        .filter((task) => task?.loadingInfo)

      const translationPromises = batchTasks.map(async ({ unit, text, loadingInfo }) => {
        try {
          if (!isTranslationUnitValid(unit)) {
            loadingInfo.container.parentNode?.removeChild(loadingInfo.container)
            processedTextNodes.delete(unit)
            return
          }

          const translatedText = await translateText(
            text,
            currentTranslateConfig.targetLang,
            currentTranslateConfig.serviceId,
            currentTranslateConfig.customPrompt,
          )

          if (!isTranslationUnitValid(unit)) {
            loadingInfo.container.parentNode?.removeChild(loadingInfo.container)
            processedTextNodes.delete(unit)
            return
          }

          updateTranslatingElementWithResult(loadingInfo, translatedText)
        } catch (error) {
          console.error('懒翻译失败:', error)
          updateTranslatingElementWithResult(loadingInfo, text)
        }
      })

      await Promise.all(translationPromises)

      if (i + batchSize < visibleUnits.length) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }
  } catch (error) {
    console.error('懒翻译过程出错:', error)
  } finally {
    notifyTranslationStateChange(false)
  }
}

function handleScroll() {
  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }

  scrollTimer = setTimeout(() => {
    performLazyTranslation()
  }, TRANSLATE_CONFIG.lazyTranslate.scrollDelay)
}

function setupDOMObserver() {
  if (domObserver) {
    domObserver.disconnect()
  }

  let debounceTimer = null

  // 检查节点是否为翻译相关元素
  const isTranslationRelatedNode = (node) => {
    if (!node.classList) return false
    return (
      TRANSLATION_CLASS_NAMES.some((className) => node.classList.contains(className)) ||
      (node.closest && node.closest('[data-translating], [data-translated]'))
    )
  }

  domObserver = new MutationObserver((mutations) => {
    let hasNewContent = false

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && !isTranslationRelatedNode(node)) {
            const translationUnits = extractTranslationUnits(node)
            if (translationUnits.length > 0) {
              allTextNodes.push(...translationUnits)
              hasNewContent = true
            }
          }
        })
      }
    })

    if (hasNewContent && currentTranslateConfig) {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      debounceTimer = setTimeout(() => {
        performLazyTranslation()
      }, 800)
    }
  })

  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

function startLazyTranslation(targetLang = 'zh-CN', serviceId = null, customPrompt = '') {
  currentTranslateConfig = { targetLang, serviceId, customPrompt }
  processedTextNodes.clear()

  window.addEventListener('scroll', handleScroll, { passive: true })
  setupDOMObserver()
  performLazyTranslation()
}

function stopLazyTranslation() {
  currentTranslateConfig = null

  window.removeEventListener('scroll', handleScroll)

  if (scrollTimer) {
    clearTimeout(scrollTimer)
    scrollTimer = null
  }

  if (domObserver) {
    domObserver.disconnect()
    domObserver = null
  }

  processedTextNodes.clear()
}

function notifyTranslationStateChange(newState) {
  isTranslating = newState
  translationStateCallbacks.forEach((callback) => {
    try {
      callback(newState)
    } catch (error) {
      console.error('翻译状态回调出错:', error)
    }
  })
}

/**
 * 通知完整的翻译状态变化（包括enabled状态）
 */
function notifyFullTranslationStateChange() {
  const currentStatus = getTranslationStatus()
  translationStateCallbacks.forEach((callback) => {
    try {
      callback(currentStatus.isTranslating, currentStatus)
    } catch (error) {
      console.error('翻译状态回调出错:', error)
    }
  })
}

/**
 * 初始化沉浸式翻译
 */
export async function initImmersiveTranslate() {
  await injectStyles()

  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 't') {
      e.preventDefault()
      renderTranslatePanel()
    }
  })
}

/**
 * 配置高优先级的message显示
 */
export function configureHighZIndexMessage() {
  message.config({
    top: 100,
    duration: 3,
    maxCount: 3,
    getContainer: () => {
      // 优先使用现有的翻译容器
      const existingContainer =
        document.getElementById('haoyu-immersive-translate-panel') ||
        document.querySelector('.haoyu-immersive-translate-result-container')

      if (existingContainer) {
        return existingContainer
      }

      // 创建或获取消息容器
      let messageContainer = document.getElementById('haoyu-message-container')
      if (!messageContainer) {
        messageContainer = document.createElement('div')
        messageContainer.id = 'haoyu-message-container'
        Object.assign(messageContainer.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          zIndex: MAX_Z_INDEX,
          pointerEvents: 'none',
        })
        document.body.appendChild(messageContainer)
      }
      return messageContainer
    },
  })
}
