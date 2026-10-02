/** One label/value pair inside an entity detail `<dl>`. Renders `value` inside a `<time>` when `dateTime` is given. */
export function DetailTerm({ label, value, dateTime }: { label: string; value: string; dateTime?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-bold text-text-secondary">{label}</dt>
      <dd className="mt-1 font-medium">{dateTime ? <time dateTime={dateTime}>{value}</time> : value}</dd>
    </div>
  )
}
