import React from 'react'
import { Progress, Alert, List, Typography } from 'antd'
import { SEOAnalysisResult } from '@/types/seo'

const { Text } = Typography

interface SEOAnalysisProps {
  data: SEOAnalysisResult
  loading?: boolean
}

const SEOAnalysis: React.FC<SEOAnalysisProps> = ({ data, loading }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">امتیاز کلی سئو</h3>
        <Progress
          percent={data.overallScore}
          status={data.overallScore > 75 ? 'success' : data.overallScore > 50 ? 'normal' : 'exception'}
          strokeColor={data.overallScore > 75 ? '#52c41a' : data.overallScore > 50 ? '#faad14' : '#f5222d'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-3">تحلیل عنوان</h4>
          <List
            itemLayout="horizontal"
            dataSource={[
              { label: 'طول عنوان', value: `${data.titleAnalysis.length} کاراکتر` },
              { label: 'امتیاز', value: `${data.titleAnalysis.score}/100` },
              { label: 'کلمه کلیدی', value: data.titleAnalysis.containsKeyword ? 'موجود' : 'مفقود' }
            ]}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={<Text type="secondary">{item.label}</Text>}
                  description={<Text strong>{item.value}</Text>}
                />
              </List.Item>
            )}
          />
        </div>

        <div>
          <h4 className="font-medium mb-3">پیشنهادات بهبود</h4>
          <List
            dataSource={data.suggestions}
            renderItem={(item, index) => (
              <List.Item>
                <Alert
                  message={item}
                  type={index === 0 ? 'warning' : 'info'}
                  showIcon
                />
              </List.Item>
            )}
          />
        </div>
      </div>
    </div>
  )
}

export default SEOAnalysis
