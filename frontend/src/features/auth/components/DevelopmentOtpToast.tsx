/** Dev-only toast previewing the OTP just issued, so local testing needs no real SMS provider. */
export function DevelopmentOtpToast({ code, onDismiss }: { code: string; onDismiss: () => void }) {
  return (
    <div role="status" className="fixed bottom-5 right-5 z-60 flex items-center gap-4 rounded-lg bg-surface px-4 py-3 shadow-lg" dir="rtl">
      <span>کد آزمایشی ورود: <strong dir="ltr" className="font-mono">{code}</strong></span>
      <button type="button" aria-label="بستن اعلان کد" className="ghost-button size-11 px-0 text-lg" onClick={onDismiss}>×</button>
    </div>
  )
}
