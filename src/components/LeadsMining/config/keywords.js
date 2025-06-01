/**
 * 线索挖掘关键词配置
 * 支持多个平台的关键词管理
 */

// 水瓶批发相关关键词 - 谷歌地图专用
export const WATER_BOTTLE_KEYWORDS = [
  'water bottle wholesale new york',
  'bulk buy water bottles New York',
  'custom water bottles NYC',
  'reusable water bottles supplier NY',
  'wholesale sports water bottles NYC',
  'eco-friendly water bottles New York',
  'insulated water bottle distributor NY',
  'glass water bottle wholesale NYC',
  'promotional water bottles New York',
  'hydration pack supplier NYC',
]

// B2B软件相关关键词 - 通用
export const B2B_SOFTWARE_KEYWORDS = [
  'B2B software companies',
  'enterprise software solutions',
  'business automation tools',
  'CRM software vendors',
  'ERP system providers',
  'cloud computing services',
  'SaaS platform developers',
  'API integration services',
  'data analytics companies',
  'cybersecurity solutions',
]

// 电商相关关键词 - 通用
export const ECOMMERCE_KEYWORDS = [
  'ecommerce platform providers',
  'online store developers',
  'payment gateway solutions',
  'inventory management systems',
  'logistics automation tools',
  'customer service platforms',
  'email marketing services',
  'social media management',
  'conversion optimization',
  'dropshipping suppliers',
]

// LinkedIn专用关键词
export const LINKEDIN_KEYWORDS = [
  'Chief Technology Officer',
  'VP of Engineering',
  'Software Development Manager',
  'Product Manager',
  'DevOps Engineer',
  'Data Scientist',
  'UX Designer',
  'Digital Marketing Manager',
  'Sales Director',
  'Business Development',
]

// Facebook/Meta专用关键词
export const FACEBOOK_KEYWORDS = [
  'small business owners',
  'startup founders',
  'digital marketers',
  'e-commerce entrepreneurs',
  'software developers',
  'marketing agencies',
  'consulting services',
  'local businesses',
  'online retailers',
  'tech companies',
]

// Reddit专用关键词
export const REDDIT_KEYWORDS = [
  'r/entrepreneur',
  'r/startups',
  'r/webdev',
  'r/marketing',
  'r/smallbusiness',
  'r/ecommerce',
  'r/SaaS',
  'r/digitalnomad',
  'r/remotework',
  'r/programming',
]

// 谷歌搜索专用关键词
export const GOOGLE_SEARCH_KEYWORDS = [
  'best CRM software 2024',
  'top project management tools',
  'email marketing platforms',
  'customer service software',
  'accounting software for small business',
  'HR management systems',
  'inventory tracking solutions',
  'social media scheduling tools',
  'website builder platforms',
  'online payment processors',
]

// 按平台分组的关键词配置
export const PLATFORM_KEYWORDS = {
  googleMaps: {
    name: '谷歌地图',
    keywords: WATER_BOTTLE_KEYWORDS,
    description: '水瓶批发供应商关键词',
  },
  linkedin: {
    name: 'LinkedIn',
    keywords: LINKEDIN_KEYWORDS,
    description: '职业角色和职位关键词',
  },
  facebook: {
    name: 'Facebook',
    keywords: FACEBOOK_KEYWORDS,
    description: '目标受众和业务类型关键词',
  },
  reddit: {
    name: 'Reddit',
    keywords: REDDIT_KEYWORDS,
    description: '相关子版块和社区关键词',
  },
  googleSearch: {
    name: '谷歌搜索',
    keywords: GOOGLE_SEARCH_KEYWORDS,
    description: '软件和服务相关搜索关键词',
  },
}

// 获取指定平台的关键词
export const getPlatformKeywords = (platform) => {
  return PLATFORM_KEYWORDS[platform]?.keywords || []
}

// 获取指定平台的配置
export const getPlatformConfig = (platform) => {
  return PLATFORM_KEYWORDS[platform] || null
}

// 获取所有可用平台
export const getAvailablePlatforms = () => {
  return Object.keys(PLATFORM_KEYWORDS)
}

// 默认导出谷歌地图关键词（向后兼容）
export default WATER_BOTTLE_KEYWORDS 