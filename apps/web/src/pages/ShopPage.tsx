import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRunStore } from '../stores/useRunStore.ts'
import type { ShopItem, SPCardDefinition, RelicDefinition, PotionDefinition, EquipmentDefinition } from '@tcg/shared'
import { cn } from '../lib/cn.ts'

export default function ShopPage() {
  const navigate = useNavigate()
  const run = useRunStore((s) => s.run)
  const buyCard = useRunStore((s) => s.buyCard)
  const buyRelic = useRunStore((s) => s.buyRelic)
  const buyPotion = useRunStore((s) => s.buyPotion)
  const buyEquipment = useRunStore((s) => s.buyEquipment)
  const removeCardAtShop = useRunStore((s) => s.removeCardAtShop)
  const exitShop = useRunStore((s) => s.exitShop)

  useEffect(() => {
    if (!run) { navigate('/run'); return }
    if (run.phase !== 'shop') { navigate('/run/map'); return }
  }, [run?.phase])

  if (!run || run.phase !== 'shop' || !run.shopInventory) return null

  const shop = run.shopInventory
  const canAfford = (price: number) => run.gold >= price

  const typeColor = (type: string) =>
    type === 'attack' ? 'text-red-400' : type === 'skill' ? 'text-sky-400' : 'text-violet-400'

  const rarityBadge = (rarity: string) =>
    rarity === 'rare' ? 'bg-amber-900/60 text-amber-300' :
    rarity === 'uncommon' ? 'bg-sky-900/60 text-sky-300' :
    'bg-stone-800 text-stone-400'

  function leave() {
    exitShop()
    navigate('/run/map')
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #091409 0%, #0a0806 100%)' }}
    >
      {/* Header */}
      <header
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-stone-800/60"
        style={{ background: 'rgba(10,8,6,0.97)' }}
      >
        <div>
          <p className="text-stone-700 text-[9px] uppercase tracking-[0.3em] font-semibold">Floor {run.floor}</p>
          <p className="font-cinzel text-emerald-200/80 text-lg tracking-wide uppercase">The Merchant's Tent</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-cinzel text-[9px] text-stone-600 uppercase tracking-wider">Gold</span>
            <span className="text-amber-300 font-black text-lg tabular-nums">{run.gold}</span>
          </div>
          <button
            onClick={leave}
            className="px-4 py-2 rounded-sm border border-stone-700/60 text-stone-400 hover:text-stone-200 text-xs uppercase tracking-widest transition-colors"
          >
            Leave
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-8 max-w-2xl mx-auto w-full">

        {/* Cards for sale */}
        {shop.cards.length > 0 && (
          <section>
            <p className="text-stone-500 text-[10px] uppercase tracking-[0.3em] font-bold mb-3">Cards</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {shop.cards.map((item: ShopItem<SPCardDefinition>) => (
                <div
                  key={item.item.id}
                  className={cn(
                    'flex flex-col gap-2 p-3 rounded-xl border-2 transition-all',
                    item.sold
                      ? 'border-stone-800 opacity-30'
                      : canAfford(item.price)
                      ? 'border-stone-700 bg-stone-950 hover:border-emerald-700/60'
                      : 'border-stone-800 bg-stone-950/50 opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className="text-stone-200 font-bold text-xs leading-tight">{item.item.name}</p>
                      <p className={cn('text-[9px] font-bold uppercase tracking-widest', typeColor(item.item.type))}>
                        {item.item.type}
                      </p>
                    </div>
                    <span className="text-stone-500 text-[10px] font-bold shrink-0">{item.item.energyCost}</span>
                  </div>
                  <p className="text-stone-500 text-[10px] leading-tight line-clamp-3">{item.item.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase', rarityBadge(item.item.rarity))}>
                      {item.item.rarity}
                    </span>
                    <button
                      disabled={item.sold || !canAfford(item.price)}
                      onClick={() => buyCard(item.item.id)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-black transition-all',
                        item.sold ? 'text-stone-600 cursor-default' :
                        canAfford(item.price)
                          ? 'bg-emerald-800/60 text-emerald-300 hover:bg-emerald-700/60 active:scale-95'
                          : 'text-stone-600 cursor-not-allowed'
                      )}
                    >
                      {item.sold ? 'Sold' : `${item.price}g`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Relics for sale */}
        {shop.relics.length > 0 && (
          <section>
            <p className="text-stone-500 text-[10px] uppercase tracking-[0.3em] font-bold mb-3">Relics</p>
            <div className="flex flex-col gap-2">
              {shop.relics.map((item: ShopItem<RelicDefinition>) => (
                <div
                  key={item.item.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
                    item.sold
                      ? 'border-stone-800 opacity-30'
                      : canAfford(item.price)
                      ? 'border-stone-700 bg-stone-950 hover:border-amber-700/50'
                      : 'border-stone-800 bg-stone-950/50 opacity-60'
                  )}
                >
                  <div className="w-10 h-10 rounded-sm border border-amber-900/40 bg-stone-900/60 flex items-center justify-center shrink-0">
                    <span className="font-cinzel text-[8px] text-amber-600/70 uppercase">RELIC</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-200 font-bold text-sm leading-tight">{item.item.name}</p>
                    <p className="text-stone-500 text-xs leading-tight line-clamp-2">{item.item.description}</p>
                  </div>
                  <button
                    disabled={item.sold || !canAfford(item.price)}
                    onClick={() => buyRelic(item.item.id)}
                    className={cn(
                      'shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-black transition-all',
                      item.sold ? 'text-stone-600 cursor-default' :
                      canAfford(item.price)
                        ? 'bg-amber-800/60 text-amber-300 hover:bg-amber-700/60 active:scale-95'
                        : 'text-stone-600 cursor-not-allowed'
                    )}
                  >
                    {item.sold ? 'Sold' : `${item.price}g`}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Potions for sale */}
        {shop.potions.length > 0 && (
          <section>
            <p className="text-stone-500 text-[10px] uppercase tracking-[0.3em] font-bold mb-3">Potions</p>
            <div className="flex gap-3 flex-wrap">
              {shop.potions.map((item: ShopItem<PotionDefinition>) => (
                <div
                  key={item.item.id}
                  className={cn(
                    'flex flex-col gap-1.5 p-3 rounded-xl border-2 w-32 transition-all',
                    item.sold
                      ? 'border-stone-800 opacity-30'
                      : canAfford(item.price)
                      ? 'border-stone-700 bg-stone-950 hover:border-red-700/50'
                      : 'border-stone-800 bg-stone-950/50 opacity-60'
                  )}
                >
                  <p className="text-center">
                    <span className={cn('font-cinzel text-[8px] uppercase tracking-wider font-bold',
                      item.item.id === 'health_potion' ? 'text-emerald-400' :
                      item.item.id === 'block_potion' ? 'text-sky-400' :
                      item.item.id === 'strength_potion' ? 'text-red-400' :
                      item.item.id === 'energy_potion' ? 'text-amber-400' :
                      item.item.id === 'vulnerable_potion' ? 'text-rose-400' : 'text-orange-400'
                    )}>
                      {item.item.id === 'health_potion' ? 'HLTH' :
                       item.item.id === 'block_potion' ? 'BLK' :
                       item.item.id === 'strength_potion' ? 'STR' :
                       item.item.id === 'energy_potion' ? 'NRG' :
                       item.item.id === 'vulnerable_potion' ? 'VLN' : 'FIRE'}
                    </span>
                  </p>
                  <p className="text-stone-200 font-bold text-[10px] text-center leading-tight">{item.item.name}</p>
                  <p className="text-stone-600 text-[9px] text-center leading-tight">{item.item.description}</p>
                  <button
                    disabled={item.sold || !canAfford(item.price) || run.potions.filter(Boolean).length >= 3}
                    onClick={() => buyPotion(item.item.id)}
                    className={cn(
                      'flex items-center justify-center gap-1 py-1 rounded-sm text-[10px] font-black transition-all',
                      item.sold ? 'text-stone-600 cursor-default' :
                      canAfford(item.price) && run.potions.filter(Boolean).length < 3
                        ? 'bg-red-900/60 text-red-300 hover:bg-red-800/60 active:scale-95'
                        : 'text-stone-600 cursor-not-allowed'
                    )}
                  >
                    {item.sold ? 'Sold' : `${item.price}g`}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Equipment for sale */}
        {shop.equipment && shop.equipment.length > 0 && (
          <section>
            <p className="text-stone-500 text-[10px] uppercase tracking-[0.3em] font-bold mb-3">Equipment</p>
            <div className="flex flex-col gap-2">
              {shop.equipment.map((item: ShopItem<EquipmentDefinition>) => {
                const slotAbbr = item.item.slot === 'weapon' ? 'WPN' : item.item.slot === 'armor' ? 'ARM' : 'OFF'
                const slotColor = item.item.slot === 'weapon' ? 'text-red-400' : item.item.slot === 'armor' ? 'text-sky-400' : 'text-emerald-400'
                const tierLabel = item.item.tier === 1 ? 'Standard' : 'Superior'
                return (
                  <div
                    key={item.item.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
                      item.sold
                        ? 'border-stone-800 opacity-30'
                        : canAfford(item.price)
                        ? 'border-stone-700 bg-stone-950 hover:border-amber-700/50'
                        : 'border-stone-800 bg-stone-950/50 opacity-60'
                    )}
                  >
                    <div className="w-10 h-10 rounded-sm border border-stone-700/60 bg-stone-900 flex items-center justify-center shrink-0">
                      <span className="font-cinzel text-[9px] text-stone-500 uppercase tracking-wide">{slotAbbr}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-stone-200 font-bold text-sm leading-tight">{item.item.name}</p>
                        <span className={cn('text-[9px] font-bold uppercase tracking-widest', slotColor)}>{tierLabel}</span>
                      </div>
                      <p className="text-stone-500 text-xs leading-tight line-clamp-2">{item.item.description}</p>
                    </div>
                    <button
                      disabled={item.sold || !canAfford(item.price)}
                      onClick={() => buyEquipment(item.item.id)}
                      className={cn(
                        'shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-black transition-all',
                        item.sold ? 'text-stone-600 cursor-default' :
                        canAfford(item.price)
                          ? 'bg-amber-800/60 text-amber-300 hover:bg-amber-700/60 active:scale-95'
                          : 'text-stone-600 cursor-not-allowed'
                      )}
                    >
                      {item.sold ? 'Sold' : `${item.price}g`}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Card removal */}
        <section className="border-t border-stone-800/60 pt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-stone-500 text-[10px] uppercase tracking-[0.3em] font-bold">Remove a card</p>
            <span className="font-cinzel text-stone-500 text-xs">{shop.removeCardPrice}g</span>
          </div>
          <p className="text-stone-500 text-xs mb-3">Permanently remove a card from your deck.</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {run.deck.map((card) => (
              <button
                key={card.instanceId}
                disabled={!canAfford(shop.removeCardPrice)}
                onClick={() => removeCardAtShop(card.instanceId)}
                className={cn(
                  'flex flex-col gap-1 p-2 rounded-lg border text-left transition-all',
                  canAfford(shop.removeCardPrice)
                    ? 'border-stone-700 bg-stone-950 hover:border-red-700/60 hover:bg-red-950/20 active:scale-95'
                    : 'border-stone-800 opacity-40 cursor-not-allowed'
                )}
              >
                <p className={cn('text-[9px] font-bold uppercase tracking-wide', typeColor(card.type))}>
                  {card.type}
                </p>
                <p className="text-stone-300 text-[10px] font-bold leading-tight">{card.name}</p>
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
