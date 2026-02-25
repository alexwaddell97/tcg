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
          'bg-amber-500 text-slate-900 hover:bg-amber-400': variant === 'primary',
          'bg-slate-700 text-white hover:bg-slate-600': variant === 'secondary',
          'bg-red-600 text-white hover:bg-red-500': variant === 'danger',
          'text-slate-400 hover:text-white hover:bg-slate-800': variant === 'ghost',
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
