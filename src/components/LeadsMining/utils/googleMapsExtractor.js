import { message } from 'antd'

/**
 * 谷歌地图信息提取器
 * 使用多重策略确保稳定性，避免依赖容易变化的CSS类名
 */

/**
 * 获取谷歌地图信息面板容器
 * @returns {Element|null} 信息面板容器元素
 */
const getMapsPanelContainer = () => {
  // 优先查找 jstcache="4" 的容器
  const jstcacheContainer = document.querySelector('div[jstcache="4"]')
  if (jstcacheContainer) {
    return jstcacheContainer
  }
  
  // 备用方案：查找主要内容区域
  return document.querySelector('div[role="main"]') || 
         document.querySelector('div[data-mid]') ||
         document.body
}

/**
 * 在指定容器内查找元素
 * @param {string} selector - 选择器
 * @param {Element} container - 容器元素
 * @returns {Element|null} 找到的元素
 */
const findInContainer = (selector, container = null) => {
  const searchContainer = container || getMapsPanelContainer()
  return searchContainer ? searchContainer.querySelector(selector) : null
}

/**
 * 检测当前页面是否为谷歌地图页面
 * @returns {boolean} 是否为谷歌地图页面
 */
export const isGoogleMapsPage = () => {
  const hostname = window.location.hostname
  const pathname = window.location.pathname
  
  // 检查域名和路径
  return (hostname.includes('google.') && (
    pathname.includes('/maps') ||
    pathname.includes('/place') ||
    window.location.href.includes('maps.google')
  ))
}

/**
 * 提取商户基础信息
 * @returns {Object} 商户基础信息
 */
const extractBasicInfo = () => {
  const info = {
    businessName: '',
    category: '',
    rating: '',
    reviewCount: ''
  }

  try {
    const container = getMapsPanelContainer()
    if (!container) return info

    // 提取商户名称 - 使用多种策略
    info.businessName = 
      // 策略1：查找h1标签中的商户名
      findInContainer('h1[style*="font-family"]', container)?.textContent?.trim() ||
      // 策略2：通过aria-label属性查找
      container.getAttribute('aria-label')?.split(',')[0] ||
      // 策略3：查找页面标题中的商户名
      document.title.split(' - ')[0] ||
      // 策略4：从URL中提取
      decodeURIComponent(window.location.href.match(/place\/([^/]+)/)?.[1] || '').replace(/\+/g, ' ') ||
      ''

    // 提取商户类别 - 限制在容器内查找
    info.category = 
      // 策略1：查找带有button的类别元素
      findInContainer('button[jsaction*="category"]', container)?.textContent?.trim() ||
      // 策略2：查找特定的类别按钮
      findInContainer('button[data-value*="类别"], button[data-value*="category"]', container)?.textContent?.trim() ||
      ''

    // 提取评分信息 - 使用更精确的选择器
    const ratingElement = 
      // 策略1：查找包含评分的aria-label
      findInContainer('[aria-label*="星级"]', container) ||
      findInContainer('[aria-label*="star"]', container) ||
      // 策略2：查找评分容器
      findInContainer('[role="img"][aria-label*="星"]', container)
    
    if (ratingElement) {
      const ariaLabel = ratingElement.getAttribute('aria-label')
      const ratingMatch = ariaLabel?.match(/(\d\.\d)/) || ratingElement.textContent?.match(/(\d\.\d)/)
      info.rating = ratingMatch?.[1] || ''
      
      // 提取评价数量
      const reviewMatch = ariaLabel?.match(/(\d+)\s*条评/) || ariaLabel?.match(/(\d+)\s*review/)
      info.reviewCount = reviewMatch?.[1] || ''
    }

    return info
  } catch (error) {
    console.error('提取基础信息时出错:', error)
    return info
  }
}

/**
 * 提取联系信息
 * @returns {Object} 联系信息
 */
const extractContactInfo = () => {
  const contact = {
    phone: '',
    website: '',
    address: '',
    plusCode: ''
  }

  try {
    const container = getMapsPanelContainer()
    if (!container) return contact

    // 提取电话号码 - 使用更精确的选择器
    const phoneElement = 
      // 策略1：查找带有电话aria-label的按钮
      findInContainer('button[aria-label*="电话"]', container) ||
      findInContainer('button[aria-label*="phone"]', container) ||
      // 策略2：查找tel链接
      findInContainer('a[href^="tel:"]', container) ||
      // 策略3：查找包含data-item-id="phone"的元素
      findInContainer('[data-item-id*="phone"]', container)

    if (phoneElement) {
      const phoneText = phoneElement.textContent || phoneElement.getAttribute('aria-label') || ''
      const phoneMatch = phoneText.match(/[+]?[\d\s\-().]{10,}/)
      contact.phone = phoneMatch?.[0]?.trim() || ''
    }

    // 提取网站信息 - 使用稳定的属性选择器
    const websiteElement = 
      // 策略1：查找带有data-item-id="authority"的链接
      findInContainer('a[data-item-id="authority"]', container) ||
      // 策略2：查找带有网站相关aria-label的链接
      findInContainer('a[aria-label*="网站:"]', container) ||
      findInContainer('a[aria-label*="website:"]', container) ||
      // 策略3：查找网站按钮
      findInContainer('button[aria-label*="网站"]', container) ||
      findInContainer('button[aria-label*="website"]', container) ||
      // 策略4：查找带有网站相关data-tooltip的元素
      findInContainer('[data-tooltip*="网站"]', container) ||
      findInContainer('[data-tooltip*="website"]', container)

    if (websiteElement) {
      // 优先使用href属性
      contact.website = websiteElement.href || ''
      
      // 如果没有href，尝试从aria-label获取
      if (!contact.website) {
        const ariaLabel = websiteElement.getAttribute('aria-label') || ''
        const websiteMatch = ariaLabel.match(/(?:网站|website):\s*([^\s]+)/)
        if (websiteMatch) {
          contact.website = websiteMatch[1]
        }
      }
      
      // 确保网站URL格式正确
      if (contact.website && !contact.website.toLowerCase().startsWith('http')) {
        contact.website = 'https://' + contact.website.toLowerCase()
      }
    }

    // 提取地址信息 - 使用更精确的选择器
    const addressElement = 
      // 策略1：查找地址按钮
      findInContainer('button[aria-label*="地址"]', container) ||
      findInContainer('button[aria-label*="address"]', container) ||
      // 策略2：查找包含data-item-id="address"的元素
      findInContainer('[data-item-id="address"]', container)

    if (addressElement) {
      contact.address = 
        addressElement.textContent?.trim() ||
        addressElement.getAttribute('aria-label')?.replace(/地址[:：]\s*/, '') ||
        ''
    }

    // 提取Plus Code - 使用更精确的选择器
    const plusCodeElement = 
      // 策略1：查找Plus Code按钮
      findInContainer('button[aria-label*="Plus Code"]', container) ||
      // 策略2：查找包含data-item-id="oloc"的元素
      findInContainer('[data-item-id="oloc"]', container)

    if (plusCodeElement) {
      const plusCodeText = plusCodeElement.textContent || plusCodeElement.getAttribute('aria-label') || ''
      const plusCodeMatch = plusCodeText.match(/([A-Z0-9]{4}\+[A-Z0-9]{2,}[^,\s]*)/)
      contact.plusCode = plusCodeMatch?.[1] || ''
    }

    return contact
  } catch (error) {
    console.error('提取联系信息时出错:', error)
    return contact
  }
}

/**
 * 提取所有谷歌地图信息（内部使用）
 * @returns {Object} 完整的地图信息对象
 */
const extractGoogleMapsData = () => {
  if (!isGoogleMapsPage()) {
    console.warn('当前页面不是谷歌地图页面')
    return null
  }

  try {
    const data = {
      // 基础信息
      ...extractBasicInfo(),
      // 联系信息
      ...extractContactInfo()
    }

    console.log('谷歌地图数据提取完成:', data)
    return data
  } catch (error) {
    console.error('提取谷歌地图数据时出错:', error)
    return null
  }
}

/**
 * 将谷歌地图数据转换为标准联系人格式
 * @param {Object} mapsData - 谷歌地图数据
 * @param {string} keyword - 挖掘关键词
 * @returns {Array} 标准联系人对象数组
 */
const convertToStandardFormat = (mapsData, keyword = '') => {
  if (!mapsData) return []

  try {
    const businessName = mapsData.businessName || ''
    const currentUrl = window.location.href
    
    const contactData = {
      // 联系人信息
      user_email: '', // 谷歌地图通常没有邮箱信息
      user_name: businessName,
      user_function: '商家联系人', // 默认职能
      user_phone: mapsData.phone || '',
      user_mobile: '', // 谷歌地图不区分座机和手机
      
      // 公司信息(company_name为空，服务器不会保存这个公司，但会保存这条线索)
      company_name: businessName, // 使用商家名称作为公司名
      company_phone: mapsData.phone || '',
      company_email: '', // 谷歌地图通常没有邮箱
      company_website: mapsData.website || '',
      
      // 地址信息
      street: mapsData.address || '',
      user_street: mapsData.address || '',
      user_street2: '',
      user_city: '', // 需要从地址中解析
      user_state: '',
      user_zip: mapsData.plusCode,
      user_country: '',
      
      // 社交媒体
      linkin_site: '',
      user_linkedin: '',
      user_facebook: '',
      user_website: mapsData.website || '',
      
      // 线索信息 - 重要：添加必需字段
      thread_type: 'lead',
      thread_name: `${businessName}-GoogleMaps`, // 必需字段
      priority: '2',
      
      // 来源信息
      leads_source_url: currentUrl,
      // leads_target_url: currentUrl,
      leads_keywords: keyword, // 关键词信息
      
      // 标签信息
      tag_names: [
        '谷歌地图获客',
        mapsData.category || '',
        ...(mapsData.rating ? [`评分${mapsData.rating}星`] : [])
      ].filter(Boolean)
    }

    return [contactData]
  } catch (error) {
    console.error('转换谷歌地图数据格式时出错:', error)
    return []
  }
}

/**
 * 一键提取谷歌地图联系人信息
 * @param {string} keyword - 挖掘关键词
 * @returns {Array} 标准格式的联系人信息数组
 */
export const extractGoogleMapsContacts = (keyword = '') => {
  console.log('开始提取谷歌地图联系人信息...', keyword ? `关键词: ${keyword}` : '')
  
  const mapsData = extractGoogleMapsData()
  if (!mapsData) {
    message.warning('无法从当前页面提取谷歌地图信息')
    return []
  }

  const contacts = convertToStandardFormat(mapsData, keyword)
  
  if (contacts.length > 0) {
    message.success(`成功提取到 ${contacts.length} 个联系人信息`)
    console.log('提取的联系人信息:', contacts)
  } else {
    message.info('未能提取到有效的联系人信息')
  }

  return contacts
} 