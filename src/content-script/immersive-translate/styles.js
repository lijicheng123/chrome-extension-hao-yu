// 沉浸式翻译样式 - HaoYu命名空间
export const immersiveTranslateStyles = `
/* 基础翻译容器样式 */
.haoyu-immersive-translate-container {
  margin: 4px 0;
  border-left: 3px solid #4CAF50;
  padding-left: 8px;
}

/* 内联翻译容器样式 */
.haoyu-immersive-translate-container[data-translating],
.haoyu-immersive-translate-container[data-translated] {
  display: inline;
  margin: 0;
  border: none;
  padding: 0;
  background: none;
}

.haoyu-immersive-translate-loading {
  border-left-color: #1890ff;
}

/* 内联模式的loading样式 */
span.haoyu-immersive-translate-loading {
  border: none;
}

.haoyu-immersive-translate-original {
  color: #666;
  font-size: 0.9em;
  margin-bottom: 2px;
  opacity: 0.8;
}

/* 内联模式的原文样式 */
.haoyu-immersive-translate-original.haoyu-inline {
  display: inline;
  margin: 0;
  font-size: 0.85em;
  background: rgba(102, 102, 102, 0.1);
  padding: 1px 3px;
  border-radius: 2px;
}

.haoyu-immersive-translate-translated {
  color: #333;
  font-weight: 500;
}

/* 内联模式的翻译文本样式 */
.haoyu-immersive-translate-translated.haoyu-inline {
  display: inline;
  margin: 0;
  background: rgba(76, 175, 80, 0.1);
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: 500;
}

/* 翻译分隔符样式 */
.haoyu-translate-separator {
  color: #999;
  font-size: 0.8em;
  margin: 0 2px;
  font-weight: normal;
}

/* 加载状态样式 */
.haoyu-immersive-translate-loading-text {
  color: #1890ff;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 内联模式的加载文本样式 */
.haoyu-immersive-translate-loading-text.haoyu-inline {
  display: inline;
  background: rgba(24, 144, 255, 0.1);
  padding: 1px 3px;
  border-radius: 2px;
}

.haoyu-loading-dots {
  font-size: 14px;
}

.haoyu-dots {
  font-size: 16px;
  animation: haoyu-loading-dots 1.5s infinite;
}

@keyframes haoyu-loading-dots {
  0%, 20% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* 面板容器样式 */
.haoyu-immersive-translate-panel-container,
.haoyu-immersive-translate-result-container {
  position: fixed !important;
  z-index: 2147483647 !important;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 翻译控制面板样式 */
.haoyu-immersive-translate-panel {
  padding: 16px;
  width: 320px;
  max-width: 90vw;
}

.haoyu-translate-result-panel {
  padding: 16px;
  width: 400px;
  max-width: 90vw;
}

/* 面板头部样式 */
.haoyu-panel-header,
.haoyu-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

/* 面板内容样式 */
.haoyu-panel-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.haoyu-result-content {
  margin-bottom: 12px;
}

/* 翻译结果文本样式 */
.haoyu-original-text,
.haoyu-translated-text {
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 4px;
}

.haoyu-original-text {
  background: #f5f5f5;
}

.haoyu-translated-text {
  background: #e8f5e8;
}

/* 控制项样式 */
.haoyu-control-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.haoyu-control-item span {
  font-weight: 500;
}

/* 操作按钮样式 */
.haoyu-control-actions,
.haoyu-result-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

/* 提示词编辑器样式 */
.haoyu-prompt-editor {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
}

.haoyu-prompt-templates {
  margin-bottom: 8px;
}

.haoyu-template-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.haoyu-template-buttons button {
  font-size: 11px !important;
  height: 24px !important;
  padding: 0 8px !important;
}

/* 提示词文本域样式 */
.haoyu-prompt-textarea {
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 6px;
  font-size: 12px;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}

.haoyu-prompt-textarea:focus {
  border-color: #1890ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* 提示词预览样式 */
.haoyu-prompt-preview {
  margin-top: 8px;
  font-size: 11px;
  color: #666;
  background: #fff;
  padding: 4px 6px;
  border-radius: 3px;
  border: 1px solid #e0e0e0;
}

/* 高优先级message容器样式 */
#haoyu-message-container {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 2147483647 !important;
  pointer-events: none !important;
}

/* 确保message内容可以交互 */
#haoyu-message-container .ant-message {
  pointer-events: auto !important;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .haoyu-immersive-translate-panel,
  .haoyu-translate-result-panel {
    width: 90vw;
    max-width: none;
  }
  
  .haoyu-control-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .haoyu-template-buttons {
    justify-content: flex-start;
  }
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .haoyu-immersive-translate-panel-container,
  .haoyu-immersive-translate-result-container {
    background: #1f1f1f;
    border-color: #333;
    color: #fff;
  }
  
  .haoyu-panel-header,
  .haoyu-result-header {
    border-bottom-color: #333;
  }
  
  .haoyu-original-text {
    background: #2a2a2a;
  }
  
  .haoyu-translated-text {
    background: #1a3a1a;
  }
  
  .haoyu-prompt-editor {
    background: #2a2a2a;
    border-color: #333;
  }
  
  .haoyu-prompt-preview {
    background: #1f1f1f;
    border-color: #333;
  }
}
` 