import { type ReactNode, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn.ts'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-amber-600 text-stone-950 hover:bg-amber-500 border border-amber-400/40 shadow-sm shadow-amber-900/50': variant === 'primary',
          'bg-stone-800 text-stone-100 hover:bg-stone-700 border border-stone-600/50': variant === 'secondary',
          'bg-red-900/80 text-red-100 hover:bg-red-800 border border-red-700/50': variant === 'danger',
          'text-stone-400 hover:text-stone-100 hover:bg-stone-900': variant === 'ghost',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
