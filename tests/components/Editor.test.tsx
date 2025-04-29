import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import MarkdownEditor from '@/components/common/Editor/MarkdownEditor'

describe('MarkdownEditor', () => {
  it('should call onChange when content changes', () => {
    const mockOnChange = jest.fn()
    const { container } = render(
      <MarkdownEditor value="" onChange={mockOnChange} />
    )

    const textarea = container.querySelector('.rc-md-editor textarea')
    if (textarea) {
      fireEvent.change(textarea, { target: { value: 'New content' } })
    }

    expect(mockOnChange).toHaveBeenCalledWith('New content')
  })
})
