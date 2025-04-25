export const API_CONFIG = {
  BASE_URL: 'http://localhost:8069',
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
  },
}
