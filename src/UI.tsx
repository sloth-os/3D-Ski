import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X, ChevronDown } from 'lucide-react'

export function SummitMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 36"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M1 31 19.7 3l7.2 10.8-4.4 6.5-2.8-4.4L9.7 31H1Z" />
      <path d="m16.4 31 15-22.5L46.5 31h-9.1l-6-9.1-6.1 9.1h-8.9Z" />
    </svg>
  )
}
export function Brand() {
  return (
    <span className="brand">
      <SummitMark className="brand-mark" />
      <span className="brand-type">
        FALLLINE<span>SKI SIMULATOR</span>
      </span>
    </span>
  )
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId()
  useEffect(() => {
    const el = ref.current!,
      prior = document.activeElement as HTMLElement | null
    el.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      el.close()
      document.body.style.overflow = overflow
      prior?.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={'modal' + (wide ? ' wide' : '')}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect()
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose()
        }
      }}
    >
      <div className="modal-header">
        <h2 id={id}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function Toggle({
  label,
  on,
  change,
}: {
  label: string
  on: boolean
  change: () => void
}) {
  return (
    <button
      className="toggle-row"
      type="button"
      role="switch"
      aria-checked={on}
      onClick={change}
    >
      <span>{label}</span>
      <span className={'switch ' + (on ? 'on' : '')} aria-hidden="true">
        <i />
      </span>
    </button>
  )
}
export function SelectField({
  id,
  label,
  icon,
  items,
  value,
  onChange,
}: {
  id: string
  label: string
  icon: ReactNode
  items: { value: string; name: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="select-wrap">
        {icon}
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.name}
            </option>
          ))}
        </select>
        <ChevronDown className="select-chevron" size={15} />
      </div>
    </div>
  )
}
export function SchemeTabs<T extends string>({
  value,
  items,
  onChange,
  label,
}: {
  value: T
  items: { id: T; name: string; icon?: ReactNode }[]
  onChange: (id: T) => void
  label: string
}) {
  return (
    <div className="scheme-tabs" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={value === item.id ? 'selected' : ''}
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          {item.name}
        </button>
      ))}
    </div>
  )
}
