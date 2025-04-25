import { MessagingService } from './index'
import { ApiContentAPI, apiClient } from './api-content'
import { ApiBackgroundHandlers } from './api-bg'

/**
 * API请求消息服务
 * 命名空间: API
 */
const apiService = new MessagingService('API')

// 定义API常量
export const API_ACTIONS = {
  REQUEST: 'REQUEST',
  RESPONSE: 'RESPONSE',
  FETCH: 'FETCH',
}

// 导出所有组件，保持现有引用兼容性
export default apiService
export { ApiContentAPI, apiClient, ApiBackgroundHandlers }
