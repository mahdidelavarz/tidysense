import { useNetInfo } from '@react-native-community/netinfo'

/** Whether the device has a connection. Unknown at start counts as online, as the web's `navigator.onLine` does. */
export function useOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetInfo()
  return isConnected !== false && isInternetReachable !== false
}
