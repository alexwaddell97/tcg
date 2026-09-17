import { UI_ASSETS } from '../../lib/uiAssets.ts'
import './PackTear.css'

export function packName(packId: string) {
  return packId === 'eternal' ? 'Eternal' : packId === 'expanded' ? 'Expanded' : 'Core'
}

/** Bespoke foil art, with the authentic brand mark shared by the shop and tearable wrapper. */
export default function PackArt({ packId, className = '' }: { packId: string; className?: string }) {
  const foil = packId === 'expanded' ? UI_ASSETS.expandedPackFoil : packId === 'eternal' ? UI_ASSETS.eternalPackFoil : UI_ASSETS.packFoil
  return <div className={`pack-art pack-art-${packId} ${className}`} aria-hidden="true">
    <img className="pack-art-foil" src={foil} alt="" draggable={false}/>
    <img className="pack-art-logo" src={UI_ASSETS.logo} alt="" draggable={false}/>
    <span className="pack-art-set"><span className="pack-art-set-lettering">{packName(packId)}</span></span>
  </div>
}
