import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import 'react-markdown-editor-lite/lib/index.css'

const MdEditor = dynamic(() => import('react-markdown-editor-lite'), {
  ssr: false
})

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onImageUpload?: (file: File) => Promise<string>
  height?: number
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  onImageUpload,
  height = 500
}) => {
  const [content, setContent] = useState(value)

  useEffect(() => {
    setContent(value)
  }, [value])

  const handleEditorChange = ({ text }: { text: string }) => {
    setContent(text)
    onChange(text)
  }

  const customRenderHTML = (text: string) => {
    return <div dangerouslySetInnerHTML={{ __html: text }} />
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <MdEditor
        value={content}
        style={{ height: `${height}px` }}
        onChange={handleEditorChange}
        onImageUpload={onImageUpload}
        renderHTML={customRenderHTML}
        config={{
          view: {
            menu: true,
            md: true,
            html: true,
            fullScreen: true,
            hideMenu: false
          },
          imageUrl: '/api/upload'
        }}
      />
    </div>
  )
}

export default MarkdownEditor
