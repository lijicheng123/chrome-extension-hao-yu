import React from 'react'
import { Modal, Input } from 'antd'

/**
 * 邮箱编辑模态框组件
 * 用于编辑邮箱信息
 */
const EmailEditModal = ({
  editingEmail,
  newEmailValue,
  newNoteValue,
  setNewEmailValue,
  setNewNoteValue,
  handleUpdateEmail,
  setEditingEmail,
}) => {
  return (
    <Modal
      title="编辑邮箱"
      open={!!editingEmail}
      onOk={handleUpdateEmail}
      onCancel={() => setEditingEmail(null)}
    >
      <Input
        value={newEmailValue}
        onChange={(e) => setNewEmailValue(e.target.value)}
        placeholder="输入新的邮箱地址"
      />
      <Input
        value={newNoteValue}
        onChange={(e) => setNewNoteValue(e.target.value)}
        placeholder="输入备注"
        style={{ marginTop: 10 }}
      />
    </Modal>
  )
}

export default EmailEditModal
