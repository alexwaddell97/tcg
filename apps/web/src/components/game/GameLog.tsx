import { useEffect, useRef } from 'react'
import type { GameLogEntry } from '@tcg/shared'

interface GameLogProps {
  entries: GameLogEntry[]
}

export default function GameLog({ entries }: GameLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  return (
    <div className="flex flex-col h-full rounded-xl bg-stone-900/50 border border-stone-700/40 overflow-hidden">
      <div className="px-3 py-2 border-b border-stone-700/40">
        <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">Chronicle</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        {entries.map((entry) => (
          <p
            key={entry.id}
            className={`text-xs leading-relaxed ${
              entry.type === 'system' ? 'text-stone-600 italic' : 'text-stone-300'
            }`}
          >
            {entry.message}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
