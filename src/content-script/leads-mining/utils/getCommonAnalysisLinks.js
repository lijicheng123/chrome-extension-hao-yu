/**
 * getCommonAnalysisLinks.js
 * 用途：从网页中提取常见分析类链接（如关于、联系、产品等），仅限当前主域，结果去重且排除可疑链接
 */

/**
 * 获取当前页面中符合匹配规则的 <a> 链接（仅限当前主域）
 * @param {HTMLElement} [container=document.body] - 要查找链接的容器，默认为 document.body
 * @param {Object} [rules={}] - 自定义匹配规则，格式 { type: [pattern] }
 * @returns {Array<{type: string, name: string, url: string}>} 去重后的匹配链接列表
 */
export default function getCommonAnalysisLinks(container = document.body, rules = {}) {
  // 默认匹配规则（中文 + 英文关键词/正则）
  const defaultRules = {
      about: [
          /关于我们/i,
          /公司简介/i,
          /企业介绍/i,
          /about\s*us/i,
          /about\s+company/i,
          /company\s+profile/i,
          /introduction/i,
          /profile/i,
          /overview/i,
          /who we are/i,
          /our story/i
      ],
      contact: [
          /联系我们/i,
          /联系方式/i,
          /contact\s*us/i,
          /get\s+in\s+touch/i,
          /reach\s+us/i,
          /email\s+us/i,
          /support/i,
          /help/i,
          /address/i
      ],
      products: [
          /产品中心/i,
          /商品列表/i,
          /product\s+list/i,
          /products?/i,
          /catalog/i,
          /shop/i,
          /goods/i,
          /merchandise/i,
          /items/i
      ],
      services: [
          /服务/i,
          /解决方案/i,
          /solution/i,
          /service/i,
          /support/i,
          /business/i,
          /offerings/i,
          /what we do/i,
          /professional service/i
      ],
  };

  const usedRules = Object.keys(rules).length ? rules : defaultRules;

  // 获取当前页面的一级域名
  function getDomain(url) {
      const a = document.createElement('a');
      a.href = url;
      const host = a.hostname;
      const parts = host.split('.');
      return parts.length <= 2 ? host : parts.slice(-2).join('.');
  }

  // 判断是否为可疑链接（搜索引擎、参数过多、文章页等）
  function isSuspiciousLink(href) {
      const searchDomains = ['google.com/search', 'baidu.com/s', 'bing.com/search'];
      if (searchDomains.some(domain => href.includes(domain))) return true;

      try {
          const url = new URL(href);
          const paramCount = url.searchParams.size;
          if (paramCount > 4) return true;

          const badPathKeywords = ['/article', '/newsitem', '/topic', '/question', '/help/detail'];
          if (badPathKeywords.some(kw => url.pathname.toLowerCase().includes(kw))) return true;

          return false;
      } catch (e) {
          return true; // 解析失败也视为可疑
      }
  }

  const currentDomain = getDomain(location.href);
  const result = [];
  const seenHrefs = new Set();

  const anchors = container.querySelectorAll('a');

  for (const a of anchors) {
      const href = a.getAttribute('href')?.trim();
      if (!href) continue;

      let absoluteHref = href;

      // 转换相对路径为绝对路径
      if (!/^https?:\/\//i.test(href)) {
          try {
              absoluteHref = new URL(href, location.href).href;
          } catch (e) {
              continue;
          }
      }

      // 判断主域一致
      const linkDomain = getDomain(absoluteHref);
      if (linkDomain !== currentDomain) continue;

      // 判断是否为可疑链接
      if (isSuspiciousLink(absoluteHref)) continue;

      const text = a.textContent.trim().toLowerCase();

      // 匹配类型
      for (const type in usedRules) {
          const patterns = usedRules[type];

          for (const pattern of patterns) {
              const isMatch =
                  (typeof pattern === 'string' && (text.includes(pattern) || absoluteHref.includes(pattern))) ||
                  (pattern instanceof RegExp && (pattern.test(text) || pattern.test(absoluteHref)));

              if (isMatch && !seenHrefs.has(absoluteHref)) {
                  seenHrefs.add(absoluteHref);
                  result.push({
                      type,
                      name: text,
                    url: absoluteHref 
                  });
                  break; // 找到第一个匹配的类型就停止
              }
          }
      }
  }

  return result;
}