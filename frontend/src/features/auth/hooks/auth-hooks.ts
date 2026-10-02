import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { currentUser, logout, requestOtp, verifyOtp } from '../services/auth-api'

/** Query key for the current session's user. `null` data means "checked, and signed out". */
export const currentUserKey = ['auth', 'current-user'] as const

/**
 * Session bootstrap query. Also listens for the global
 * `tidysense:unauthorized` event (raised by the HTTP client on a 401) and
 * clears the cached user so the app treats the session as signed out
 * immediately, without waiting for a refetch.
 */
export function useCurrentUser() {
  const client = useQueryClient()

  useEffect(() => {
    const clearSession = () => client.setQueryData(currentUserKey, null)
    window.addEventListener('tidysense:unauthorized', clearSession)
    return () => window.removeEventListener('tidysense:unauthorized', clearSession)
  }, [client])

  return useQuery({ queryKey: currentUserKey, queryFn: currentUser, retry: false })
}

/** Requests a login OTP for a phone number. */
export function useRequestOtp() {
  // Wrapped (not passed by reference) so TanStack Query's internal mutation
  // context argument never reaches the plain HTTP function.
  return useMutation({ mutationFn: (phoneNumber: string) => requestOtp(phoneNumber) })
}

/** Verifies an OTP and, on success, stores the now-current user as the authoritative session state. */
export function useVerifyOtp() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ phoneNumber, code }: { phoneNumber: string; code: string }) => verifyOtp(phoneNumber, code),
    onSuccess: user => client.setQueryData(currentUserKey, user),
  })
}

/** Ends the session (optionally every session for the user) and clears the cached current user. */
export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (all: boolean) => logout(all),
    onSuccess: () => client.setQueryData(currentUserKey, null),
  })
}
