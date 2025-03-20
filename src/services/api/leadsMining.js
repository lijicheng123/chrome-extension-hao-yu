import { requestManager } from './request'

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
   * @param {object} leadData - 线索数据
   * @returns {Promise<object>} 提交结果
   */
  async submitLead(leadData = {}) {
    try {
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

  /**
   * 提交线索（带模板数据）
   * @param {Object} data - 覆盖默认模板的数据
   * @returns {Promise}
   */
  async submitLeadWithTemplate(data = {}) {
    // 构建线索数据
    const leadData = {
      // 联系人信息
      user_name: '张三11', // 联系人姓名（必填）
      user_function: '销售总监', // 联系人职位
      user_email: 'zhangsan@example.com', // 联系人邮箱
      user_phone: '13800138000', // 联系人电话
      user_mobile: '13900139000', // 联系人手机
      user_website: 'https://personal.example.com', // 联系人网站
      user_street: '朝阳区建国路88号', // 联系人地址
      user_street2: '2号楼3层', // 联系人地址2
      user_city: '北京', // 联系人城市
      user_country_id: 233, // 联系人国家ID
      user_state_id: 13, // 联系人省份ID
      user_title_id: 3, // 联系人称谓ID

      // 公司信息
      company_name: '示例科技有限公司11', // 公司名称（必填）
      company_street: '朝阳区建国路88号', // 公司地址
      company_street2: '2号楼整栋', // 公司地址2
      company_city: '北京', // 公司城市
      company_country_id: 233, // 公司国家ID
      company_state_id: 13, // 公司省份ID
      company_phone: '010-12345678', // 公司电话
      company_email: 'contact@example.com', // 公司邮箱
      company_website: 'https://www.example.com', // 公司网站

      // 线索信息
      thread_name: '示例科技合作机会11', // 线索名称（必填）
      thread_type: 'lead', // 线索类型：lead(线索)或opportunity(商机)
      linkin_site: 'https://linkedin.com/in/zhangsan', // LinkedIn链接
      city: '北京', // 线索城市
      country_id: 233, // 线索国家ID
      state_id: 13, // 线索省份ID
      street: '朝阳区建国路88号', // 线索地址
      street2: '2号楼', // 线索地址2
      tag_names: ['潜在客户', '高价值', '科技行业'], // 标签名称列表
      priority: '2', // 优先级：0(低)、1(中)、2(高)、3(很高)
      // 来源信息
      leads_source_url: window.location.href,
      leads_target_url: window.location.href,
      leads_keywords: 'bottle \n water bottle',
      ...data,
    }

    return this.submitLead(leadData)
  }
}

export const customerDevService = new LeadsMiningService()
