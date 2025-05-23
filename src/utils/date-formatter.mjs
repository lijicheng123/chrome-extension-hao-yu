/**
 * 时间格式化工具
 * 提供灵活的时间格式化功能，支持年月日时分秒的各种组合
 */

/**
 * 预定义的时间格式配置
 */
export const TIME_FORMATS = {
  FULL: ['year', 'month', 'day', 'hour', 'minute', 'second'],
  DATE_TIME: ['year', 'month', 'day', 'hour', 'minute'],
  DATE_ONLY: ['year', 'month', 'day'],
  TIME_ONLY: ['hour', 'minute', 'second'],
  MONTH_DAY_TIME: ['month', 'day', 'hour', 'minute'],
  YEAR_MONTH_DAY: ['year', 'month', 'day'],
  HOUR_MINUTE: ['hour', 'minute'],
}

/**
 * 格式化时间
 * @param {Object} options - 配置选项
 * @param {Date} [options.date=new Date()] - 要格式化的日期对象
 * @param {string[]} [options.format=TIME_FORMATS.FULL] - 时间格式数组，如 ['year', 'month', 'day', 'hour', 'minute']
 * @param {string} [options.separator='-'] - 分隔符
 * @param {boolean} [options.padZero=true] - 是否补零
 * @returns {string} 格式化后的时间字符串
 */
export const formatDate = ({
  date = new Date(),
  format = TIME_FORMATS.FULL,
  separator = '-',
  padZero = true,
} = {}) => {
  const timeMap = {
    year: date.getFullYear(),
    month: date.getMonth() + 1, // JavaScript月份从0开始
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  }

  const formatValue = (value) => {
    if (!padZero) return value.toString()
    return value < 10 ? `0${value}` : value.toString()
  }

  return format.map((key) => formatValue(timeMap[key])).join(separator)
}

/**
 * 获取当前时间戳（月日时分格式）
 * @param {string} [separator='-'] - 分隔符
 * @returns {string} 格式化的时间戳
 */
export const getCurrentTimestamp = (separator = '-') => {
  return formatDate({
    format: TIME_FORMATS.MONTH_DAY_TIME,
    separator,
  })
}

/**
 * 获取当前日期（年月日格式）
 * @param {string} [separator='-'] - 分隔符
 * @returns {string} 格式化的日期
 */
export const getCurrentDate = (separator = '-') => {
  return formatDate({
    format: TIME_FORMATS.DATE_ONLY,
    separator,
  })
}

/**
 * 获取当前时间（时分秒格式）
 * @param {string} [separator=':'] - 分隔符
 * @returns {string} 格式化的时间
 */
export const getCurrentTime = (separator = ':') => {
  return formatDate({
    format: TIME_FORMATS.TIME_ONLY,
    separator,
  })
}

/**
 * 获取完整的日期时间
 * @param {string} [separator='-'] - 分隔符
 * @returns {string} 格式化的完整日期时间
 */
export const getFullDateTime = (separator = '-') => {
  return formatDate({
    format: TIME_FORMATS.FULL,
    separator,
  })
}

/**
 * 自定义格式化时间
 * @param {string[]} format - 自定义格式数组
 * @param {string} [separator='-'] - 分隔符
 * @param {Date} [date=new Date()] - 日期对象
 * @returns {string} 格式化的时间字符串
 */
export const customFormat = (format, separator = '-', date = new Date()) => {
  return formatDate({
    date,
    format,
    separator,
  })
}
