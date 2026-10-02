/** The filter every list page offers: what still needs attention, or everything including finished items. */
export type StatusFilter = 'ACTIVE' | 'all'
export const statusFilterOptions = [
  { value: 'ACTIVE', label: 'فعال' },
  { value: 'all', label: 'همه' },
] as const

/** A small set of mutually exclusive view filters. Use for 2–4 options; more belongs in a select. */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would add an unwanted visible legend/border here.
    <div className="segmented" role="group" aria-label={label}>
      {options.map(option => (
        <button
          key={option.value}
          className="segmented-option"
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
