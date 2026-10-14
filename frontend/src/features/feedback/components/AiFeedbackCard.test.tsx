import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { answerAiFeedback, closeAiFeedback, requestAiFeedbackPrompt } from '../services/feedback-api'
import { AiFeedbackCard } from './AiFeedbackCard'

vi.mock('../services/feedback-api', () => ({
  requestAiFeedbackPrompt: vi.fn(), answerAiFeedback: vi.fn(), closeAiFeedback: vi.fn(),
}))

const promptId = '00000000-0000-0000-0000-0000000000f1'
const draftId = '00000000-0000-0000-0000-0000000000d1'
const question = 'از پیش‌نویسی که کنار گذاشتید چقدر راضی بودید؟'

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><AiFeedbackCard surface="PLANNING_DRAFT" subjectId={draftId} /></QueryClientProvider>)
}

describe('AiFeedbackCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requestAiFeedbackPrompt).mockResolvedValue({ promptId, instrumentVersion: 1 })
    vi.mocked(answerAiFeedback).mockResolvedValue()
    vi.mocked(closeAiFeedback).mockResolvedValue()
  })

  it('shows nothing when the server does not ask about this response', async () => {
    vi.mocked(requestAiFeedbackPrompt).mockResolvedValue({ promptId: null, instrumentVersion: 1 })
    const { container } = renderCard()
    await waitFor(() => expect(requestAiFeedbackPrompt).toHaveBeenCalledWith('PLANNING_DRAFT', draftId))
    expect(container).toBeEmptyDOMElement()
  })

  it('records a good rating at once, with no reason asked', async () => {
    renderCard()
    expect(await screen.findByRole('heading', { name: question })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'خوب' }))
    await waitFor(() => expect(answerAiFeedback).toHaveBeenCalledWith(promptId, 4, null))
    expect(await screen.findByText('ممنون؛ پاسخ شما ثبت شد.')).toBeInTheDocument()
    expect(screen.queryByLabelText(/چه چیزی خوب نبود/)).not.toBeInTheDocument()
  })

  it('opens an optional reason for a low rating and sends it trimmed, or without text', async () => {
    renderCard()
    fireEvent.click(await screen.findByRole('button', { name: 'ضعیف' }))
    expect(answerAiFeedback).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'ضعیف' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText(/چه چیزی خوب نبود/), { target: { value: '  کارها خیلی زیاد بودند  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'ارسال' }))
    await waitFor(() => expect(answerAiFeedback).toHaveBeenCalledWith(promptId, 2, 'کارها خیلی زیاد بودند'))
  })

  it('sends a low rating without a reason when the field is left empty', async () => {
    renderCard()
    fireEvent.click(await screen.findByRole('button', { name: 'بد' }))
    fireEvent.click(screen.getByRole('button', { name: 'ارسال' }))
    await waitFor(() => expect(answerAiFeedback).toHaveBeenCalledWith(promptId, 1, null))
  })

  it('closing records no rating and removes the card', async () => {
    renderCard()
    fireEvent.click(await screen.findByRole('button', { name: 'بستن پرسش' }))
    await waitFor(() => expect(closeAiFeedback).toHaveBeenCalledWith(promptId))
    await waitFor(() => expect(screen.queryByRole('heading', { name: question })).not.toBeInTheDocument())
    expect(answerAiFeedback).not.toHaveBeenCalled()
  })
})
