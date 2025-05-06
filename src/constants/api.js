import process from 'process'

// 合并的API配置
export const API_CONFIG = {
  // 基础URL配置
  BASE_URL: process.env.BASE_URL,
  ODOO_BASE_URL: `${process.env.BASE_URL}/odoo`,
  
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
