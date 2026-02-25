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
    <div className="flex flex-col h-full rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/50">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Game Log</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        {entries.map((entry) => (
          <p
            key={entry.id}
            className={`text-xs leading-relaxed ${
              entry.type === 'system' ? 'text-slate-500 italic' : 'text-slate-300'
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
