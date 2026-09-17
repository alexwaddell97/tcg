"""Deterministic, non-melodic placeholder foley; no third-party samples.

Existing files are preserved unless --overwrite is explicitly supplied.
"""
import argparse
import math
import random
import struct
import wave
from pathlib import Path

RATE = 44100
OUT = Path(__file__).resolve().parents[1] / 'apps/web/public/sounds'
OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--overwrite', action='store_true', help='Replace existing WAVs, including any custom recordings with those names')
args = parser.parse_args()


class Sound:
    def __init__(self, duration, seed):
        self.samples = [0.0] * int(duration * RATE)
        self.random = random.Random(seed)

    def rub(self, start, duration, volume=.4, roughness=.5):
        """Irregular filtered friction: paper fibres, cloth or granular scraping."""
        offset = int(start * RATE)
        low = slower = modulation = target = 0
        for i in range(min(int(duration * RATE), len(self.samples) - offset)):
            u = i / (duration * RATE)
            noise = self.random.uniform(-1, 1)
            low += (.08 + roughness * .38) * (noise - low)
            slower += .025 * (low - slower)
            if i % 420 == 0:
                target = self.random.uniform(.25, 1)
            modulation += .004 * (target - modulation)
            envelope = math.sin(math.pi * u) ** .8
            self.samples[offset + i] += volume * (low - slower * .65) * envelope * modulation
        return self

    def tap(self, start, volume=.4, weight=1):
        """Noise-excited damped wood modes and a tiny surface slap; no note/chirp."""
        duration = .15 * weight
        offset = int(start * RATE)
        modes = [(187 / weight, .012 * weight, .5), (413 / weight, .008 * weight, .26), (931 / weight, .004 * weight, .12)]
        coefficients = [(2 * math.exp(-1 / (RATE * decay)) * math.cos(math.tau * hz / RATE), math.exp(-2 / (RATE * decay)), gain) for hz, decay, gain in modes]
        history = [[0.0, 0.0] for _ in modes]
        for i in range(min(int(duration * RATE), len(self.samples) - offset)):
            t = i / RATE
            noise = self.random.uniform(-1, 1)
            excitation = noise * math.exp(-t / .0015)
            body = 0
            for (a, b, gain), h in zip(coefficients, history):
                y = excitation * .015 + a * h[0] - b * h[1]
                h[1], h[0] = h[0], y
                body += y * gain
            surface = noise * math.exp(-t / .004) * .4
            self.samples[offset + i] += volume * (body + surface) * min(t / .0006, 1)
        return self

    def write(self, name, peak=.5, space=.07):
        path = OUT / f'{name}.wav'
        if path.exists() and not args.overwrite:
            print(f'Kept {path.name} (use --overwrite to regenerate)')
            return
        left, right = self.samples.copy(), self.samples.copy()
        # Close, dry room reflections rather than a long magical/reverb tail.
        for channel, delay in [(left, .023), (right, .031)]:
            offset = int(delay * RATE)
            for i in range(offset, len(channel)):
                channel[i] += self.samples[i - offset] * space
        maximum = max(max(abs(s) for s in left), max(abs(s) for s in right), .001)
        scale = peak / maximum
        data = bytearray()
        for i, (l, r) in enumerate(zip(left, right)):
            fade = min(1, i / (RATE * .001), (len(left) - 1 - i) / (RATE * .02))
            data += struct.pack('<hh', int(l * scale * fade * 32767), int(r * scale * fade * 32767))
        with wave.open(str(path), 'wb') as target:
            target.setnchannels(2)
            target.setsampwidth(2)
            target.setframerate(RATE)
            target.writeframes(data)
        print(f'{path.name}: {len(left) / RATE:.2f}s')


# Paper separating from a deck; fingertips/card stock landing on a wooden table.
Sound(.28, 11).rub(0, .15, .7, .85).rub(.09, .12, .4, .65).tap(.16, .14, .6).write('card-draw', .38)
Sound(.24, 12).rub(0, .055, .28).tap(.027, .9, .85).tap(.061, .14, .6).write('card-place', .5)
Sound(.40, 13).rub(0, .15, .6, .75).tap(.105, .8, 1.1).rub(.13, .12, .2).write('card-reveal', .54)
# Cloth, scuffs and little stone/wood contacts give ability cues material texture.
Sound(.62, 21).rub(0, .26, .6, .18).tap(.20, .52, 1.25).rub(.22, .26, .4, .8).write('spell-cast', .48)
Sound(.50, 22).rub(0, .13, .24, .35).tap(.065, .5, 1).tap(.17, .7, .8).write('power-rise', .45)
Sound(.62, 23).rub(0, .39, .7, .88).tap(.26, .48, 1.4).rub(.3, .23, .3, .1).write('curse', .44)
Sound(.61, 24).rub(0, .23, .45, .6).tap(.04, .25, .6).tap(.14, .4, .75).tap(.29, .6, 1.1).write('transmute', .46)
Sound(.48, 31).tap(.005, .7, 1.5).tap(.034, .27, .72).rub(.04, .14, .12, .15).write('score-reveal', .55)
Sound(.66, 32).rub(0, .34, .5, .2).tap(.19, .5, 1.45).tap(.24, .13, .6).write('turn-start', .45)
# A short percussive flourish instead of an electronic fanfare.
Sound(1.35, 41).tap(.015, .42, 1).tap(.14, .36, .85).tap(.26, .48, 1.1).tap(.44, .95, 1.9).rub(.44, .50, .21, .12).write('victory', .58, .13)
Sound(.96, 42).tap(.015, .8, 2.1).rub(.06, .65, .34, .1).write('defeat', .46, .11)
Sound(.76, 43).tap(.015, .5, 1.25).tap(.21, .5, 1.25).rub(.21, .25, .13, .2).write('match-draw', .44)
