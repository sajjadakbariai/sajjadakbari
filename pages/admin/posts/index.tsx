import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Input, Card, Tag, message } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { getPosts } from '@/services/posts'
import { useSession } from 'next-auth/react'

const { Search } = Input

const PostsPage: React.FC = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })
  const { data: session } = useSession()

  const columns = [
    {
      title: 'عنوان',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: any) => (
        <Link href={`/admin/posts/${record.id}`}>{text}</Link>
      )
    },
    {
      title: 'دسته‌بندی',
      dataIndex: 'category',
      key: 'category',
      render: (category: any) => category.name
    },
    {
      title: 'وضعیت',
      dataIndex: 'published',
      key: 'published',
      render: (published: boolean) => (
        <Tag color={published ? 'green' : 'orange'}>
          {published ? 'منتشر شده' : 'پیش‌نویس'}
        </Tag>
      )
    },
    {
      title: 'عملیات',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Link href={`/admin/posts/${record.id}`}>
            <Button size="small">ویرایش</Button>
          </Link>
        </Space>
      )
    }
  ]

  const fetchPosts = async (params: any = {}) => {
    try {
      setLoading(true)
      const { data, meta } = await getPosts({
        page: params.current || pagination.current,
        pageSize: params.pageSize || pagination.pageSize,
        search: params.search
      })
      setPosts(data)
      setPagination({
        ...pagination,
        total: meta.total,
        current: meta.currentPage
      })
    } catch (error) {
      message.error('خطا در دریافت پست‌ها')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <Card
        title="مدیریت پست‌ها"
        extra={
          session?.user.role === 'ADMIN' && (
            <Link href="/admin/posts/new">
              <Button type="primary" icon={<PlusOutlined />}>
                پست جدید
              </Button>
            </Link>
          )
        }
      >
        <div className="mb-4">
          <Search
            placeholder="جستجو در پست‌ها"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={(value) => fetchPosts({ search: value })}
          />
        </div>
        
        <Table
          columns={columns}
          dataSource={posts}
          loading={loading}
          pagination={pagination}
          onChange={fetchPosts}
          rowKey="id"
        />
      </Card>
    </div>
  )
}

export default PostsPage
