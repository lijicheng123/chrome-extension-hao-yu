import Browser from 'webextension-polyfill'
import { requestManager } from '../api/request'
import { API_CONFIG } from '../../constants/api.js'
import { MessagingService } from '../messaging/index'

// 创建配置消息服务
const configService = new MessagingService('CONFIG')

// 定义配置API常量
export const CONFIG_API = {
  LOCAL_CONFIG_UPDATED: 'LOCAL_CONFIG_UPDATED',
  CLOUD_CONFIG_UPDATED: 'CLOUD_CONFIG_UPDATED',
  USER_INFO_UPDATED: 'USER_INFO_UPDATED',
}

class ConfigManager {
  constructor() {
    this.localCache = null
    this.cloudCache = null
    this.cloudCacheExpireTime = 5 * 60 * 1000
    this.lastCloudFetchTime = 0
    this.configId = null
    this.userInfo = null
  }

  async init() {
    const storage = await Browser.storage.local.get(['configId'])
    this.configId = storage.configId
  }

  async createCloudConfig(name, configData) {
    const response = await requestManager.request(API_CONFIG.ENDPOINTS.CONFIG.CREATE, {
      method: 'POST',
      body: {
        name,
        config_data: configData,
      },
    })

    this.configId = response.data.config_id
    await Browser.storage.local.set({ configId: this.configId })
    await this.saveCloudConfig(response.data)
    return response.data
  }

  async updateCloudConfig(configData) {
    if (!this.configId) {
      return this.createCloudConfig('默认配置', configData)
    }

    const response = await requestManager.request(API_CONFIG.ENDPOINTS.CONFIG.UPDATE, {
      method: 'POST',
      body: {
        config_id: this.configId,
        name: '默认配置',
        config_data: configData,
      },
    })

    await this.saveCloudConfig(response.data)
    return response.data
  }

  async getCloudConfig(forceRefresh = false) {
    if (
      !forceRefresh &&
      this.cloudCache &&
      Date.now() - this.lastCloudFetchTime < this.cloudCacheExpireTime
    ) {
      return this.cloudCache
    }

    if (!this.configId) {
      return null
    }

    const response = await requestManager.request(
      `${API_CONFIG.ENDPOINTS.CONFIG.GET}?config_id=${this.configId}`,
    )

    await this.saveCloudConfig(response.data)
    return response.data
  }

  async saveLocalConfig(config) {
    await Browser.storage.local.set({ localConfig: config })
    this.localCache = config
    await this.notifyConfigUpdate(CONFIG_API.LOCAL_CONFIG_UPDATED, config)
  }

  async saveCloudConfig(config) {
    await Browser.storage.local.set({
      cloudConfig: config,
      lastCloudFetchTime: Date.now(),
    })
    this.cloudCache = config
    this.lastCloudFetchTime = Date.now()
    await this.notifyConfigUpdate(CONFIG_API.CLOUD_CONFIG_UPDATED, config)
  }

  async notifyConfigUpdate(action, config) {
    // 只使用新的消息服务
    await configService.broadcastMessage(action, { config })
  }

  async getLocalConfig() {
    if (!this.localCache) {
      const { localConfig } = await Browser.storage.local.get('localConfig')
      this.localCache = localConfig || {}
    }
    return this.localCache
  }

  async getAllConfig(forceCloudRefresh = false) {
    const [localConfig, cloudConfig] = await Promise.all([
      this.getLocalConfig(),
      this.getCloudConfig(forceCloudRefresh),
    ])

    return {
      local: localConfig || {},
      cloud: cloudConfig?.config_data || {},
    }
  }

  async saveUserInfo(userInfo) {
    await Browser.storage.local.set({ userInfo })
    this.userInfo = userInfo
    await this.notifyConfigUpdate(CONFIG_API.USER_INFO_UPDATED, userInfo)
  }

  async getUserInfo() {
    if (!this.userInfo) {
      const { userInfo } = await Browser.storage.local.get('userInfo')
      this.userInfo = userInfo || null
    }
    return this.userInfo
  }

  async clearUserInfo() {
    await Browser.storage.local.remove('userInfo')
    this.userInfo = null
    await this.notifyConfigUpdate(CONFIG_API.USER_INFO_UPDATED, null)
  }
}

export const configManager = new ConfigManager()

// 导出服务实例，供其他模块使用
export default configService
