import axios, { AxiosError } from 'axios'

export const http = axios.create({ baseURL: '/api/v1', withCredentials: true })

export type ApiError = {
  status: number
  code: string
  title: string
  detail?: string
  traceId?: string
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const data = error.response?.data as Partial<ApiError> | undefined
    return {
      status: error.response?.status ?? 0,
      code: data?.code ?? 'UNEXPECTED_ERROR',
      title: data?.title ?? 'خطایی رخ داد',
      detail: data?.detail,
      traceId: data?.traceId,
    }
  }
  return { status: 0, code: 'UNEXPECTED_ERROR', title: 'خطایی رخ داد' }
}
