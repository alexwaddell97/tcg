import { useState } from 'react'
import { ARENA_LOCATIONS } from '@tcg/shared'
import { Link } from 'react-router-dom'
import { UI_ASSETS } from '../lib/uiAssets.ts'

const concepts = [
  { id:'ingame',name:'In-game board',note:'Three arenas, opposing power totals, queued cards and a clear turn action.' },
  { id:'home',name:'Home screen',note:'The infinity arena emblem, cinematic architecture and focused navigation.' },
  { id:'deck-menu',name:'Deck menu',note:'A twelve-card deck, aether curve, strategy filters and card inspection.' },
  { id:'card-layouts',name:'Card layouts',note:'Blue aether, gold power, readable Rally and Pressure rules, and the infinity card back.' },
]
export default function ArtDirection() {
  const [selected,setSelected]=useState('ingame')
  const concept=concepts.find(item=>item.id===selected)!
  return <main className="h-screen overflow-y-auto bg-[#090f16] text-stone-200">
    <header className="max-w-[1500px] mx-auto px-5 sm:px-10 py-7 flex flex-wrap gap-5 items-center"><img className="w-24" src={UI_ASSETS.logo} alt="Arena Eternal"/><div><p className="text-[10px] tracking-[0.25em] uppercase text-amber-300/70">Visual development</p><h1 className="font-cinzel text-2xl sm:text-3xl mt-1 text-amber-100">Arena Eternal · Art direction</h1></div><Link className="clash-button ml-auto" to="/practice">Play the current build →</Link></header>
    <div className="max-w-[1500px] mx-auto px-5 sm:px-10 pb-12">
      <p className="text-sm text-stone-400 max-w-3xl leading-relaxed mb-6">Four visual concepts and nine location paintings, created with ImageGen. Screen mockups explore the design; the playable build uses the new location art, logo, backdrops and card back. Original card illustrations remain unchanged.</p>
      <nav className="flex flex-wrap gap-2 mb-5" aria-label="Screen concepts">{concepts.map(item=><button className={`clash-button ${selected===item.id?'!border-amber-400 !text-amber-100':''}`} key={item.id} onClick={()=>setSelected(item.id)} aria-pressed={selected===item.id}>{item.name}</button>)}</nav>
      <figure><a href={`${import.meta.env.BASE_URL}ui/concepts/${concept.id}.jpg`} target="_blank" rel="noreferrer"><img className="w-full rounded-xl border border-amber-300/20" src={`${import.meta.env.BASE_URL}ui/concepts/${concept.id}.jpg`} alt={`${concept.name} design concept`} /></a><figcaption className="flex justify-between gap-6 mt-3 text-xs text-stone-400"><span>{concept.note}</span><span className="shrink-0 text-amber-200/70">Open image for full size ↗</span></figcaption></figure>
      <h2 className="font-cinzel text-xl text-amber-100 mt-10 mb-4">The arenas</h2>
      <div className="grid sm:grid-cols-3 gap-4">{ARENA_LOCATIONS.map(({rule,name})=><figure key={rule} className="overflow-hidden rounded-xl border border-amber-300/15"><a href={UI_ASSETS.locations[rule]} target="_blank" rel="noreferrer"><img src={UI_ASSETS.locations[rule]} alt={`${name} location artwork`} className="w-full" loading="lazy" /></a><figcaption className="p-4 font-cinzel text-amber-100">{name}</figcaption></figure>)}</div>
    </div>
  </main>
}
