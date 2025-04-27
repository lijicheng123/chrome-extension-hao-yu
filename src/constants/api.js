// 合并的API配置
export const API_CONFIG = {
  // 基础URL配置
  BASE_URL: 'http://localhost:8069',
  ODOO_BASE_URL: 'http://localhost:8069/odoo',
  
  // 线上环境URL配置 (hardcoded)
  PRODUCTION_BASE_URL: 'https://example.com', // 需要替换为实际的生产环境URL
  PRODUCTION_ODOO_BASE_URL: 'https://example.com/odoo', // 需要替换为实际的生产环境URL
  
  // API端点配置
  ENDPOINTS: {
    AUTH: {
      SEND_CODE: '/api/send_verification_code',
      LOGIN: '/api/login',
      GET_SESSION_INFO: '/web/session/get_session_info',
    },
    CONFIG: {
      CREATE: '/api/user/config/create',
      UPDATE: '/api/user/config/update',
      GET: '/api/user/config',
    },
  }
}
