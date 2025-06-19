/**
 * 将链接转换为 https 链接
 * @param {string} url 链接
 * @returns {string} 转换后的链接
 */
export function formatToHttpsLink(url) {
  if (!url) return '';

  // 去除前后空格
  url = url.trim();

  // 如果已经是https 链接，直接返回
  if (/^https:\/\//i.test(url)) {
    return url;
  }

  // 如果已经是 http 链接，转换为 https
  if (/^http:\/\//i.test(url)) {
    return url.replace('http://', 'https://');
  }

  // 处理以 "//" 开头的链接（如：//a.com/abc）
  if (url.startsWith('//')) {
    return 'https:' + url;
  }

  // 处理没有协议和子路径的域名（如：a.com 或 www.a.com）
  // 自动添加 https://
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(url)) {
    return 'https://' + url;
  }

  // 其他情况（比如相对路径），原样返回或处理成绝对路径取决于业务需求
  return url;
}