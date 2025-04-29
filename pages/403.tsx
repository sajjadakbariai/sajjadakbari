import React from 'react'
import { Result, Button } from 'antd'
import Link from 'next/link'

const ForbiddenPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <Result
        status="403"
        title="403"
        subTitle="متاسفیم، شما دسترسی به این صفحه را ندارید."
        extra={
          <Link href="/">
            <Button type="primary">بازگشت به صفحه اصلی</Button>
          </Link>
        }
      />
    </div>
  )
}

export default ForbiddenPage
