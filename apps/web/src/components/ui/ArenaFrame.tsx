/** Metal edging stays sharp at every panel size; all content remains live HTML. */
export default function ArenaFrame({ ornate = false }: { ornate?: boolean }) {
  return <svg className={`ae-frame ${ornate ? 'ae-frame-ornate' : ''}`} viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true">
    <path className="ae-frame-shadow" d="M16 2 H284 L298 16 V384 L284 398 H16 L2 384 V16 Z" />
    <path className="ae-frame-light" d="M16 2 H284 L298 16 V384 L284 398 H16 L2 384 V16 Z" />
    <path className="ae-frame-inner" d="M19 8 H281 L292 19 V381 L281 392 H19 L8 381 V19 Z" />
    {ornate && <><path className="ae-frame-flourish" d="M8 44 H21 V21 H44 M256 21 H279 V44 H292 M8 356 H21 V379 H44 M256 379 H279 V356 H292" /><path className="ae-frame-gem" d="M150 2 l5 6 -5 6 -5 -6 Z M150 386 l5 6 -5 6 -5 -6 Z" /></>}
  </svg>
}
