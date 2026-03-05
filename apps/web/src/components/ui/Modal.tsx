import { type ReactNode } from 'react'
import { X } from '@phosphor-icons/react'

interface ModalProps {
  title: string
  children: ReactNode
  onClose: () => void
}

export default function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-stone-900 border border-stone-700/60 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700/60">
          <h2 className="text-lg font-semibold text-stone-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
