import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { Server } from 'socket.io'
import { io as connect, type Socket } from 'socket.io-client'
import { ArenaEngine, ARENA_ARCHETYPE_DECKS, ARENA_CARD_DATABASE, ARENA_STARTER_DECK, ARENA_POSITIONS, getArenaDeckError, getArenaLocationPower, getArenaCardPower, getArenaMatchScore, getArenaPlanError } from '../packages/shared/src/index.ts'
import type { ArenaIndex, ArenaPlay, GameState, Room, Card, ArenaLocation } from '../packages/shared/src/index.ts'
import { registerMatchmakingHandlers } from '../apps/server/src/socket/lobbyHandlers.ts'
import { registerGameHandlers } from '../apps/server/src/socket/gameHandlers.ts'
import { roomManager } from '../apps/server/src/game/RoomManager.ts'

function deck(first: string[] = []) { return [...new Set([...first,...ARENA_STARTER_DECK,...ARENA_CARD_DATABASE.map(card=>card.definitionId)])].slice(0,12) }
function room(firstA: string[] = [], firstB: string[] = firstA): Room {
  return { id:crypto.randomUUID(),name:'Arena test',hostId:'a',status:'in_progress',maxPlayers:2,isPrivate:true,createdAt:0,
    players:['a','b'].map((id,i)=>({id,displayName:'Same name',isReady:true,deckDefinitionIds:deck(i?firstB:firstA)})) }
}
function engine(a: string[] = [], b: string[] = a) { return new ArenaEngine(room(a,b),{shuffle:false}) }
function plays(game: ArenaEngine, id: string, entries: [string,ArenaIndex][]): ArenaPlay[] {
  return entries.map(([definitionId,locationIndex])=>{
    const card=game.getStateFor(id).hand!.find(card=>card.definitionId===definitionId)
    assert.ok(card,`${id} must have ${definitionId} in hand`)
    return {cardInstanceId:card.instanceId,locationIndex}
  })
}
function commit(game:ArenaEngine,id:string,entries:[string,ArenaIndex][]=[]){
  const state=game.getStateFor(id)
  return game.processAction({type:'commit_turn',playerId:id,submission:{turn:state.turn,plays:plays(game,id,entries)},timestamp:0})
}
function turn(game:ArenaEngine,a:[string,ArenaIndex][]=[],b:[string,ArenaIndex][]=[]){
  assert.equal(commit(game,'a',a).success,true)
  assert.equal(commit(game,'b',b).success,true)
}
function finish(game:ArenaEngine){while(!game.isGameOver().over)turn(game)}
function placed(game:ArenaEngine,id:string,definitionId:string){return game.getStateFor(id).arena!.locations.flatMap(location=>location.cards[id]).find(entry=>entry.card.definitionId===definitionId)!}

test('arena starts with 12 distinct cards, 4 in hand, 1 energy and hidden future rules',()=>{
  const game=engine();const state=game.getStateFor('a')
  assert.equal(state.boardType,'arena');assert.equal(state.hand!.length,4);assert.equal(state.players.a.deckCount,8)
  assert.equal(state.arena!.energy,1);assert.equal(state.arena!.totalTurns,6)
  assert.deepEqual(state.arena!.locations.map(location=>location.revealed),[true,false,false])
  assert.equal(state.arena!.locations[1].rule,undefined)
  assert.equal(state.arena!.locations[1].definitionId,'unrevealed')
  state.hand![0].power=999;state.arena!.locations[0].name='changed'
  assert.notEqual(game.getStateFor('a').hand![0].power,999)
  assert.equal(game.getStateFor('a').arena!.locations[0].name,'The Forge')
})

test('server validates deck length, uniqueness, unknown cards and generated tokens',()=>{
  assert.equal(getArenaDeckError(undefined),null);assert.equal(getArenaDeckError(ARENA_STARTER_DECK),null)
  assert.ok(getArenaDeckError(Array(12).fill('village_scout')))
  assert.ok(getArenaDeckError(ARENA_STARTER_DECK.slice(0,11)))
  assert.equal(getArenaDeckError(['master_forger',...ARENA_STARTER_DECK.slice(1)]), null, 'Master Forger now has its own collectible Arena definition')
  assert.ok(getArenaDeckError(['burden_token',...ARENA_STARTER_DECK.slice(1)]))
  assert.ok(getArenaDeckError(['unknown',...ARENA_STARTER_DECK.slice(1)]))
  assert.ok(ARENA_CARD_DATABASE.every(card=>card.cost>=1&&card.cost<=6&&!card.isTransformTarget))
})

test('invalid and duplicate plans are atomic; stale plans and old placement actions fail',()=>{
  const game=engine();const state=game.getStateFor('a');const scout=state.hand![0].instanceId
  const badPlans=[null,[{cardInstanceId:scout,locationIndex:3}],[{cardInstanceId:scout,locationIndex:.5}],[{cardInstanceId:'missing',locationIndex:0}],
    [{cardInstanceId:scout,locationIndex:0},{cardInstanceId:scout,locationIndex:1}],plays(game,'a',[['wandering_blade',0]])]
  for(const plan of badPlans){
    assert.equal(game.processAction({type:'commit_turn',playerId:'a',submission:{turn:1,plays:plan as ArenaPlay[]},timestamp:0}).success,false)
    assert.deepEqual(game.getStateFor('a'),state)
  }
  assert.equal(game.processAction({type:'commit_turn',playerId:'a',submission:{turn:0,plays:[]},timestamp:0}).success,false)
  assert.equal(game.processAction({type:'place_card',playerId:'a',cardInstanceId:scout,hexCoord:[0,0],timestamp:0}).success,false)
})

test('committed hands and destinations stay private until both players lock in',()=>{
  const game=engine();const id=game.getStateFor('a').hand![0].instanceId
  assert.equal(commit(game,'a',[['village_scout',0]]).success,true)
  const a=game.getStateFor('a'), b=game.getStateFor('b')
  assert.equal(a.turn,1);assert.equal(a.hand!.length,4);assert.equal(a.arena!.committedPlays!.length,1)
  assert.equal(b.arena!.lockedIn.a,true);assert.deepEqual(b.arena!.committedPlays,[])
  assert.equal(JSON.stringify(b).includes(id),false)
  assert.equal(commit(game,'a').success,false)
  assert.equal(commit(game,'b').success,true)
  const next=game.getStateFor('a')
  assert.equal(next.turn,2);assert.equal(next.arena!.energy,2)
  assert.equal(next.arena!.revealFirstPlayerId,'b')
  assert.equal(next.arena!.locations[0].cards.a[0].card.instanceId,id)
})

test('Rally checks the score before its own reveal, with alternating priority',()=>{
  const game=engine()
  turn(game,[['village_scout',0]])
  turn(game,[['forge_apprentice',0]],[['wandering_blade',0]])
  assert.equal(placed(game,'b','wandering_blade').card.powerBonus,3) // Rally 2 + Forge 1
  assert.equal(placed(game,'a','forge_apprentice').card.powerBonus,1) // B now leads, so no Pressure
  assert.equal(getArenaLocationPower(game.getStateFor('a').arena!.locations[0],'a'),6)
  assert.equal(getArenaLocationPower(game.getStateFor('a').arena!.locations[0],'b'),5)
})

test('Pressure rewards an existing lead, while Parity sees ties before placement',()=>{
  const game=engine()
  turn(game,[['village_scout',0]],[['spark_sprite',1]])
  assert.equal(placed(game,'b','spark_sprite').card.powerBonus,2)
  turn(game,[['forge_apprentice',0]])
  assert.equal(placed(game,'a','forge_apprentice').card.powerBonus,3) // Pressure 2 + Forge 1
})

test('four-unit capacity is enforced but spells still resolve on a full arena',()=>{
  const game=engine(['village_scout','bone_knight','iron_golem','ritual_caster','mountain_hermit','temper'])
  turn(game,[['village_scout',0]]);turn(game,[['bone_knight',0]]);turn(game,[['iron_golem',0]]);turn(game,[['ritual_caster',0]])
  const before=game.getStateFor('a')
  assert.equal(commit(game,'a',[['mountain_hermit',0]]).success,false)
  assert.deepEqual(game.getStateFor('a'),before)
  turn(game,[['temper',0]])
  assert.equal(game.getStateFor('a').arena!.locations[0].cards.a.length,4)
  assert.equal(placed(game,'a','iron_golem').card.powerBonus,4)
})

test('draw caps preserve deck cards; growth only starts after the placement turn',()=>{
  const game=engine(['mountain_hermit','mana_surge','village_scout'])
  turn(game);turn(game,[['mountain_hermit',1]])
  assert.equal(placed(game,'a','mountain_hermit').card.powerBonus,0)
  turn(game,[['mana_surge',1]])
  assert.equal(placed(game,'a','mountain_hermit').card.powerBonus,2) // Sanctum spell + growth
  while(game.getStateFor('a').turn<6)turn(game)
  const state=game.getStateFor('a')
  assert.equal(state.hand!.length,7)
  assert.equal(state.players.a.deckCount,3) // 12 - 2 played - 7 in hand
})

test('ongoing support and Summit power are recomputed without mutating cards',()=>{
  const instance=(id:string):Card=>({...ARENA_CARD_DATABASE.find(card=>card.definitionId===id)!,instanceId:id,powerBonus:0,questProgress:0,isTransformed:false})
  const ally=instance('thunder_hawk'), leader=instance('apprentice_mage')
  const site:ArenaLocation={index:0,definitionId:'the_summit',name:'The Summit',description:'',revealTurn:1,revealed:true,rule:'summit',cards:{a:[{card:ally,placedOnTurn:1},{card:leader,placedOnTurn:1}],b:[]}}
  assert.equal(getArenaCardPower(site,'a',ally),8) // 5 + summit 2 + aura 1
  assert.equal(ally.power,5)
  site.cards.a.pop()
  assert.equal(getArenaCardPower(site,'a',ally),7)
})

test('winning two arenas beats higher total power in one; all matches end on turn 6',()=>{
  const game=engine(['village_scout','bone_knight'],['ironclad_colossus'])
  turn(game,[['village_scout',0]]);turn(game,[['bone_knight',1]])
  while(game.getStateFor('a').turn<6)turn(game)
  turn(game,[],[['ironclad_colossus',2]])
  assert.equal(game.getStateFor('a').winner,'a')
  assert.deepEqual(getArenaMatchScore(game.getStateFor('a'),'a'),{locations:2,power:6})
  assert.deepEqual(getArenaMatchScore(game.getStateFor('a'),'b'),{locations:1,power:14})
  assert.equal(game.processAction({type:'surrender',playerId:'a',timestamp:0}).success,false)
  assert.equal(game.getStateFor('a').winner,'a')
})

test('tied arenas use total power and equal power produces a true draw',()=>{
  const powerGame=engine();turn(powerGame,[['village_scout',0]],[['village_scout',1]]);finish(powerGame)
  assert.equal(powerGame.getStateFor('a').winner,'a')
  const drawGame=engine();turn(drawGame,[['village_scout',0]],[['village_scout',0]]);finish(drawGame)
  assert.deepEqual(drawGame.isGameOver(),{over:true,winnerId:undefined,reason:'match_complete'})
})

function event<T>(socket:Socket,name:string):Promise<T>{return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{socket.off(name,handler);reject(new Error(`Timed out: ${name}`))},4000)
  const handler=(value:T)=>{clearTimeout(timer);resolve(value)};socket.once(name,handler)
})}

test('two socket clients use expansion decks, reveal private plans and complete all six turns', {timeout:15000}, async()=>{
  const http=createServer();const server=new Server(http);let nextId=0
  server.on('connection',socket=>{socket.data.playerId=`player-${nextId++}`;socket.data.displayName='Same name';registerMatchmakingHandlers(server,socket);registerGameHandlers(server,socket)})
  http.listen(0,'127.0.0.1');await once(http,'listening')
  const port=(http.address() as {port:number}).port
  const clients=[connect(`http://127.0.0.1:${port}`,{transports:['websocket'],autoConnect:false}),connect(`http://127.0.0.1:${port}`,{transports:['websocket'],autoConnect:false})]
  let roomId:string|undefined
  try {
    const connected=clients.map(socket=>event(socket,'connect'));clients.forEach(socket=>socket.connect());await Promise.all(connected)
    const invalid=event<{message:string}>(clients[0],'matchmaking:error')
    clients[0].emit('matchmaking:join',{displayName:'Same name',deckDefinitionIds:Array(12).fill('village_scout')})
    assert.match((await invalid).message,/one copy/)
    const starts=clients.map(socket=>event<GameState>(socket,'game:start'))
    clients.forEach((socket,index)=>socket.emit('matchmaking:join',{displayName:'Same name',deckDefinitionIds:ARENA_ARCHETYPE_DECKS[index].cards,
      avatarId:index?'guardian':'oracle',titleId:index?'wanderer':'challenger',
      cardBorders:Object.fromEntries(ARENA_ARCHETYPE_DECKS[index].cards.map(id=>[id,index?'jade':'arcane']))}))
    let states=await Promise.all(starts);roomId=states[0].roomId
    assert.notEqual(states[0].viewerPlayerId,states[1].viewerPlayerId)
    for (const state of states) {
      assert.equal(state.players[states[0].viewerPlayerId!].avatarId,'oracle')
      assert.equal(state.players[states[0].viewerPlayerId!].titleId,'challenger')
      assert.equal(state.players[states[1].viewerPlayerId!].avatarId,'guardian')
      assert.equal(state.players[states[1].viewerPlayerId!].titleId,'wanderer')
    }
    states.forEach((state,index)=>assert.ok(state.hand!.every(card=>card.cosmeticBorder===(index?'jade':'arcane'))))
    const playedDefinitions=[new Set<string>(),new Set<string>()]
    const questTotals=[{unitsPlayed:0,spellsPlayed:0,aetherSpent:0},{unitsPlayed:0,spellsPlayed:0,aetherSpent:0}]
    for(let n=1;n<=6;n++) {
      const revealedIds: string[] = []
      const reservedSlots = new Map<string, number>()
      for(let player=0;player<2;player++) {
        const updates=clients.map(socket=>event<GameState>(socket,'game:state_update'))
        const result=event<{success:boolean}>(clients[player],'game:action_result')
        const finishes=n===6&&player===1?clients.map(socket=>event<{winnerId:string|null}>(socket,'game:over')):[]
        const view=states[player]
        const choice=view.hand!.flatMap(card=>view.arena!.locations.flatMap(location=>[...ARENA_POSITIONS].reverse().map(slotIndex=>({cardInstanceId:card.instanceId,locationIndex:location.index,slotIndex}))))
          .find(play=>!getArenaPlanError(view,view.viewerPlayerId!,view.hand!,[play]))
        if(choice){
          revealedIds.push(choice.cardInstanceId)
          const chosenCard=view.hand!.find(card=>card.instanceId===choice.cardInstanceId)!
          questTotals[player].aetherSpent+=chosenCard.cost
          if(chosenCard.type==='unit')questTotals[player].unitsPlayed++
          if(chosenCard.type==='spell')questTotals[player].spellsPlayed++
          if(chosenCard.type==='unit')reservedSlots.set(choice.cardInstanceId,choice.slotIndex)
          // Sabotage can put a generated Burden into this hand; tokens earn no mastery.
          if(!chosenCard.arenaToken)playedDefinitions[player].add(chosenCard.definitionId)
        }
        clients[player].emit('game:commit_turn',{turn:n,plays:choice?[choice]:[]})
        assert.equal((await result).success,true);states=await Promise.all(updates)
        assert.equal(states[0].turn,player===0?n:Math.min(n+1,6))
        if(n<6||player===0)states.forEach(state=>assert.equal(state.arena!.questReceipt,undefined))
        if(player===0){
          assert.equal(states[1].arena!.lockedIn[states[0].viewerPlayerId!],true)
          if(choice)assert.equal(JSON.stringify(states[1]).includes(choice.cardInstanceId),false)
        }else{
          const reveal=states[0].arena!.lastReveal!
          assert.equal(reveal.turn,n)
          assert.deepEqual(new Set(reveal.events.filter(event=>event.kind==='card').map(event=>event.card!.instanceId)),new Set(revealedIds))
          assert.deepEqual(states[0].arena!.lastReveal,states[1].arena!.lastReveal)
          for(const event of reveal.events.filter(event=>event.kind==='card'&&event.card!.type==='unit')) {
            const arrival=event.arrival!.flatMap(location=>location.cards[event.playerId!]).find(placed=>placed.card.instanceId===event.card!.instanceId)!
            assert.equal(arrival.slotIndex,reservedSlots.get(event.card!.instanceId),'the submitted position survives the socket and reveal')
          }
          for(const event of reveal.events.filter(event=>event.kind==='card'))assert.equal(event.card!.cosmeticBorder,event.card!.arenaToken?'bronze':event.playerId===states[0].viewerPlayerId?'arcane':'jade')
        }
        assert.deepEqual(states[1].arena!.committedPlays,[])
        if(finishes.length)assert.deepEqual(await Promise.all(finishes),clients.map(()=>({winnerId:states[0].winner??null,reason:'match_complete'})))
      }
    }
    assert.equal(states[0].phase,'game_over')
    states.forEach((state,index)=>{
      assert.deepEqual(new Set(state.arena!.masteryReward!.cards.map(card=>card.definitionId)),playedDefinitions[index])
      assert.ok(state.arena!.masteryReward!.cards.every(card=>card.xp===20))
      const quest=state.arena!.questReceipt!
      assert.equal(quest.matchId,state.arena!.masteryReward!.matchId)
      assert.equal(quest.metrics.unitsPlayed,questTotals[index].unitsPlayed)
      assert.equal(quest.metrics.spellsPlayed,questTotals[index].spellsPlayed)
      assert.equal(quest.metrics.aetherSpent,questTotals[index].aetherSpent)
      assert.equal(quest.metrics.arenasWon,getArenaMatchScore(state,state.viewerPlayerId!).locations)
    })
  } finally {
    clients.forEach(socket=>socket.disconnect());await new Promise<void>(resolve=>server.close(()=>resolve()));if(roomId)roomManager.removeRoom(roomId)
  }
})

test('moving a newly played unit does not consume the Forge reveal bonus',()=>{
  const game=engine(['village_scout','phase_walk','spark_sprite'])
  turn(game);turn(game)
  turn(game,[['village_scout',1],['phase_walk',0],['spark_sprite',0]])
  const state=game.getStateFor('a')
  assert.equal(state.arena!.locations[1].cards.a.length,0)
  assert.equal(state.arena!.locations[0].cards.a.length,2)
  assert.equal(placed(game,'a','spark_sprite').card.powerBonus,1)
})

test('Ward protects against enemy drain and drain selects the strongest other target',()=>{
  const game=engine(['ancient_guardian','village_scout'],['forge_wraith'])
  turn(game,[['village_scout',0]])
  while(game.getStateFor('a').turn<5)turn(game)
  turn(game,[['ancient_guardian',0]],[['forge_wraith',0]])
  assert.equal(placed(game,'a','ancient_guardian').card.powerBonus,1)
  assert.equal(placed(game,'a','village_scout').card.powerBonus,-2)
})
