import React, { useState } from 'react'
import { Upload, Button, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

interface FileUploadProps {
  onSuccess: (url: string) => void
  accept?: string
}

const FileUpload: React.FC<FileUploadProps> = ({ onSuccess, accept }) => {
  const [loading, setLoading] = useState(false)

  const handleUpload = async (file: File) => {
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        onSuccess(data.url)
        message.success('فایل با موفقیت آپلود شد')
      }
    } catch (error) {
      message.error('خطا در آپلود فایل')
    } finally {
      setLoading(false)
    }
    return false
  }

  return (
    <Upload
      accept={accept}
      beforeUpload={handleUpload}
      showUploadList={false}
      disabled={loading}
    >
      <Button icon={<UploadOutlined />} loading={loading}>
        آپلود فایل
      </Button>
    </Upload>
  )
}

export default FileUpload
