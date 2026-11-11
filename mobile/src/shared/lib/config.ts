// Where the app finds the API. Metro inlines EXPO_PUBLIC_* variables at build time:
// start it with EXPO_PUBLIC_API_URL=http://<development machine LAN IP>:5082/api/v1 (see mobile/README.md).
// Without it, the Android emulator's address for the host machine is used.
export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:5082/api/v1'
