import { requestManager } from './request'

/**
 * 客户开发 API 服务
 */
class CustomerDevService {
  /**
   * 获取任务列表
   * @returns {Promise<Array>} 任务列表
   */
  async getTaskList() {
    try {
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
            countries: {},
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
      console.log('getTaskList response:', response)
      return response.records || []
    } catch (error) {
      console.error('customerDev:获取任务列表失败:getTaskList:catch:', {
        message: error.message,
        details: error.details,
        code: error.code,
        type: error.type,
        request: error.request,
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
   * @param {object} leadData - 线索数据
   * @returns {Promise<object>} 提交结果
   */
  async submitLead(leadData = {}) {
    try {
      // 构建完整的请求数据，包含所有必要字段
      const requestData = {
        // 联系人信息
        user_name: leadData.user_name || '', // 联系人姓名（必填）
        user_function: leadData.user_function || '', // 联系人职位
        user_email: leadData.user_email || '', // 联系人邮箱
        user_phone: leadData.user_phone || '', // 联系人电话
        user_mobile: leadData.user_mobile || '', // 联系人手机
        user_website: leadData.user_website || '', // 联系人网站
        user_street: leadData.user_street || '', // 联系人地址
        user_street2: leadData.user_street2 || '', // 联系人地址2
        user_city: leadData.user_city || '', // 联系人城市
        user_country_id: leadData.user_country_id || null, // 联系人国家ID
        user_state_id: leadData.user_state_id || null, // 联系人省份ID
        user_title_id: leadData.user_title_id || null, // 联系人称谓ID

        // 公司信息
        company_name: leadData.company_name || '', // 公司名称（必填）
        company_street: leadData.company_street || '', // 公司地址
        company_street2: leadData.company_street2 || '', // 公司地址2
        company_city: leadData.company_city || '', // 公司城市
        company_country_id: leadData.company_country_id || null, // 公司国家ID
        company_state_id: leadData.company_state_id || null, // 公司省份ID
        company_phone: leadData.company_phone || '', // 公司电话
        company_email: leadData.company_email || '', // 公司邮箱
        company_website: leadData.company_website || '', // 公司网站

        // 线索信息
        thread_name: leadData.thread_name || '', // 线索名称（必填）
        thread_type: leadData.thread_type || 'opportunity', // 线索类型：lead(线索)或opportunity(商机)
        linkin_site: leadData.linkin_site || '', // LinkedIn链接
        city: leadData.city || '', // 线索城市
        country_id: leadData.country_id || null, // 线索国家ID
        state_id: leadData.state_id || null, // 线索省份ID
        street: leadData.street || '', // 线索地址
        street2: leadData.street2 || '', // 线索地址2
        tag_names: leadData.tag_names || [], // 标签名称列表
        priority: leadData.priority || '1', // 优先级：0(低)、1(中)、2(高)、3(很高)
        task_id: leadData.task_id || null, // 关联的任务ID
      }

      // 验证必填字段
      if (!leadData.user_name) {
        throw new Error('联系人姓名不能为空')
      }
      if (!leadData.company_name) {
        throw new Error('公司名称不能为空')
      }
      if (!leadData.thread_name) {
        throw new Error('线索名称不能为空')
      }
      if (!leadData.task_id) {
        throw new Error('任务ID不能为空')
      }

      const response = await requestManager.request('/api/create/thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: leadData,
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

export const customerDevService = new CustomerDevService()
