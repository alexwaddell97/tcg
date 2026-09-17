import { useEffect, useRef, useState } from 'react'
import { Diamond } from '@phosphor-icons/react'
import { ARENA_CARD_DATABASE, getShopVariantRotation } from '@tcg/shared'
import type { ShopCardVariant } from '@tcg/shared'
import { useCollectionStore } from '../../stores/useCollectionStore.ts'
import ArenaCardFace from '../game/ArenaCardFace.tsx'
import { useShopRotation } from '../../hooks/useShopRotation.ts'

function GemPrice({ amount }: { amount: number }) {
  return <span className="shop-variant-price"><Diamond weight="duotone" aria-hidden="true"/>{amount} gems</span>
}

function VariantDialog({ variant, inRotation, onClose }: { variant: ShopCardVariant; inRotation: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [feedback, setFeedback] = useState('')
  const card = ARENA_CARD_DATABASE.find(card => card.definitionId === variant.definitionId)!
  const owned = useCollectionStore(state => state.variants[variant.id] === true)
  const ownsCard = useCollectionStore(state => state.cards[variant.definitionId] > 0)
  const equipped = useCollectionStore(state => state.equippedVariants[variant.definitionId] === variant.id)
  const gems = useCollectionStore(state => state.gems)
  const available = inRotation && ownsCard && Number.isFinite(gems) && gems >= variant.gemCost
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close() }, [])
  const purchase = () => {
    const purchased = useCollectionStore.getState().purchaseVariant(variant.id)
    const stillOffered = getShopVariantRotation().variants.some(offer => offer.id === variant.id)
    setFeedback(purchased ? `${variant.name} purchased.` : !stillOffered ? 'The shop has refreshed. This artwork will return.' : 'Purchase unavailable. Check your balance and collection.')
  }
  const equip = (original = false) => {
    if (useCollectionStore.getState().equipVariant(variant.definitionId, original ? undefined : variant.id)) setFeedback(original ? 'Original artwork equipped.' : `${variant.name} equipped.`)
  }
  return <dialog ref={dialog} className="shop-reward-dialog shop-variant-dialog" aria-label={`${variant.name} art variant`} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="shop-reward-dialog-body">
      <button className="shop-reward-close" aria-label="Close variant preview" onClick={onClose} autoFocus>×</button>
      <p className="shop-eyebrow">{variant.style}</p>
      <div className="shop-reward-large"><span className="shop-reward-card-face"><ArenaCardFace card={card} variant="catalog" artOverride={variant.imageUrl}/></span></div>
      <h2>{variant.name}</h2>
      <p className="shop-reward-description">{card.name} · Alternate artwork</p>
      <div className="shop-variant-purchase">
        {owned ? <>
          <button className="ae-button ae-button-primary" disabled={equipped || !ownsCard} onClick={() => equip()}>{equipped ? 'Equipped' : 'Equip artwork'}</button>
          {equipped && <button className="shop-variant-original" onClick={() => equip(true)}>Use original artwork</button>}
        </> : <>
          <button className="ae-button ae-button-primary" disabled={!available} onClick={purchase}>{inRotation ? <>Buy for <GemPrice amount={variant.gemCost}/></> : 'Not in today’s shop'}</button>
          <small>{!inRotation ? 'This artwork will return in a future rotation.' : !ownsCard ? `Requires ${card.name} in your collection` : !available ? `${Math.max(0, variant.gemCost - (Number.isFinite(gems) ? gems : 0))} more gems needed` : `Balance: ${gems} gems`}</small>
        </>}
      </div>
      <p className="shop-variant-feedback" role="status">{feedback || (owned ? 'Owned' : 'Artwork only. Stats and mastery stay the same.')}</p>
    </div>
  </dialog>
}

export default function ShopVariants() {
  const [inspecting, setInspecting] = useState<ShopCardVariant | null>(null)
  const variants = useCollectionStore(state => state.variants)
  const equipped = useCollectionStore(state => state.equippedVariants)
  const rotation = useShopRotation()
  const minutes = Math.max(1, Math.ceil((rotation.refreshesAt - rotation.now) / 60_000))
  return <section className="shop-variants" aria-label="Art variants">
    <div className="shop-section-heading shop-variant-heading"><h2>Art variants</h2><time className="shop-variant-refresh" dateTime={new Date(rotation.refreshesAt).toISOString()} title="New selection daily at 00:00 UTC">Refreshes in <strong>{Math.floor(minutes / 60)}h {minutes % 60}m</strong></time></div>
    <div className="shop-variant-grid">{rotation.variants.map(variant => {
      const card = ARENA_CARD_DATABASE.find(card => card.definitionId === variant.definitionId)!
      const owned = variants[variant.id] === true
      return <article className="shop-variant-offer" key={variant.id}>
        <button className="shop-variant-art" onClick={() => setInspecting(variant)} aria-label={`Preview ${variant.name} art variant`}><ArenaCardFace card={card} variant="catalog" artOverride={variant.imageUrl}/></button>
        <div className="shop-variant-info">
          <span className="shop-variant-style">{variant.style}</span><h3>{variant.name}</h3><p className="shop-variant-character">{card.name}</p>
          <button className="shop-variant-buy" onClick={() => setInspecting(variant)} aria-label={`${owned ? 'Manage' : 'View'} ${variant.name}${owned ? '' : `, ${variant.gemCost} gems`}`}>
            {owned ? <span>{equipped[variant.definitionId] === variant.id ? 'Equipped' : 'Owned · Equip'}</span> : <GemPrice amount={variant.gemCost}/>}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </article>
    })}</div>
    {inspecting && <VariantDialog key={inspecting.id} variant={inspecting} inRotation={rotation.variants.some(variant => variant.id === inspecting.id)} onClose={() => setInspecting(null)}/>}
  </section>
}
