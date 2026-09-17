import './ArenaTurnAnnouncement.css'

export default function ArenaTurnAnnouncement({ turn, totalTurns, energy }: { turn: number; totalTurns: number; energy: number }) {
  const final = turn === totalTurns
  return <div className={`clash-turn-announcement ${final ? 'is-last' : ''}`} role="status" aria-label={`${final ? 'Final turn' : 'Turn'} ${turn}. ${energy} aether available.`}>
    <div className="clash-turn-announcement-content" aria-hidden="true">
      <div className="clash-turn-announcement-rule"><i/><span>{final ? 'Final turn' : 'Turn'}</span><i/></div>
      <strong>{turn}</strong>
      <div className="clash-turn-announcement-pips">{Array.from({ length: totalTurns }, (_, index) => <i key={index} className={index + 1 === turn ? 'current' : index + 1 < turn ? 'complete' : ''}/>)}</div>
      <p>{energy} aether available</p>
      {final && <small>Make your last move count</small>}
    </div>
  </div>
}
