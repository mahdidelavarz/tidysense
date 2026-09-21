import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <section className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">TidySense</h1>
      <p className="mt-3 text-text-secondary">نمونهٔ زیرساخت خواندن پروژه آماده است.</p>
      <Link className="mt-5 inline-block rounded-lg bg-accent px-4 py-3 text-white" to="/projects/$projectId" params={{ projectId: '00000000-0000-0000-0000-000000000000' }}>
        مشاهدهٔ نمونهٔ پروژه
      </Link>
    </section>
  ),
})
