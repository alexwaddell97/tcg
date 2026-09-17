import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

// Keep ImageGen's artwork intact; an SVG clip confines each texture to its crystal outline.
// The generated checkerboard is opaque, so it must never be rendered outside this clip.
const sourceRoot = 'output/aether-shard-textures-v1'
const targetRoot = 'apps/web/public/ui/cards'
const shards = [
  { id: 'aether-energy-v1', viewBox: '310 22 620 1169', points: '625,22 930,575 894,747 625,1191 310,587' },
  { id: 'aether-power-v1', viewBox: '210 30 833 1120', points: '627,30 842,203 877,222 1043,349 1008,608 1017,780 627,1150 220,777 243,562 210,351 373,228 391,216 450,179' },
]
mkdirSync(targetRoot, { recursive: true })
for (const shard of shards) {
  const png = readFileSync(`${sourceRoot}/${shard.id}.png`)
  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  if (width !== 1254 || height !== 1254) throw new Error(`The ${shard.id} outline requires the reviewed 1254×1254 source`)
  const webpPath = `${sourceRoot}/${shard.id}.webp`
  execFileSync('cwebp', ['-quiet', '-q', '90', '-m', '6', `${sourceRoot}/${shard.id}.png`, '-o', webpPath])
  const texture = readFileSync(webpPath).toString('base64')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${shard.viewBox}"><defs><clipPath id="crystal"><polygon points="${shard.points}"/></clipPath></defs><image width="${width}" height="${height}" href="data:image/webp;base64,${texture}" clip-path="url(#crystal)"/></svg>\n`
  writeFileSync(`${targetRoot}/${shard.id}.svg`, svg)
  console.log(`Prepared ${shard.id}: ${Math.round(Buffer.byteLength(svg) / 1024)} KB`)
}
