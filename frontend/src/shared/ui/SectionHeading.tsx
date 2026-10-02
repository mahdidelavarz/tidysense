/** Heading row for a dashboard panel/section: title, description, a background-refetch hint, and one primary action. */
export function SectionHeading({ id, title, description, fetching, actionLabel, onAction }: {
  id: string
  title: string
  description: string
  fetching: boolean
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold sm:text-2xl" id={id}>{title}</h2>
          {fetching && <span className="text-xs text-text-secondary" role="status">در حال به‌روزرسانی…</span>}
        </div>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">{description}</p>
      </div>
      <button className="primary-button w-full sm:w-auto" type="button" onClick={onAction}>{actionLabel}</button>
    </div>
  )
}
