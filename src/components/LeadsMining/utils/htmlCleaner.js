import { Parser } from 'htmlparser2';
import { DomHandler } from 'domhandler';

/**
 * 清理和简化HTML文本，使其适合作为大语言模型的输入
 * @param {string} htmlString - 输入的HTML字符串
 * @returns {string} 清理后的纯文本
 */
export function cleanAndSimplifyHtml(htmlString) {
  try {
    // 使用htmlparser2解析HTML
    const handler = new DomHandler({
      normalizeWhitespace: true,
      withStartIndices: true,
      withEndIndices: true
    });
    
    const parser = new Parser(handler, {
      decodeEntities: true,
      lowerCaseTags: true,
      lowerCaseAttributeNames: true,
      recognizeSelfClosing: true,
      recognizeCDATA: false
    });
    
    parser.write(htmlString);
    parser.end();
    
    // 获取解析后的DOM树
    const dom = handler.dom;

    // 需要完全移除的标签
    const removeTags = [
      'script', 'style', 'head', 'meta', 'link', 'title', 'noscript',
      'form', 'input', 'button', 'textarea', 'select', 'option',
      'tongyi-web-extension'
    ];

    // 需要保留的标签
    const keepTags = [
      'p', 'div', 'span', 'a', 'strong', 'b', 'em', 'i', 'u', 'br',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'table',
      'tr', 'td', 'th', 'thead', 'tbody'
    ];

    // 需要跳过的特定元素
    const skipElements = [
      { class: 'chatgptbox-toolbar-container-not-queryable' },
      { id: 'chatgptbox-sidebar-container' }
    ];

    // 检查元素是否应该被跳过
    const shouldSkipElement = (node) => {
      if (node.type !== 'tag' || !node.attribs) return false;
      
      return skipElements.some(skip => {
        if (skip.class && node.attribs.class === skip.class) return true;
        if (skip.id && node.attribs.id === skip.id) return true;
        return false;
      });
    };

    // 简化嵌套的div结构
    const simplifyNestedDivs = (nodes) => {
      if (!Array.isArray(nodes)) return;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        if (node.type === 'tag' && node.name === 'div') {
          // 检查是否只有div子元素
          const hasOnlyDivChildren = node.children?.every(child => 
            child.type === 'tag' && child.name === 'div'
          );

          // 检查是否只有文本节点
          const hasOnlyTextChildren = node.children?.every(child => 
            child.type === 'text' || (child.type === 'tag' && child.name === 'div')
          );

          // 如果div只包含其他div或文本，且没有特殊属性，则合并其内容
          if ((hasOnlyDivChildren || hasOnlyTextChildren) && 
              (!node.attribs || Object.keys(node.attribs).length === 0)) {
            // 将子节点提升到当前层级
            if (node.children) {
              nodes.splice(i, 1, ...node.children);
              i--; // 重新检查当前位置
            }
          }
        }

        // 递归处理子节点
        if (node.children) {
          simplifyNestedDivs(node.children);
        }
      }
    };

    // 递归移除不需要的标签
    const removeUnwantedTags = (nodes) => {
      if (!Array.isArray(nodes)) return;
      
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        
        // 如果是标签节点
        if (node.type === 'tag') {
          // 检查是否需要跳过
          if (shouldSkipElement(node)) {
            nodes.splice(i, 1);
            continue;
          }

          // 检查是否需要移除
          if (removeTags.includes(node.name)) {
            nodes.splice(i, 1);
            continue;
          }
          
          // 处理iframe
          if (node.name === 'iframe') {
            const iframeDesc = node.attribs?.title || 
                             node.attribs?.name || 
                             node.attribs?.id || 
                             '嵌入式内容';
            nodes[i] = {
              type: 'text',
              data: `[${iframeDesc}]`
            };
            continue;
          }
          
          // 处理属性
          if (node.attribs) {
            const id = node.attribs.id;
            // 保留id和href属性
            const keepAttrs = {};
            if (id) keepAttrs.id = id;
            if (node.name === 'a' && node.attribs.href) {
              keepAttrs.href = node.attribs.href;
            }
            node.attribs = keepAttrs;
          }
          
          // 递归处理子节点
          if (node.children) {
            removeUnwantedTags(node.children);
          }
        }
      }
    };

    // 执行清理
    removeUnwantedTags(dom);
    // 简化嵌套的div结构
    simplifyNestedDivs(dom);

    // 提取文本内容，保留基本HTML结构
    const extractText = (nodes) => {
      if (!Array.isArray(nodes)) return '';
      
      return nodes.map(node => {
        // 处理文本节点
        if (node.type === 'text') {
          return node.data.trim();
        }
        
        // 处理标签节点
        if (node.type === 'tag') {
          // 检查是否需要跳过
          if (shouldSkipElement(node)) {
            return '';
          }

          let text = '';
          
          // 添加id信息
          if (node.attribs?.id) {
            text += `[${node.attribs.id}]`;
          }
          
          // 处理特殊标签
          if (/^h[1-6]$/i.test(node.name)) {
            text += '\n\n';
          } else if (node.name === 'li') {
            text += '\n• ';
          } else if (node.name === 'p' || node.name === 'br') {
            text += '\n';
          } else if (node.name === 'a' && node.attribs?.href) {
            // 保留链接文本和URL
            text += `[链接:${node.attribs.href}]`;
          }
          
          // 处理子节点
          if (node.children) {
            const childText = extractText(node.children);
            // 对于需要保留结构的标签，添加适当的标记
            if (keepTags.includes(node.name)) {
              text += `<${node.name}>${childText}</${node.name}>`;
            } else {
              text += childText;
            }
          }
          
          return text;
        }
        
        return '';
      }).join(' ');
    };

    let cleanedText = extractText(dom);

    // 清理文本
    cleanedText = cleanedText
      // 移除多余空白
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    // 合并短句
    cleanedText = cleanedText
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.length > 0)
      .map(sentence => sentence.trim())
      .join('. ');

    // 限制输出长度
    if (cleanedText.length > 8000) {
      const truncated = cleanedText.substring(0, 8000);
      const lastPeriod = truncated.lastIndexOf('.');
      return truncated.substring(0, lastPeriod + 1);
    }

    return cleanedText;
  } catch (error) {
    console.error('HTML清理过程中出现错误:', error);
    // 发生错误时返回一个安全的降级处理结果
    return htmlString
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000);
  }
}

/**
 * 从当前页面提取清理后的文本
 * @returns {string} 清理后的页面文本
 */
export function getCleanedPageText() {
  try {
    return cleanAndSimplifyHtml(document.documentElement.outerHTML);
  } catch (error) {
    console.error('获取页面文本时出现错误:', error);
    // 降级处理：直接获取body文本
    return document.body.innerText.substring(0, 8000);
  }
} 