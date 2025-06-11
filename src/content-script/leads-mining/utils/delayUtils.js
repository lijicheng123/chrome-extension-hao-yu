/**
 * 延迟工具函数
 * 用于自动化操作中的随机延迟，避免被检测为机器人
 */

/**
 * 生成指定范围内的随机延迟时间
 * @param {number} min - 最小延迟时间（毫秒）
 * @param {number} max - 最大延迟时间（毫秒）
 * @returns {number} 随机延迟时间
 */
export const getRandomDelay = (min = 1000, max = 2000) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 执行随机延迟
 * @param {number} min - 最小延迟时间（毫秒），默认1秒
 * @param {number} max - 最大延迟时间（毫秒），默认2秒
 * @returns {Promise<void>}
 */
export const randomDelay = (min = 1000, max = 2000) => {
  const delay = getRandomDelay(min, max)
  console.log(`等待 ${delay}ms...`)
  return new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * 短延迟 (0.5-1秒)
 * @returns {Promise<void>}
 */
export const shortDelay = () => randomDelay(500, 1000)

/**
 * 中等延迟 (1-2秒)
 * @returns {Promise<void>}
 */
export const mediumDelay = () => randomDelay(1000, 2000)

/**
 * 长延迟 (2-3秒)
 * @returns {Promise<void>}
 */
export const longDelay = () => randomDelay(2000, 3000) 

/**
 * 长延迟 (2-3秒)
 * @returns {Promise<void>}
 */
export const delay = (delayTime) => {
  return new Promise(resolve => setTimeout(resolve, delayTime))
}