// components/common/Breadcrumb.tsx
import React from 'react'
import Link from 'next/link'
import { HomeOutlined } from '@ant-design/icons'

interface BreadcrumbItem {
  title: string | React.ReactNode
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <div className="flex items-center text-sm mb-6">
      <Link href="/admin">
        <a className="text-gray-500 hover:text-primary">
          <HomeOutlined />
        </a>
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <span className="mx-2 text-gray-400">/</span>
          {item.href ? (
            <Link href={item.href}>
              <a className="text-gray-500 hover:text-primary">
                {item.title}
              </a>
            </Link>
          ) : (
            <span className="text-primary">{item.title}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default Breadcrumb
