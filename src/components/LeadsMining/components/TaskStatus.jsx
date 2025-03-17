import React from 'react'
import { Card, Progress, Tag, Button, Alert } from 'antd'

/**
 * 任务状态组件
 * 显示任务的执行状态和控制按钮
 */
const TaskStatus = ({
  taskStatus,
  progress,
  currentSearchTerm,
  discoveredEmails,
  currentPage,
  captchaDetected,
  statusMessage,
  startTask,
  pauseTask,
  resumeTask,
  stopTask,
  fetchTaskList,
}) => {
  return (
    <Card title="任务状态" bordered={false} style={{ marginBottom: 16 }}>
      <Progress percent={progress} status={taskStatus === 'error' ? 'exception' : undefined} />

      <div
        style={{
          marginTop: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Tag color="blue">当前搜索: {currentSearchTerm || '未开始'}</Tag>
          <Tag color="green">已发现邮箱: {discoveredEmails}</Tag>
          <Tag color="orange">当前页数: {currentPage}</Tag>
        </div>

        <div>
          {taskStatus === 'idle' && (
            <Button type="primary" onClick={startTask}>
              开始任务
            </Button>
          )}

          {taskStatus === 'running' && (
            <Button type="primary" danger onClick={pauseTask}>
              暂停任务
            </Button>
          )}

          {taskStatus === 'paused' && (
            <Button type="primary" onClick={resumeTask}>
              继续任务
            </Button>
          )}

          {(taskStatus === 'running' || taskStatus === 'paused') && (
            <Button danger style={{ marginLeft: 8 }} onClick={stopTask}>
              停止任务
            </Button>
          )}

          <Button style={{ marginLeft: 8 }} onClick={fetchTaskList}>
            刷新任务
          </Button>
        </div>
      </div>

      {statusMessage && (
        <Alert
          message={statusMessage}
          type={taskStatus === 'error' ? 'error' : 'info'}
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      {captchaDetected && (
        <Alert
          message="检测到验证码"
          description="请完成验证码验证后点击继续任务按钮"
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  )
}

export default TaskStatus
