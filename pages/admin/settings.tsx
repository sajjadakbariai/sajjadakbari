// pages/admin/settings.tsx
import React, { useState } from 'react'
import { Card, Form, Input, Button, message, Tabs } from 'antd'
import { updateSettings } from '@/services/settings'
import { useSession } from 'next-auth/react'

const { TabPane } = Tabs
const { TextArea } = Input

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { data: session } = useSession()

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      await updateSettings(values)
      message.success('تنظیمات با موفقیت ذخیره شد')
    } catch (error) {
      message.error('خطا در ذخیره تنظیمات')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card title="تنظیمات سیستم">
        <Tabs defaultActiveKey="1">
          <TabPane tab="عمومی" key="1">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{}}
            >
              <Form.Item
                name="siteTitle"
                label="عنوان سایت"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="siteDescription"
                label="توضیحات سایت"
              >
                <TextArea rows={4} />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  disabled={session?.user.role !== 'ADMIN'}
                >
                  ذخیره تغییرات
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="سئو" key="2">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{}}
            >
              <Form.Item
                name="metaTitle"
                label="عنوان پیش‌فرض سئو"
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="metaDescription"
                label="توضیحات پیش‌فرض متا"
              >
                <TextArea rows={4} />
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default SettingsPage
