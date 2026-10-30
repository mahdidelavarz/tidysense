// Native modules that have no JavaScript fallback under Jest.

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>()
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => { store.set(key, value) }),
    deleteItemAsync: jest.fn(async (key: string) => { store.delete(key) }),
    __reset: () => store.clear(),
  }
})

jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000000' }))
