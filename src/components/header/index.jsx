import { Avatar } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import './index.scss'

const Header = () => {
  const user = {
    avatar: 'https://gw.alipayobjects.com/zos/rmsportal/BiazfanxmamNRoxxVxka.png',
    name: 'John Doe',
  }
  const onLogoClick = () => {
    window.open('https://www.haoyuai.com', '_blank')
  }
  const onAvatarClick = () => {
    window.open('https://www.haoyuai.com', '_blank')
  }
  return (
    <div className="card-header">
      <div className="logo-wrapper" onClick={onLogoClick}>
        <div className="logo"></div>
        <span>好雨AI-更懂外贸的AI</span>
      </div>

      <div className="avatar-wrapper" onClick={onAvatarClick}>
        {user ? (
          user.avatar ? (
            <Avatar src={user.avatar} />
          ) : (
            <Avatar style={{ backgroundColor: '#1890ff' }}>
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
          )
        ) : (
          <Avatar icon={<UserOutlined />} />
        )}
      </div>
    </div>
  )
}

export default Header
