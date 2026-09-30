import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/first-entry')({
  component: () => <div className="page-container-narrow">
    <section className="page-header text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-tint text-xl font-bold text-accent" aria-hidden="true">✓</div>
      <h1 className="mt-4 text-2xl font-bold">شروع کار</h1>
      <p className="mx-auto mt-3 max-w-md text-text-secondary">حساب شما آماده است. راه‌اندازی اولیه در مرحله بعد تکمیل می‌شود.</p>
      <Link className="primary-button mt-6 w-full sm:w-auto" to="/">ادامه به برنامه</Link>
    </section>
  </div>,
})
