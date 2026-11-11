import { z } from 'zod'
import type { components } from '../../../shared/api/generated'

export type CurrentUser = components['schemas']['CurrentUserDto']
export type NativeSession = components['schemas']['NativeSessionDto']
export type RequestOtp = components['schemas']['RequestOtpDto']
export type VerifyOtp = components['schemas']['VerifyOtpDto']

// The same rules and messages as frontend/src/features/auth/components/PhoneStep.tsx and OtpStep.tsx.
export const phoneSchema = z.object({ phoneNumber: z.string().regex(/^(09\d{9}|98\d{10}|\+98\d{10})$/, 'شماره موبایل معتبر وارد کنید.') })
export type PhoneFields = z.infer<typeof phoneSchema>

export const codeSchema = z.object({ code: z.string().regex(/^\d{4}$/, 'کد چهار رقمی را وارد کنید.') })
export type CodeFields = z.infer<typeof codeSchema>
