import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ARENA_CARD_DATABASE, ARENA_LOCATIONS, ArenaEngine, shuffle } from '@tcg/shared'
import type { ArenaArchetype, ArenaSlotIndex, Card, GameState, Room } from '@tcg/shared'
import { createArenaRelicDemo } from '../lib/arenaRelicDemo.ts'
import ArenaBoard from '../components/game/ArenaBoard.tsx'
import { createArenaArchetypeDemo, createArenaEffectsDemo, createArenaEndingDemo, createArenaLocationsDemo } from '../lib/arenaEffectsDemo.ts'
import type { MasteryReceipt } from '../stores/useCardMasteryStore.ts'
import { useAuthStore } from '../stores/useAuthStore.ts'

type PreviewStage = 'hand' | 'empty' | 'result'
type ArenaLineup = 'classic' | 'formation' | 'tricks' | 'random' | 'relics'
const previewReceipt: MasteryReceipt = { matchId: 'visual-preview-only', cards: ['village_scout', 'wandering_blade', 'mountain_hermit', 'forge_apprentice', 'temper', 'thunder_hawk'].map((definitionId, index) => ({ definitionId, xp: 20, unlocked: index < 2 ? ['silver'] : [] })) }

// Development-only stress fixture, including the final reveal and empty-hand states.
function fixture(full: boolean, stage: PreviewStage = 'hand', lineup: ArenaLineup = 'classic'): GameState {
  const locations = lineup === 'random' ? shuffle(ARENA_LOCATIONS).slice(0, 3) : ARENA_LOCATIONS.slice(lineup === 'formation' ? 3 : lineup === 'tricks' ? 6 : 0, lineup === 'formation' ? 6 : lineup === 'tricks' ? 9 : 3)
  const { displayName, avatarId, titleId } = useAuthStore.getState()
  const room: Room = { id:'layout-preview', name:'Layout preview', hostId:'you', status:'in_progress', maxPlayers:2, isPrivate:true, createdAt:0,
    players:[{id:'you',displayName:displayName || 'You',avatarId,titleId,isReady:true},{id:'bot',displayName:'Sparring partner',avatarId:'guardian',titleId:'challenger',isReady:true}] }
  const state = lineup === 'relics' ? createArenaRelicDemo().before : new ArenaEngine(room, {shuffle:false,locationRules:locations.map(site=>site.rule)}).getStateFor('you')
  if (lineup !== 'relics') {
  const units = ARENA_CARD_DATABASE.filter(card => card.type === 'unit')
  const toCard = (definitionId: string, instanceId: string): Card => ({...ARENA_CARD_DATABASE.find(card=>card.definitionId===definitionId)!,instanceId,powerBonus:0,questProgress:0,isTransformed:false})
  state.turn=6
  state.arena!.energy=6
  state.arena!.locations=state.arena!.locations.map((location,index)=>({...location,...locations[index],revealed:true,cards:Object.fromEntries(['you','bot'].map((player,p)=>[player,Array.from({length:full?4:index===0?2:1},(_,slot)=>({card:toCard(locations[index].rule==='mirror_reservoir'&&slot===0?'tainted_idol':units[(index*8+p*4+slot)%units.length].definitionId,`${player}-${index}-${slot}`),placedOnTurn:1,slotIndex:(full?slot:slot===0?0:3) as ArenaSlotIndex}))]))}))
  state.hand=['spark_sprite','wandering_blade','forge_apprentice','mountain_hermit','temper','iron_golem','thunder_hawk'].map((id,index)=>toCard(id,`hand-${index}`))
  state.players.you.handCount=7
  state.players.bot.handCount=7
  }
  Object.assign(state.players.you, { displayName: displayName || 'You', avatarId, titleId })
  if (stage !== 'hand') {
    state.hand=[]
    state.players.you.handCount=0
    state.players.bot.handCount=0
  }
  if (stage === 'result') {
    state.phase='game_over'
    state.winner='bot'
    state.arena!.lockedIn={you:true,bot:true}
  }
  return state
}
export default function ArenaLayoutPreview() {
  const navigate = useNavigate()
  const [full,setFull]=useState(true)
  const [stage,setStage]=useState<PreviewStage>('hand')
  const [lineup,setLineup]=useState<ArenaLineup>('classic')
  const [state,setState]=useState(()=>fixture(true))
  const [demo,setDemo]=useState<ReturnType<typeof createArenaEffectsDemo> | null>(null)
  const [ending,setEnding]=useState<'victory'|'defeat'|'draw'>('victory')
  const [demoMode,setDemoMode]=useState<'effects'|'ending'>('effects')
  const [effectDemo,setEffectDemo]=useState<ArenaArchetype|'general'|'arena_formation'|'arena_tricks'|'relics'>('general')
  const [showRewards,setShowRewards]=useState(false)
  useEffect(()=>{if(!demo)return;const timer=setTimeout(()=>setState(demo.after),600);return()=>clearTimeout(timer)},[demo])
  const reset=(next:boolean,nextStage:PreviewStage='hand',nextLineup=lineup)=>{setDemo(null);setFull(next);setStage(nextStage);setLineup(nextLineup);setState(fixture(next,nextStage,nextLineup))}
  const replay=(mode: 'effects'|'ending'=demoMode)=>{const next=mode==='effects'?(effectDemo==='relics'?createArenaRelicDemo():effectDemo==='arena_formation'||effectDemo==='arena_tricks'?createArenaLocationsDemo(effectDemo==='arena_formation'?'formation':'tricks'):effectDemo==='general'?createArenaEffectsDemo():createArenaArchetypeDemo(effectDemo)):createArenaEndingDemo(ending);setState(next.before);setDemo(next);setDemoMode(mode)}
  return <div className="practice-screen"><div className="clash-preview-tools"><select aria-label="Arena lineup" value={lineup} onChange={event=>reset(full,stage,event.target.value as ArenaLineup)}><option value="classic">Original arenas</option><option value="formation">Formation arenas</option><option value="tricks">Twist arenas</option><option value="random">Random arenas</option><option value="relics">Relics board</option></select><button disabled={lineup==='relics'} onClick={()=>reset(!full,stage)}>{full?'Sparse board':'Full board'}</button><button onClick={()=>reset(full,stage==='hand'?'empty':stage==='empty'?'result':'hand')}>{stage==='hand'?'Empty hand':stage==='empty'?'Show result':'Restore hand'}</button><select className="clash-preview-family" aria-label="Effect archetype" value={effectDemo} onChange={event=>setEffectDemo(event.target.value as typeof effectDemo)}><option value="general">All effects</option><option value="relics">Relics</option><option value="arena_formation">Formation arenas</option><option value="arena_tricks">Twist arenas</option><option value="transmutation">Transmutation</option><option value="affliction">Affliction</option><option value="sabotage">Sabotage</option><option value="conduits">Conduits</option></select><button aria-label="Preview effects" onClick={()=>replay('effects')}>Effects</button><button aria-label="Preview ending" onClick={()=>replay('ending')}>Ending</button><button aria-label="Preview card rewards" aria-pressed={showRewards} onClick={()=>setShowRewards(value=>!value)}>XP</button><select aria-label="Preview result" value={ending} onChange={event=>setEnding(event.target.value as typeof ending)}><option value="victory">Win</option><option value="defeat">Loss</option><option value="draw">Draw</option></select><Link to="/practice">Play →</Link></div>
    <ArenaBoard key={demo?state.roomId:`${full}:${stage}:${lineup}`} gameState={state} playerId="you" canAct={!demo&&!state.arena!.lockedIn.you} masteryReward={showRewards ? previewReceipt : undefined} onCommit={submission=>setState(current=>({...current,arena:{...current.arena!,lockedIn:{...current.arena!.lockedIn,you:true},committedPlays:submission.plays}}))} onSurrender={()=>reset(full,'result')} onExit={()=>navigate('/')}/>
  </div>
}
