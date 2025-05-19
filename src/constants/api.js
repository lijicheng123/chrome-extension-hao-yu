import process from 'process'

// 合并的API配置
export const API_CONFIG = {
  // 基础URL配置
  BASE_URL: process.env.BASE_URL,
  ODOO_BASE_URL: `${process.env.BASE_URL}/odoo`,
  DOUBAO_API_KEY: process.env.DOUBAO_API_KEY || '82e752a3-738e-4852-a2e2-1a949042abad',
  DOUBAO_BASE_URL: 'https://ark.cn-beijing.volces.com',
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
