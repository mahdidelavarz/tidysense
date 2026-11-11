import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as api from '../services/auth-api'
import { LoginScreen } from './LoginScreen'

jest.mock('../services/auth-api')
const mocked = jest.mocked(api)

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  )
}

describe('LoginScreen', () => {
  beforeEach(() => jest.resetAllMocks())

  it('refuses a number that is not an Iranian mobile', async () => {
    await render(wrap(<LoginScreen />))
    await fireEvent.changeText(screen.getByTestId('phone-input'), '12345')
    await fireEvent.press(screen.getByTestId('phone-submit'))
    expect(await screen.findByText('شماره موبایل معتبر وارد کنید.')).toBeTruthy()
    expect(mocked.requestOtp).not.toHaveBeenCalled()
  })

  it('sends the code, shows the development code, and signs in', async () => {
    mocked.requestOtp.mockResolvedValue({ retryAfterSeconds: 60 })
    mocked.getDevelopmentOtp.mockResolvedValue('1234')
    mocked.verifyOtp.mockResolvedValue({ phoneNumber: '+989121234567' } as Awaited<ReturnType<typeof api.verifyOtp>>)
    await render(wrap(<LoginScreen />))

    await fireEvent.changeText(screen.getByTestId('phone-input'), '09121234567')
    await fireEvent.press(screen.getByTestId('phone-submit'))
    expect(await screen.findByText('کد را وارد کنید')).toBeTruthy()
    expect(await screen.findByTestId('dev-otp')).toHaveTextContent('1234')
    expect(screen.getByText('ارسال دوباره تا ۶۰ ثانیه')).toBeTruthy()

    await fireEvent.changeText(screen.getByTestId('code-input'), '12a34')
    await fireEvent.press(screen.getByTestId('code-submit'))
    expect(mocked.verifyOtp).toHaveBeenCalledWith('09121234567', '1234')
  })

  it('says when the code is wrong', async () => {
    mocked.requestOtp.mockResolvedValue({ retryAfterSeconds: 0 })
    mocked.getDevelopmentOtp.mockRejectedValue(new Error('no dev endpoint'))
    mocked.verifyOtp.mockRejectedValue(new Error('401'))
    await render(wrap(<LoginScreen />))

    await fireEvent.changeText(screen.getByTestId('phone-input'), '09121234567')
    await fireEvent.press(screen.getByTestId('phone-submit'))
    await fireEvent.changeText(await screen.findByTestId('code-input'), '0000')
    await fireEvent.press(screen.getByTestId('code-submit'))
    expect(await screen.findByText('کد نامعتبر یا منقضی شده است.')).toBeTruthy()
    expect(screen.getByText('ارسال دوباره کد')).toBeTruthy()
  })
})
