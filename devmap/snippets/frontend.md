# Frontend Snippets

## Service and query

```ts
export async function getGoal(id: string, signal?: AbortSignal) {
  const response = await api.get<GoalResponse>(`/goals/${id}`, { signal });
  return response.data;
}

export const goalKeys = {
  all: ["goals"] as const,
  detail: (id: string) => [...goalKeys.all, "detail", id] as const,
};

export function useGoal(id: string) {
  return useQuery({
    queryKey: goalKeys.detail(id),
    queryFn: ({ signal }) => getGoal(id, signal),
  });
}
```

## Authoritative mutation

```ts
export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGoal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}
```

Do not insert a consequential mutation into cache as successful before the authoritative result.

## RHF + Zod shape

```tsx
const schema = z.object({
  title: z.string().trim().min(1).max(200),
});

const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { title: "" },
});
```

An entity-specific form maps server field errors, preserves input, exposes submitting/error/success states, and uses Persian labels in an RTL container. Transport-schema ownership remains subject to `DEC-005`.
