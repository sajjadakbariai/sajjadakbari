import React, { useState } from 'react'
import { Button, Card, Input, Form, Tabs, Select } from 'antd'
import SEOAnalysis from '@/components/common/SEOAnalyzer/SEOAnalysis'
import { analyzeContent } from '@/services/seo'

const { TextArea } = Input
const { TabPane } = Tabs
const { Option } = Select

const SEOAnalyzerPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleAnalyze = async (values: any) => {
    try {
      setLoading(true)
      const analysis = await analyzeContent(values)
      setResult(analysis)
    } catch (error) {
      console.error('Analysis error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card title="تحلیلگر سئو">
        <Tabs defaultActiveKey="1">
          <TabPane tab="تحلیل محتوا" key="1">
            <Form form={form} onFinish={handleAnalyze} layout="vertical">
              <div className="grid grid-cols-1 gap-6">
                <Form.Item name="title" label="عنوان">
                  <Input size="large" />
                </Form.Item>

                <Form.Item name="content" label="محتوا">
                  <TextArea rows={10} />
                </Form.Item>

                <Form.Item name="keywords" label="کلمات کلیدی">
                  <Input placeholder="کلمات کلیدی را با کاما جدا کنید" />
                </Form.Item>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    size="large"
                  >
                    تحلیل سئو
                  </Button>
                </Form.Item>
              </div>
            </Form>

            {result && (
              <div className="mt-8">
                <SEOAnalysis data={result} />
              </div>
            )}
          </TabPane>

          <TabPane tab="تحلیل URL" key="2">
            <Form form={form} onFinish={handleAnalyze} layout="vertical">
              <div className="grid grid-cols-1 gap-6">
                <Form.Item 
                  name="url" 
                  label="آدرس URL"
                  rules={[{ required: true, message: 'آدرس URL الزامی است' }]}
                >
                  <Input size="large" placeholder="https://example.com" />
                </Form.Item>

                <Form.Item name="device" label="دستگاه" initialValue="desktop">
                  <Select size="large">
                    <Option value="desktop">دسکتاپ</Option>
                    <Option value="mobile">موبایل</Option>
                  </Select>
                </Form.Item>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    size="large"
                  >
                    تحلیل URL
                  </Button>
                </Form.Item>
              </div>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default SEOAnalyzerPage
