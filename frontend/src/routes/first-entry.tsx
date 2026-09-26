import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/first-entry')({
  component: () => <section className="mx-auto max-w-xl p-6">
    <h1 className="text-2xl font-bold">شروع کار</h1>
    <p className="mt-3">حساب شما آماده است. راه‌اندازی اولیه در مرحله بعد تکمیل می‌شود.</p>
    <Link className="mt-5 inline-block rounded-lg bg-accent px-5 py-3 text-white" to="/">ادامه به برنامه</Link>
  </section>,
})
