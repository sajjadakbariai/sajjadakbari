import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Button, Form, Input, Select, Card, Tabs, message } from 'antd'
import MarkdownEditor from '@/components/common/Editor/MarkdownEditor'
import SEOAnalysis from '@/components/common/SEOAnalyzer/SEOAnalysis'
import { getPostById, updatePost } from '@/services/posts'
import { getAllCategories } from '@/services/categories'

const { TabPane } = Tabs
const { TextArea } = Input
const { Option } = Select

interface PostFormValues {
  title: string
  slug: string
  content: string
  categoryId: string
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string
}

const PostEditPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.query
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [activeTab, setActiveTab] = useState('content')
  const [seoScore, setSeoScore] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [post, cats] = await Promise.all([
          getPostById(id as string),
          getAllCategories()
        ])
        
        form.setFieldsValue({
          ...post,
          categoryId: post.category.id
        })
        setCategories(cats)
        setSeoScore(post.seoScore || 0)
      } catch (error) {
        message.error('خطا در دریافت اطلاعات پست')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchData()
  }, [id, form])

  const handleSubmit = async (values: PostFormValues) => {
    try {
      setLoading(true)
      await updatePost(id as string, values)
      message.success('پست با موفقیت به‌روزرسانی شد')
    } catch (error) {
      message.error('خطا در به‌روزرسانی پست')
    } finally {
      setLoading(false)
    }
  }

  const handleContentChange = (content: string) => {
    form.setFieldsValue({ content })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card
        title="ویرایش پست"
        loading={loading}
        extra={
          <Button
            type="primary"
            onClick={() => form.submit()}
            loading={loading}
          >
            ذخیره تغییرات
          </Button>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="محتوای اصلی" key="content">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ content: '' }}
            >
              <div className="grid grid-cols-1 gap-6">
                <Form.Item
                  name="title"
                  label="عنوان پست"
                  rules={[{ required: true, message: 'عنوان پست الزامی است' }]}
                >
                  <Input size="large" />
                </Form.Item>

                <Form.Item
                  name="slug"
                  label="Slug"
                  rules={[{ required: true, message: 'Slug الزامی است' }]}
                >
                  <Input size="large" />
                </Form.Item>

                <Form.Item
                  name="categoryId"
                  label="دسته‌بندی"
                  rules={[{ required: true, message: 'انتخاب دسته‌بندی الزامی است' }]}
                >
                  <Select size="large">
                    {categories.map((cat) => (
                      <Option key={cat.id} value={cat.id}>
                        {cat.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="content"
                  label="محتوا"
                  rules={[{ required: true, message: 'محتوای پست الزامی است' }]}
                >
                  <MarkdownEditor
                    value={form.getFieldValue('content')}
                    onChange={handleContentChange}
                  />
                </Form.Item>
              </div>
            </Form>
          </TabPane>

          <TabPane tab="تنظیمات سئو" key="seo">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Form form={form} layout="vertical">
                  <Form.Item name="metaTitle" label="عنوان سئو (Meta Title)">
                    <Input />
                  </Form.Item>

                  <Form.Item 
                    name="metaDescription" 
                    label="توضیحات متا (Meta Description)"
                  >
                    <TextArea rows={4} />
                  </Form.Item>

                  <Form.Item name="metaKeywords" label="کلمات کلیدی">
                    <Input placeholder="کلمات کلیدی را با کاما جدا کنید" />
                  </Form.Item>
                </Form>
              </div>

              <div>
                <SEOAnalysis 
                  data={{
                    overallScore: seoScore,
                    titleAnalysis: {
                      length: form.getFieldValue('metaTitle')?.length || 0,
                      score: Math.min(100, ((form.getFieldValue('metaTitle')?.length || 0) * 1.5),
                      containsKeyword: true
                    },
                    suggestions: [
                      'عنوان سئو باید بین 40-60 کاراکتر باشد',
                      'کلمه کلیدی اصلی را در پاراگراف اول استفاده کنید'
                    ]
                  }} 
                />
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default PostEditPage
