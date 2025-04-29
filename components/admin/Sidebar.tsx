import React from 'react'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  FolderOutlined,
  BarChartOutlined,
  SettingOutlined,
  AuditOutlined
} from '@ant-design/icons'
import Link from 'next/link'
import { useRouter } from 'next/router'

const { Sider } = Layout

const AdminSidebar: React.FC = () => {
  const router = useRouter()

  return (
    <Sider width={250} className="h-screen fixed left-0 top-0">
      <div className="h-16 flex items-center justify-center bg-white">
        <h1 className="text-xl font-bold text-primary">پنل مدیریت</h1>
      </div>
      
      <Menu
        theme="light"
        mode="inline"
        defaultSelectedKeys={[router.pathname]}
        className="pt-4"
      >
        <Menu.Item key="/admin" icon={<DashboardOutlined />}>
          <Link href="/admin">داشبورد</Link>
        </Menu.Item>
        
        <Menu.SubMenu 
          key="posts" 
          icon={<FileTextOutlined />} 
          title="مطالب"
        >
          <Menu.Item key="/admin/posts">
            <Link href="/admin/posts">همه مطالب</Link>
          </Menu.Item>
          <Menu.Item key="/admin/posts/new">
            <Link href="/admin/posts/new">مطلب جدید</Link>
          </Menu.Item>
        </Menu.SubMenu>
        
        <Menu.Item key="/admin/categories" icon={<FolderOutlined />}>
          <Link href="/admin/categories">دسته‌بندی‌ها</Link>
        </Menu.Item>
        
        <Menu.SubMenu 
          key="seo" 
          icon={<BarChartOutlined />} 
          title="سئو"
        >
          <Menu.Item key="/admin/seo/analyzer">
            <Link href="/admin/seo/analyzer">تحلیلگر سئو</Link>
          </Menu.Item>
          <Menu.Item key="/admin/seo/audit">
            <Link href="/admin/seo/audit">ممیزی سئو</Link>
          </Menu.Item>
        </Menu.SubMenu>
        
        <Menu.Item key="/admin/settings" icon={<SettingOutlined />}>
          <Link href="/admin/settings">تنظیمات</Link>
        </Menu.Item>
      </Menu>
    </Sider>
  )
}

export default AdminSidebar
