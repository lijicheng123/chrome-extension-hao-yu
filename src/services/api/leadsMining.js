import { requestManager } from './request'
import { isUserLoggedIn } from '../../background/userSessionInfo.mjs'
import { optimizeUrl } from '../../content-script/leads-mining/utils/searchEngineUtils'
/**
 * 客户开发 API 服务
 */
class LeadsMiningService {
  /**
   * 获取任务列表
   * @returns {Promise<Array>} 任务列表
   */
  async getTaskList() {
    console.log('LeadsMiningService.getTaskList() 开始执行')
    try {
      console.log('准备发送odooCall请求到/web/dataset/call_kw')
      const response = await requestManager.odooCall('/web/dataset/call_kw', {
        model: 'leads.mining.task',
        method: 'web_search_read',
        args: [],
        kwargs: {
          specification: {
            id: {},
            name: {},
            active: {},
            priority: {},
            status: {},
            keywords: {},
            exclusion_keywords: {},
            "countries_info": {},
            "cities": {},
            sites: {},
            extra_keywords: {},
            email_suffixes: {},
            planned_start: {},
            planned_end: {},
          },
          offset: 0,
          order: '',
          limit: 80,
          domain: [],
        },
      })
      console.log('getTaskList请求成功, 收到响应:', response)
      return response?.result?.records || []
    } catch (error) {
      console.error('leadsMining:获取任务列表失败:getTaskList:catch:', {
        message: error.message,
        details: error.details,
        code: error.code,
        type: error.type,
        request: error.request,
        stack: error.stack,
      })

      throw error
    }
  }

  /**
   * 更新客户信息
   * @param {string} customerId - 客户ID
   * @param {object} customerData - 客户数据
   * @returns {Promise<object>} 更新后的客户数据
   */
  async updateCustomer(customerId, customerData) {
    try {
      const response = await requestManager.post(
        `/api/leads/customer/${customerId}/update`,
        customerData,
      )
      this._validateResponse(response)
      return response.data
    } catch (error) {
      console.error('更新客户信息失败:', {
        message: error.message,
        details: error.details,
        customerId,
        customerData,
        request: error.request,
      })
      throw error
    }
  }

  /**
   * 批量创建客户
   * @param {Array} customers - 客户数据数组
   * @returns {Promise<Array>} 创建的客户数据
   */
  async batchCreateCustomers(customers = []) {
    try {
      const response = await requestManager.post('/api/leads/customer/create', { customers })
      this._validateResponse(response)
      return response.data
    } catch (error) {
      console.error('批量创建客户失败:', {
        message: error.message,
        details: error.details,
        customerCount: customers.length,
        request: error.request,
      })
      throw error
    }
  }

  /**
   * 删除客户
   * @param {string} customerId - 客户ID
   * @returns {Promise<object>} 删除结果
   */
  async deleteCustomer(customerId) {
    try {
      const response = await requestManager.post(`/api/leads/customer/${customerId}/delete`)
      this._validateResponse(response)
      return response.data
    } catch (error) {
      console.error('删除客户失败:', {
        message: error.message,
        details: error.details,
        customerId,
        request: error.request,
      })
      throw error
    }
  }

  /**
   * 提交线索到 Odoo
   * @param {Array} leadData - 线索数据
   * @returns {Promise<object>} 提交结果
   */
  async submitLead(leadData = []) {
    const loggedIn = await isUserLoggedIn()
    if (!loggedIn) {
      throw new Error('用户未登录')
    }
    try {
      const submitLeads = leadData.filter((lead) => {
        // 是否完整
        const isFullLead = lead.thread_name && lead.task_id
        if (!isFullLead) {
          console.error('线索数据不完整:', lead)
          return
        }
        return isFullLead
      })

      const response = await requestManager.request('/api/create/thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: submitLeads,
      })

      return response
    } catch (error) {
      console.error('提交线索失败:', {
        message: error.message,
        details: error.details,
        leadData,
        request: error.request,
      })
      throw error
    }
  }

  /**
   * 调用 Odoo AI 服务
   * @param {object} params - 参数
   * @returns {Promise<object>} 调用结果
   */
  async callOdooAI(params = {}) {
    try {
      const payload = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'crm.lead',
          ...params,
        },
      }

      const response = await requestManager.request('web/dataset/call_kw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
      })

      if (response.error) {
        throw new Error(response.error.message || '调用 AI 服务失败')
      }

      return response.result
    } catch (error) {
      console.error('调用 AI 服务失败:', error)
      throw error
    }
  }

  /**
   * 验证响应
   * @private
   * @param {object} response - 响应对象
   */
  _validateResponse(response) {
    if (
      response === null ||
      response === undefined ||
      (response.jsonrpc === '2.0' && response.error)
    ) {
      const errorObj = new Error(
        '请求失败: ' + (response?.error?.message || response?.message || '未知错误'),
      )

      if (response?.error) {
        errorObj.details = response.error.data
        errorObj.code = response.error.code
        errorObj.type = 'api_error'
        errorObj.originalError = response.error
      }

      throw errorObj
    }
  }
}

export const customerDevService = new LeadsMiningService()
