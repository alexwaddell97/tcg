"""Create game-length copies of the user's public/SE recordings. Originals are read-only."""
import argparse
import array
import json
import shutil
import struct
import subprocess
import wave
from pathlib import Path

PUBLIC = Path(__file__).resolve().parents[1] / 'apps/web/public'
OUT = PUBLIC / 'sounds/recorded'
OUT.mkdir(parents=True, exist_ok=True)
RATE = 44100
ffmpeg = shutil.which('ffmpeg')
if not ffmpeg:
    raise SystemExit('ffmpeg is required to prepare the recordings.')
parser = argparse.ArgumentParser()
parser.add_argument('--only', help='Prepare one output filename from imports.json')
args = parser.parse_args()
recipes = json.loads((PUBLIC / 'sounds/imports.json').read_text())
if args.only and args.only not in recipes:
    raise SystemExit(f'Unknown recording: {args.only}')
for name, recipe in recipes.items():
    if args.only and name != args.only:
        continue
    source = PUBLIC / 'SE' / recipe['source']
    if Path(name).name != name or Path(recipe['source']).name != recipe['source']:
        raise ValueError('Use filenames without directory traversal in imports.json')
    # Decode only the requested range, without changing pitch or overwriting the MP3.
    raw = subprocess.check_output([ffmpeg, '-v', 'error', '-ss', str(recipe['start']), '-i', str(source),
        '-t', str(recipe['duration']), '-ac', '2', '-ar', str(RATE), '-f', 'f32le', '-'])
    samples = array.array('f', raw)
    frames = len(samples) // 2
    faded = []
    for i in range(frames):
        envelope = min(1, i / (RATE * .006), (frames - 1 - i) / (RATE * recipe.get('fadeOut', min(.08, recipe['duration'] * .2))))
        faded.extend([samples[i * 2] * envelope, samples[i * 2 + 1] * envelope])
    scale = .5 / max(max(abs(value) for value in faded), .001)
    with wave.open(str(OUT / name), 'wb') as target:
        target.setnchannels(2)
        target.setsampwidth(2)
        target.setframerate(RATE)
        target.writeframes(b''.join(struct.pack('<h', int(value * scale * 32767)) for value in faded))
    print(f'{recipe["source"]} -> recorded/{name} ({frames / RATE:.2f}s)')
