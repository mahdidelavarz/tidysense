import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { onSignedOut } from '../../../shared/lib/session'
import { currentUser, logout, requestOtp, verifyOtp } from '../services/auth-api'

/** Query key for the signed-in user. `null` data means "checked, and signed out". */
export const currentUserKey = ['auth', 'current-user'] as const

/** Session bootstrap query. A 401 anywhere clears the session, and this hook then shows the app signed out. */
export function useCurrentUser() {
  const client = useQueryClient()

  useEffect(() => onSignedOut(() => {
    client.setQueryData(currentUserKey, null)
    client.removeQueries({ predicate: query => query.queryKey[0] !== currentUserKey[0] })
  }), [client])

  return useQuery({ queryKey: currentUserKey, queryFn: currentUser, retry: false })
}

/** Requests a login OTP for a phone number. */
export function useRequestOtp() {
  return useMutation({ mutationFn: (phoneNumber: string) => requestOtp(phoneNumber) })
}

/** Verifies an OTP and stores the now-current user as the authoritative session state. */
export function useVerifyOtp() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ phoneNumber, code }: { phoneNumber: string; code: string }) => verifyOtp(phoneNumber, code),
    onSuccess: user => client.setQueryData(currentUserKey, user),
  })
}

/** Ends the session (optionally every session of the user) and drops every cached query. */
export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (all: boolean) => logout(all),
    onSettled: () => {
      client.setQueryData(currentUserKey, null)
      client.removeQueries({ predicate: query => query.queryKey[0] !== currentUserKey[0] })
    },
  })
}
