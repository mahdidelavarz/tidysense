/** Edit/drop actions for an ACTIVE Task. */
export function TaskActiveActions({ editing, dropPending, onToggleEdit, onDrop }: {
  editing: boolean
  dropPending: boolean
  onToggleEdit: () => void
  onDrop: () => void
}) {
  return (
    <section className="surface-card" aria-label="عملیات کار">
      <p className="mb-4 text-sm font-bold text-text-secondary">عملیات کار</p>
      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <button className="secondary-button" type="button" onClick={onToggleEdit}>
          {editing ? 'انصراف از ویرایش' : 'ویرایش کار'}
        </button>
        <button className="danger-button" type="button" disabled={dropPending} onClick={onDrop}>کنار گذاشتن کار</button>
      </div>
    </section>
  )
}

/** Restore action for a DROPPED Task, bringing it back to active with its prior planned date. */
export function TaskRestoreAction({ pending, onRestore }: { pending: boolean; onRestore: () => void }) {
  return (
    <section className="surface-card">
      <h2 className="font-bold">بازگرداندن کار</h2>
      <p className="mt-1 text-sm text-text-secondary">کار با همان وابستگی و تاریخ برنامه‌ریزی دوباره فعال می‌شود.</p>
      <button className="secondary-button mt-4" type="button" disabled={pending} onClick={onRestore}>
        {pending ? 'در حال بازگرداندن…' : 'بازگرداندن به حالت فعال'}
      </button>
    </section>
  )
}
