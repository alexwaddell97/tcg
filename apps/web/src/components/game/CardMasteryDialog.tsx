import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { CARD_BORDERS, CARD_PLAY_XP, getCardMasteryTier, getEquippedCardBorder, isBorderUnlocked } from '@tcg/shared'
import type { CardBorderId, CardDefinition } from '@tcg/shared'
import { useCardMasteryStore } from '../../stores/useCardMasteryStore.ts'
import ArenaCardFace from './ArenaCardFace.tsx'
import CardBorderFrame from './CardBorderFrame.tsx'
import './CardMastery.css'

export function CardMasteryControl({ card }: { card: CardDefinition }) {
  const [open, setOpen] = useState(false)
  const mastery = useCardMasteryStore(state => state.cards[card.definitionId])
  if (card.arenaToken) return null
  return <>
    <button className="ae-mastery-control" onClick={() => setOpen(true)} aria-label={`Customize ${card.name} borders`}>
      <span aria-hidden="true">◇</span><span>Borders <small>Level {getCardMasteryTier(mastery?.xp).level}</small></span><span aria-hidden="true">↗</span>
    </button>
    {open && createPortal(<CardMasteryDialog key={card.definitionId} card={card} onClose={() => setOpen(false)}/>, document.body)}
  </>
}

function CardMasteryDialog({ card, onClose }: { card: CardDefinition; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const mastery = useCardMasteryStore(state => state.cards[card.definitionId])
  const xp = mastery?.xp ?? 0
  const current = getEquippedCardBorder(mastery)
  const [previewId, setPreviewId] = useState<CardBorderId>(current)
  const [feedback, setFeedback] = useState('')
  const tier = getCardMasteryTier(xp)
  const next = CARD_BORDERS.find(border => border.level === tier.level + 1)
  const preview = CARD_BORDERS.find(border => border.id === previewId)!
  const unlocked = isBorderUnlocked(xp, previewId)
  const automatic = !mastery?.equippedBorder
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close() }, [])
  const equip = (border?: CardBorderId) => {
    if (useCardMasteryStore.getState().equipBorder(card.definitionId, border)) {
      setFeedback(border ? `${CARD_BORDERS.find(tier => tier.id === border)!.name} equipped.` : 'Newest unlocked border equipped automatically.')
      if (!border) setPreviewId(tier.id)
    }
  }
  return <dialog ref={dialog} className="ae-mastery-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }} onKeyDown={event => event.stopPropagation()}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="ae-mastery-shell">
      <header><div><p className="ae-eyebrow">Card mastery</p><h2 id={titleId}>{card.name}</h2></div><button className="ae-icon-button" aria-label="Close card customization" onClick={onClose} autoFocus>×</button></header>
      <div className="ae-mastery-layout">
        <div className="ae-mastery-showcase" style={{ '--mastery-color': preview.color } as CSSProperties}>
          <div className="ae-mastery-preview"><ArenaCardFace card={card} borderOverride={previewId}/></div>
          <p className="ae-mastery-preview-label">{preview.name}<span>{unlocked ? current === previewId ? 'Equipped' : 'Preview' : 'Locked preview'}</span></p>
        </div>
        <div className="ae-mastery-options">
          <div className="ae-mastery-progress"><div><strong>Level {tier.level} <span>· {tier.name}</span></strong><span>{next ? `${xp} / ${next.xp} XP` : 'Mastered'}</span></div>
            <progress aria-label="Card mastery progress" max={next ? next.xp - tier.xp : 1} value={next ? xp - tier.xp : 1}/>
            <p>{next ? `${next.xp - xp} XP to ${next.name}` : 'Every border unlocked.'}</p>
          </div>
          <p className="ae-mastery-help">Play this card to earn {CARD_PLAY_XP} XP when a six-turn match finishes. Once per card, per match. Practice counts too.</p>
          <div className="ae-mastery-borders" role="group" aria-label="Preview a border">
            {CARD_BORDERS.map(border => <button key={border.id} className="ae-mastery-choice" aria-pressed={previewId === border.id}
              aria-label={`Preview ${border.name} border${xp < border.xp ? `, locked until level ${border.level}` : ', unlocked'}`}
              onClick={() => { setPreviewId(border.id); setFeedback('') }} style={{ '--mastery-color': border.color } as CSSProperties}>
              <span className="ae-mastery-swatch"><CardBorderFrame border={border.id}/><span aria-hidden="true">{current === border.id ? '✓' : '✦'}</span></span>
              <strong>{border.name}</strong><small>{xp < border.xp ? `Level ${border.level} · Locked` : current === border.id ? 'Equipped' : 'Unlocked'}</small>
            </button>)}
          </div>
          <div className="ae-mastery-selection"><h3 style={{ color: preview.color }}>{preview.name}</h3><p>{preview.description}</p></div>
          <button className="ae-button ae-button-primary ae-mastery-equip" disabled={!unlocked || current === previewId && !automatic} onClick={() => equip(previewId)}>
            {!unlocked ? `Unlock at level ${preview.level} · ${preview.xp} XP` : current === previewId && !automatic ? `${preview.name} equipped` : `Equip ${preview.name}`}
          </button>
          <label className="ae-mastery-auto"><input type="checkbox" checked={automatic} onChange={event => equip(event.target.checked ? undefined : current)}/>Use newest unlocked border automatically</label>
          <p className="ae-mastery-feedback" role="status">{feedback || 'Borders are cosmetic. Card stats stay the same.'}</p>
        </div>
      </div>
    </section>
  </dialog>
}
