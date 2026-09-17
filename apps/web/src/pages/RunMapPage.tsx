import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRunStore } from '../stores/useRunStore.ts'
import type { MapNode, RunState } from '@tcg/shared'
import { ENEMY_DATABASE, RELIC_DATABASE, getEquipment } from '@tcg/shared'
import { cn } from '../lib/cn.ts'

const NODE_STYLES: Record<string, { abbr: string; color: string; bg: string; border: string; label: string }> = {
  combat:   { abbr: 'FGT', color: 'text-red-300',    bg: 'bg-red-950/60',     border: 'border-red-800/60',    label: 'Combat' },
  elite:    { abbr: 'ELT', color: 'text-orange-300', bg: 'bg-orange-950/60',  border: 'border-orange-700/60', label: 'Elite' },
  boss:     { abbr: 'BSS', color: 'text-amber-300',  bg: 'bg-amber-950/80',   border: 'border-amber-600/70',  label: 'Boss' },
  shop:     { abbr: 'SHP', color: 'text-emerald-300',bg: 'bg-emerald-950/60', border: 'border-emerald-700/60',label: 'Shop' },
  campfire: { abbr: 'RST', color: 'text-amber-200',  bg: 'bg-amber-900/40',   border: 'border-amber-700/50',  label: 'Rest' },
  event:    { abbr: 'EVT', color: 'text-sky-300',    bg: 'bg-sky-950/50',     border: 'border-sky-700/50',    label: 'Event' },
  treasure: { abbr: 'CST', color: 'text-violet-300', bg: 'bg-violet-950/50',  border: 'border-violet-700/50', label: 'Chest' },
}

function MapNodeButton({
  node,
  onSelect,
}: {
  node: MapNode
  onSelect: () => void
}) {
  const style = NODE_STYLES[node.type] ?? NODE_STYLES.combat
  const enemy = node.enemyId ? ENEMY_DATABASE.find((e) => e.id === node.enemyId) : null

  return (
    <button
      onClick={onSelect}
      disabled={!node.available || node.completed}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-2xl border-2',
        'transition-all duration-150 font-bold',
        style.bg, style.border,
        node.completed && 'opacity-40 cursor-default',
        node.available && !node.completed && [
          'hover:scale-110 hover:-translate-y-0.5 cursor-pointer',
          'shadow-sm hover:shadow-[0_0_14px_rgba(255,255,255,0.1)]',
          'ring-2 ring-offset-1 ring-offset-stone-950 ring-amber-500/40',
        ],
        !node.available && !node.completed && 'opacity-25 cursor-not-allowed',
      )}
      title={enemy ? `${style.label}: ${enemy.name}` : style.label}
    >
      {node.completed ? (
        <span className="font-cinzel text-stone-600 text-[8px] uppercase tracking-widest">Done</span>
      ) : (
        <>
          <span className={cn('font-cinzel text-[11px] font-bold leading-none', style.color)}>{style.abbr}</span>
          <span className={cn('text-[8px] uppercase tracking-wide', style.color)}>{style.label}</span>
        </>
      )}
    </button>
  )
}

function RunStats({ run }: { run: RunState }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* HP */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-28 h-2 bg-stone-900 rounded-sm overflow-hidden border border-stone-800/60">
          <div
            className={cn(
              'h-full transition-all duration-300',
              run.hp < run.maxHp * 0.35 ? 'bg-red-600' : 'bg-emerald-600'
            )}
            style={{ width: `${(run.hp / run.maxHp) * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-stone-500 tabular-nums">
          <span className={cn('font-bold', run.hp < run.maxHp * 0.35 ? 'text-red-400' : 'text-stone-300')}>
            {run.hp}
          </span> / {run.maxHp} HP
        </p>
      </div>

      {/* Gold */}
      <div className="flex items-center gap-1.5">
        <span className="font-cinzel text-[9px] text-stone-600 uppercase tracking-wider">Gold</span>
        <span className="text-amber-300 font-black text-sm tabular-nums">{run.gold}</span>
      </div>

      {/* Deck size */}
      <div className="flex items-center gap-1.5">
        <span className="font-cinzel text-[9px] text-stone-600 uppercase tracking-wider">Deck</span>
        <span className="text-stone-300 font-bold text-sm tabular-nums">{run.deck.length}</span>
      </div>

      {/* Equipment */}
      {(run.equippedWeapon || run.equippedArmor || run.equippedOffhand) && (
        <div className="flex items-center gap-1">
          {[
            { id: run.equippedWeapon, abbr: 'WPN' },
            { id: run.equippedArmor, abbr: 'ARM' },
            { id: run.equippedOffhand, abbr: 'OFF' },
          ].map(({ id, abbr }) => {
            if (!id) return null
            const def = getEquipment(id)
            return (
              <div
                key={id}
                className="px-1.5 py-0.5 rounded-sm border border-stone-700/40 bg-stone-900/60 flex items-center justify-center cursor-default"
                title={def ? `${def.name}: ${def.description}` : id}
              >
                <span className="font-cinzel text-[7px] text-stone-500 uppercase tracking-wider">{abbr}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Relics (abbreviated) */}
      {run.relics.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {run.relics.slice(0, 5).map((ar) => {
            const def = RELIC_DATABASE.find((r) => r.id === ar.definitionId)
            return (
              <div
                key={ar.definitionId}
                className="px-1.5 py-0.5 rounded-sm border border-amber-900/40 bg-stone-900/60 cursor-default"
                title={def ? `${def.name}: ${def.description}` : ar.definitionId}
              >
                <span className="font-cinzel text-[7px] text-amber-600/70 uppercase tracking-wide leading-none">{def?.name ?? ar.definitionId}</span>
              </div>
            )
          })}
          {run.relics.length > 5 && (
            <div className="px-1.5 py-0.5 rounded-sm border border-stone-700/40 bg-stone-900/60">
              <span className="text-[9px] text-stone-500">+{run.relics.length - 5}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function RunMapPage() {
  const navigate = useNavigate()
  const run = useRunStore((s) => s.run)
  const selectNode = useRunStore((s) => s.selectNode)
  const abandonRun = useRunStore((s) => s.abandonRun)

  useEffect(() => {
    if (!run) { navigate('/run'); return }
    if (run.phase === 'combat') { navigate('/run/combat'); return }
    if (run.phase === 'card_reward') { navigate('/run/reward'); return }
    if (run.phase === 'campfire') { navigate('/run/campfire'); return }
    if (run.phase === 'shop') { navigate('/run/shop'); return }
    if (run.phase === 'event') { navigate('/run/event'); return }
    if (run.phase === 'victory' || run.phase === 'game_over') { navigate('/run/over'); return }
  }, [run?.phase])

  if (!run) return null

  const { currentMap } = run

  // Group nodes by row, descending (boss at top)
  const maxRow = Math.max(...currentMap.nodes.map((n) => n.row))
  const rows: MapNode[][] = []
  for (let r = maxRow; r >= 0; r--) {
    const rowNodes = currentMap.nodes.filter((n) => n.row === r)
    if (rowNodes.length > 0) rows.push(rowNodes)
  }

  function handleNodeSelect(nodeId: string) {
    selectNode(nodeId)
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #150f08 0%, #0a0806 100%)' }}
    >

      {/* ─── Header ─── */}
      <header
        className="shrink-0 flex items-center justify-between px-4 pt-safe py-3 border-b border-stone-800/60"
        style={{ background: 'rgba(10,8,6,0.97)' }}
      >
        <div className="flex flex-col gap-0.5">
          <p className="font-cinzel text-stone-600 text-[9px] uppercase tracking-[0.3em]">
            Act {run.act} · Floor {run.floor}
          </p>
          <p className="font-cinzel text-lg leading-none tracking-wide" style={{ color: '#c8ab72' }}>
            {run.act === 1 ? 'Training Grounds' : run.act === 2 ? 'The Grand Arena' : 'Tournament of Champions'}
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm('Abandon this run? All progress will be lost.')) {
              abandonRun()
              navigate('/run')
            }
          }}
          className="text-stone-600 hover:text-stone-400 text-xs uppercase tracking-widest transition-colors"
        >
          Abandon
        </button>
      </header>

      {/* Run stats */}
      <div className="shrink-0 px-4 py-3 border-b border-stone-800/40 flex flex-wrap gap-3 items-center">
        <RunStats run={run} />
      </div>

      {/* ─── Map ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex flex-col items-center gap-8 max-w-lg mx-auto">
          {rows.map((rowNodes, rowIdx) => {
            const actualRow = maxRow - rowIdx

            return (
              <div key={actualRow} className="relative flex flex-col items-center gap-2 w-full">
                {/* Connection lines to next row up (current row is higher in the visual stack) */}
                {/* Draw from this row's nodes upward to the previous rendered row */}

                {/* Nodes */}
                <div className="flex justify-center gap-8">
                  {rowNodes.sort((a, b) => a.col - b.col).map((node) => (
                    <div key={node.id} className="flex flex-col items-center gap-2">
                      {/* Connection dots going up */}
                      {node.connections.length > 0 && rowIdx > 0 && (
                        <div className="flex gap-1 mb-1">
                          <div className="w-0.5 h-6 bg-stone-700/50 rounded-full" />
                        </div>
                      )}
                      <MapNodeButton node={node} onSelect={() => handleNodeSelect(node.id)} />
                    </div>
                  ))}
                </div>

                {/* Row label */}
                {actualRow === 0 && (
                  <p className="text-[9px] text-stone-600 uppercase tracking-widest">Start here</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Deck preview strip ─── */}
      <div
        className="shrink-0 border-t border-stone-800/60 px-4 py-2 flex items-center gap-2"
        style={{ background: 'rgba(10,8,6,0.95)' }}
      >
        <span className="text-stone-700 text-[9px] uppercase tracking-widest font-bold">Your Deck</span>
        <div className="flex gap-1.5 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          {run.deck.slice(0, 12).map((card) => (
            <div
              key={card.instanceId}
              className="shrink-0 flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg bg-stone-900/80 border border-stone-800/60"
              title={`${card.name}: ${card.description}`}
            >
              <span className={cn(
                'text-[9px] font-bold',
                card.type === 'attack' ? 'text-red-400' : card.type === 'skill' ? 'text-sky-400' : 'text-violet-400'
              )}>
                {card.energyCost}
              </span>
              <span className="text-[9px] text-stone-400 whitespace-nowrap max-w-14 overflow-hidden text-ellipsis">
                {card.name}
              </span>
            </div>
          ))}
          {run.deck.length > 12 && (
            <div className="shrink-0 flex items-center px-1.5 text-stone-600 text-[9px]">
              +{run.deck.length - 12} more
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
