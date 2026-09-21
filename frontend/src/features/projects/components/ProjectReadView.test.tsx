import { render, screen } from '@testing-library/react'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProject } from '../hooks/useProject'
import { ProjectReadView } from './ProjectReadView'

vi.mock('../hooks/useProject', () => ({ useProject: vi.fn() }))

const projectQuery = vi.mocked(useProject)

describe('ProjectReadView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('announces the loading state', () => {
    projectQuery.mockReturnValue({ isPending: true } as ReturnType<typeof useProject>)
    render(<ProjectReadView projectId="00000000-0000-0000-0000-000000000001" />)
    expect(screen.getByRole('status')).toHaveTextContent('در حال دریافت پروژه')
  })

  it('shows ownership-safe not found copy', () => {
    const error = new AxiosError('not found')
    Object.assign(error, { response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND' } } })
    projectQuery.mockReturnValue(
      { isPending: false, isError: true, error } as unknown as ReturnType<typeof useProject>,
    )
    render(<ProjectReadView projectId="00000000-0000-0000-0000-000000000001" />)
    expect(screen.getByRole('status')).toHaveTextContent('پروژه پیدا نشد')
  })

  it('renders the generated Project contract', () => {
    projectQuery.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        id: '00000000-0000-0000-0000-000000000001',
        title: 'پروژه آزمایشی',
        description: 'شرح کوتاه',
        targetDate: null,
        reviewDate: '2026-10-01',
        version: 1,
        createdAt: '2026-09-20T00:00:00Z',
        updatedAt: '2026-09-20T00:00:00Z',
      },
    } as unknown as ReturnType<typeof useProject>)
    render(<ProjectReadView projectId="00000000-0000-0000-0000-000000000001" />)
    expect(screen.getByRole('heading', { name: 'پروژه آزمایشی' })).toBeInTheDocument()
    expect(screen.getByText('2026-10-01')).toBeInTheDocument()
  })
})
