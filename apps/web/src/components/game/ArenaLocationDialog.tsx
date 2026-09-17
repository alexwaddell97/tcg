import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { ArenaLocation } from '@tcg/shared'
import { UI_ASSETS } from '../../lib/uiAssets.ts'
import './ArenaLocationDialog.css'

export default function ArenaLocationDialog({ location, onClose }: { location: ArenaLocation; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const rule = location.revealed ? location.rule : undefined
  useEffect(() => {
    const node = dialog.current!
    node.showModal()
    return () => node.close()
  }, [])

  return createPortal(<dialog ref={dialog} className={`arena-location-dialog theme-${rule ?? 'unknown'}`} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="arena-location-sheet">
      <button className="arena-location-close" onClick={onClose} aria-label="Close location details" autoFocus><X size={20} aria-hidden="true" /></button>
      <div className="arena-location-scroll">
        <header className="arena-location-hero">
          <img src={rule ? UI_ASSETS.locations[rule] : UI_ASSETS.battlefield} className="arena-location-illustration" alt="" draggable={false} />
          <div className="arena-location-heading">
            <h2 id={titleId}>{rule ? location.name : 'Uncharted arena'}</h2>
          </div>
        </header>
        <div className="arena-location-content">
          <p id={descriptionId} className="arena-location-rule">{rule ? location.description : `Reveals on turn ${location.revealTurn}. You can play cards here now.`}</p>
        </div>
      </div>
    </div>
  </dialog>, document.body)
}
