import PropTypes from 'prop-types'
import { Progress, Tag, Alert, Typography } from 'antd'
const { Text } = Typography
/**
 * 任务状态组件
 * 显示任务的执行状态和控制按钮
 */
const TaskStatus = ({
  taskStatus,
  progress,
  currentSearchTerm,
  discoveredEmails,
  captchaDetected,
  statusMessage,
}) => {
  return (
    <div
      style={{
        marginTop: 12,
      }}
    >
      {statusMessage && (
        <Text type={taskStatus === 'error' ? 'error' : 'info'} ellipsis={{ rows: 1 }}>
          {statusMessage}
        </Text>
      )}
      <Progress percent={progress} status={taskStatus === 'error' ? 'exception' : undefined} />
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Tag color="blue">当前搜索: {currentSearchTerm || '未开始'}</Tag>
          <Tag color="green">已发现邮箱: {discoveredEmails}</Tag>
          {/* <Tag color="orange">当前页数: {currentPage}</Tag> */}
        </div>
      </div>
      {captchaDetected && (
        <Alert
          message="检测到验证码"
          description="请完成验证码验证后点击继续任务按钮"
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  )
}

export default TaskStatus

TaskStatus.propTypes = {
  taskStatus: PropTypes.string,
  progress: PropTypes.number,
  currentSearchTerm: PropTypes.string,
  discoveredEmails: PropTypes.number,
  captchaDetected: PropTypes.bool,
  statusMessage: PropTypes.string,
}
