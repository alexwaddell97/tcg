import { cn } from '../../lib/cn.ts'

interface BadgeProps {
  label: string
  variant?: 'default' | 'rare' | 'legendary' | 'common' | 'uncommon'
}

const variantStyles = {
  default: 'bg-stone-800 text-stone-300',
  common: 'bg-stone-800 text-stone-300',
  uncommon: 'bg-emerald-900 text-emerald-300',
  rare: 'bg-blue-900 text-blue-300',
  legendary: 'bg-amber-900 text-amber-300',
}

export default function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block px-2 py-0.5 rounded text-xs font-medium',
        variantStyles[variant]
      )}
    >
      {label}
    </span>
  )
}
