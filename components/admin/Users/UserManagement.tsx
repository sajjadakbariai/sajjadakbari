// components/admin/Users/UserManagement.tsx
import React, { useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, message } from 'antd'
import { User, UserRole } from '@/types/user'
import { useSession } from 'next-auth/react'

const { Option } = Select

interface UserManagementProps {
  users: User[]
  loading: boolean
  onRefresh: () => void
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  loading,
  onRefresh
}) => {
  const [form] = Form.useForm()
  const [visible, setVisible] = useState(false)
  const { data: session } = useSession()

  const columns = [
    {
      title: 'نام',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'ایمیل',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'نقش',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => (
        <Tag color={role === 'ADMIN' ? 'red' : 'blue'}>
          {role === 'ADMIN' ? 'مدیر' : 'نویسنده'}
        </Tag>
      )
    }
  ]

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">مدیریت کاربران</h2>
        <Button 
          type="primary" 
          onClick={() => setVisible(true)}
          disabled={session?.user.role !== 'ADMIN'}
        >
          کاربر جدید
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={users} 
        loading={loading}
        rowKey="id"
      />

      <Modal
        title="افزودن کاربر جدید"
        visible={visible}
        onCancel={() => setVisible(false)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            try {
              // API call to add user
              message.success('کاربر با موفقیت اضافه شد')
              setVisible(false)
              onRefresh()
            } catch (error) {
              message.error('خطا در اضافه کردن کاربر')
            }
          }}
        >
          <Form.Item
            name="name"
            label="نام کامل"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="ایمیل"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="role"
            label="نقش"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="AUTHOR">نویسنده</Option>
              <Option value="ADMIN">مدیر</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagement
