import { useState } from 'react'
import { ARENA_CARD_DATABASE, PACK_CARD_VARIANTS, applyCardVariant } from '@tcg/shared'
import { PackRevealScreen } from './PackOpening.tsx'
import PackArt, { packName } from '../components/shop/PackArt.tsx'
import { eligiblePackCards } from '../lib/packRewards.ts'

/** Development-only animation preview. Never purchases or awards anything. */
export default function PackOpeningPreview() {
  const [packId, setPackId] = useState<string | null>(null)
  const [iteration, setIteration] = useState(0)
  const [variantId, setVariantId] = useState('')
  if (packId) {
    const variant = PACK_CARD_VARIANTS.find(art => art.id === variantId)
    const card = variant ? ARENA_CARD_DATABASE.find(card => card.definitionId === variant.definitionId)!
      : eligiblePackCards(packId, {})[0]
    return <PackRevealScreen key={iteration} cards={[applyCardVariant(card, variant?.id)]} packId={card.arenaSet ?? packId} variantId={variant?.id} preview onDone={() => setPackId(null)} onOpenAnother={() => setIteration(value => value + 1)}/>
  }
  return <main className="arena-library-screen min-h-screen flex flex-col items-center justify-center gap-8 p-6">
    <h1 className="text-xl text-stone-100">Pack opening preview</h1>
    <p className="text-sm text-stone-400">No currency spent or cards awarded.</p>
    <label className="flex flex-col gap-2 text-sm text-stone-200">Preview reward
      <select className="ae-input" value={variantId} onChange={event => setVariantId(event.target.value)}>
        <option value="">Base card</option>
        {PACK_CARD_VARIANTS.map(art => <option key={art.id} value={art.id}>{ARENA_CARD_DATABASE.find(card => card.definitionId === art.definitionId)?.name} — {art.name}</option>)}
      </select>
    </label>
    <div className="flex flex-wrap justify-center gap-8">{['core', 'expanded', 'eternal'].map(id => <button key={id} className="flex flex-col items-center gap-4 text-stone-200" onClick={() => setPackId(id)}>
      <div style={{ width: 108, aspectRatio: '3 / 5' }}><PackArt packId={id}/></div>{packName(id)}
    </button>)}</div>
  </main>
}
