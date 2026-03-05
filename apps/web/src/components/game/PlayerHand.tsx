import { useState, useRef } from 'react'
import type { Card } from '@tcg/shared'
import { useGameStore } from '../../stores/useGameStore.ts'
import HandCard from './HandCard.tsx'
import CardViewer from './CardViewer.tsx'

// Phosphor Sword (fill) — path from 256x256 viewBox
const SWORD_PATH = 'M216,32H152a8,8,0,0,0-6.34,3.12l-64,83.21L72,108.69a16,16,0,0,0-22.64,0l-8.69,8.7a16,16,0,0,0,0,22.63l22,22-32,32a16,16,0,0,0,0,22.63l8.69,8.68a16,16,0,0,0,22.62,0l32-32,22,22a16,16,0,0,0,22.64,0l8.69-8.7a16,16,0,0,0,0-22.63l-9.64-9.64,83.21-64A8,8,0,0,0,224,104V40A8,8,0,0,0,216,32Zm-8,68.06-81.74,62.88L115.32,152l50.34-50.34a8,8,0,0,0-11.32-11.31L104,140.68,93.07,129.74,155.94,48H208Z'

/** Draw the Phosphor Sword (fill) icon at pixel size `size`, centred on (cx, cy) */
function drawSwordIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  const scale = size / 256
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(scale, scale)
  ctx.fillStyle = color
  ctx.fill(new Path2D(SWORD_PATH))
  ctx.restore()
}

interface PlayerHandProps {
  cards: Card[]
  canAct: boolean
  onSelectCard: (instanceId: string | null) => void
}

export default function PlayerHand({ cards, canAct, onSelectCard }: PlayerHandProps) {
  const setDragging = useGameStore((s) => s.setDragging)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [viewingCard, setViewingCard] = useState<Card | null>(null)
  // Hold a ref to the ghost clone so we can remove it on dragend (Safari
  // requires the element to stay in the DOM for the full duration of the drag).
  const ghostRef = useRef<HTMLElement | null>(null)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, card: Card) => {
    if (!canAct) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', card.instanceId)

    const el = e.currentTarget
    const rect = el.getBoundingClientRect()

    const imgEl = el.querySelector('img')
    const canvas = document.createElement('canvas')
    const dpr = window.devicePixelRatio || 1
    const w = rect.width
    const h = rect.height
    const radius = 10
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${w}px;
      height: ${h}px;
      border-radius: ${radius}px;
      pointer-events: none;
      z-index: 9999;
    `
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const rr = (x: number, y: number, rw: number, rh: number, r: number) => {
      ctx.beginPath(); ctx.roundRect(x, y, rw, rh, r)
    }

    // 1. Background
    ctx.fillStyle = '#1c1917'
    rr(0, 0, w, h, radius); ctx.fill()

    // 2. Artwork
    if (imgEl?.complete && imgEl.naturalWidth > 0) {
      ctx.save(); rr(0, 0, w, h, radius); ctx.clip()
      ctx.drawImage(imgEl, 0, 0, w, h)
      ctx.restore()
    }

    // 3. Gradient overlays
    const botGrad = ctx.createLinearGradient(0, h * 0.35, 0, h)
    botGrad.addColorStop(0, 'transparent'); botGrad.addColorStop(1, 'rgba(0,0,0,0.82)')
    ctx.fillStyle = botGrad; rr(0, 0, w, h, radius); ctx.fill()

    const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.3)
    topGrad.addColorStop(0, 'rgba(0,0,0,0.28)'); topGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = topGrad; rr(0, 0, w, h, radius); ctx.fill()

    if (card.type === 'spell') {
      ctx.fillStyle = 'rgba(46,16,101,0.22)'; rr(0, 0, w, h, radius); ctx.fill()
    }

    // 4. Rarity border
    const rarityStroke: Record<string, string> = {
      common: '#78716c', uncommon: '#10b981', rare: '#60a5fa', legendary: '#fbbf24',
    }
    ctx.strokeStyle = rarityStroke[card.rarity] ?? '#78716c'
    ctx.lineWidth = 2
    rr(1, 1, w - 2, h - 2, radius - 1); ctx.stroke()

    // 5. Keyword emojis — text-[0.6rem] = 9.6px, emoji font stack required for canvas
    const EMOJI: Record<string, string> = {
      fleeting: '💨', elusive: '👻', overwhelm: '🔥',
      challenger: '⚔️', resilient: '🛡️', commander: '👑', scorch: '💀',
    }
    const keywords = card.keywords.slice(0, 2)
    if (keywords.length > 0) {
      const emojiSize = 9.6
      ctx.font = `${emojiSize}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const gap = 2
      const totalKwW = (keywords.length - 1) * (emojiSize + gap)
      const kwY = h - emojiSize * 3.2
      keywords.forEach((kw, i) => {
        ctx.fillText(EMOJI[kw] ?? '', w / 2 - totalKwW / 2 + i * (emojiSize + gap), kwY)
      })
    }

    // 6. Power / spell badge — matches HandCard exactly: 9.6px text, px-1 py-px padding
    const totalPower = card.power + (card.powerBonus ?? 0)
    const hasPowerBonus = (card.powerBonus ?? 0) !== 0
    let badgeText = ''
    let badgeBg = '', badgeBorder = '', badgeTextColor = ''
    let showSword = false
    if (card.type === 'spell' && card.spellEffect) {
      const { type, value } = card.spellEffect
      const isSpellPower = type !== 'draw'
      badgeText = type === 'draw' ? `DRAW ${value}` : type === 'power_boost' ? `+${value}` : `-${value}`
      badgeBg = 'rgba(76,29,149,0.85)'; badgeBorder = 'rgba(109,40,217,0.5)'; badgeTextColor = '#ddd6fe'
      showSword = isSpellPower
    } else if (card.type !== 'spell') {
      badgeText = String(totalPower)
      badgeBg = hasPowerBonus ? 'rgba(5,46,22,0.92)' : 'rgba(12,10,9,0.92)'
      badgeBorder = hasPowerBonus ? 'rgba(34,197,94,0.60)' : 'rgba(87,83,78,0.60)'
      badgeTextColor = hasPowerBonus ? '#6ee7b7' : '#fde68a'
      showSword = true
    }
    if (badgeText) {
      const fontSize = 9.6
      const iconSize = 7
      const iconGap = 2
      ctx.font = `900 ${fontSize}px ui-monospace,monospace`
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      const textW = ctx.measureText(badgeText).width
      const padX = 4, padY = 1, bR = 2
      const contentW = (showSword ? iconSize + iconGap : 0) + textW
      const bw = contentW + padX * 2
      const bh = fontSize + padY * 2
      const bx = w / 2 - bw / 2
      const by = h - bh - 4
      const midY = by + bh / 2
      ctx.fillStyle = badgeBg; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bR); ctx.fill()
      ctx.strokeStyle = badgeBorder; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bR); ctx.stroke()
      let textX = bx + padX
      if (showSword) {
        drawSwordIcon(ctx, textX + iconSize / 2, midY, iconSize, badgeTextColor)
        textX += iconSize + iconGap
      }
      ctx.fillStyle = badgeTextColor
      ctx.fillText(badgeText, textX, midY)
    }

    document.body.appendChild(canvas)
    ghostRef.current = canvas as unknown as HTMLElement
    e.dataTransfer.setDragImage(canvas, w / 2, h / 2)
    setTimeout(() => {
      if (canvas.parentNode) { canvas.style.top = '-9999px'; canvas.style.left = '-9999px' }
    }, 0)

    setDraggingId(card.instanceId)
    setDragging(true)
    onSelectCard(null)
  }

  const handleDragEnd = () => {
    if (ghostRef.current) {
      document.body.removeChild(ghostRef.current)
      ghostRef.current = null
    }
    setDraggingId(null)
    setDragging(false)
  }

  return (
    <>
      {/* Centered scrollable hand row */}
      <div className="flex justify-center overflow-x-auto pb-2 pt-4 px-2 min-h-26" style={{ touchAction: 'pan-x' }}>
        <div className="inline-flex items-end gap-2">
        {cards.length === 0 ? (
          <div className="flex items-center justify-center text-stone-600 text-sm px-8">
            No cards in hand
          </div>
        ) : (
          cards.map((card) => {
            const isPlayable = canAct
            return (
              <div
                key={card.instanceId}
                className="shrink-0 w-16 md:w-20 lg:w-24"
                draggable={isPlayable}
                onDragStart={(e) => handleDragStart(e, card)}
                onDragEnd={handleDragEnd}
                style={{ opacity: draggingId === card.instanceId ? 0.4 : 1, cursor: isPlayable ? 'grab' : undefined }}
              >
                <HandCard
                  card={card}
                  isPlayable={isPlayable}
                  onInspect={() => setViewingCard(card)}
                />
              </div>
            )
          })
        )}
        </div>
      </div>

      <CardViewer card={viewingCard} onClose={() => setViewingCard(null)} />
    </>
  )
}
