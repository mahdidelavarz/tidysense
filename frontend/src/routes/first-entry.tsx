import { createFileRoute, Link } from '@tanstack/react-router'
import { CircleCheckBig } from 'lucide-react'

function FirstEntry() {
  return (
    <div className="page flex min-h-[70dvh] items-center">
      <section className="mx-auto max-w-md text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-positive-tint text-positive" aria-hidden="true">
          <CircleCheckBig size={32} />
        </div>
        <h1 className="page-title mt-5">خوش آمدید</h1>
        <p className="mt-3 leading-8 text-text-secondary">
          حساب شما آماده است. از «امروز» شروع کنید و اولین کار، پروژه یا هدف خود را اضافه کنید.
        </p>
        <Link className="primary-button mt-7 w-full sm:w-auto" to="/today">ادامه به برنامه</Link>
      </section>
    </div>
  )
}

export const Route = createFileRoute('/first-entry')({ component: FirstEntry })
