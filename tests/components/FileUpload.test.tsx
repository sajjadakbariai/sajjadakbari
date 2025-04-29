import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import FileUpload from '@/components/common/FileUpload'

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true, url: '/uploads/test.jpg' })
  })
) as jest.Mock

describe('FileUpload Component', () => {
  it('should call onSuccess after upload', async () => {
    const mockSuccess = jest.fn()
    const { getByText } = render(
      <FileUpload onSuccess={mockSuccess} />
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = getByText('آپلود فایل').previousSibling as HTMLInputElement

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith('/uploads/test.jpg')
    })
  })
})
