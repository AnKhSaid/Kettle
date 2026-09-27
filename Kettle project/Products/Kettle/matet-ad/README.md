# MATET smart mate kettle — Arabic video ads (Remotion)

Three 30-second vertical ads (1080×1920, 30 fps) for Reels, TikTok, Shorts, Stories and WhatsApp Status, built with [Remotion](https://www.remotion.dev): every video is React code you can preview, scrub and edit in **Remotion Studio**, then render to MP4.

| Option | Video | Style |
|---|---|---|
| 1 · Story | `option-1-story.mp4` | The riddle ("the secret isn't in the leaves…") with a realistic 3D kettle modelled on the product photo |
| 2 · Illustrated | `option-2-illustrated.mp4` | Calm hand-drawn illustration on paper: one ink line turns leaf → drop → dial → kettle → sun → logo |
| 3 · Product | `option-3-product.mp4` | Bold product ad: the real product photo, colour cuts on the beat, big Arabic type |

Option 1 is driven by sound effects made for each moment of the ad (ElevenLabs Sound Effects; prompts in `tools/sfx-prompts.json`, regenerate with `tools/generate_sfx.mjs`), over a quiet piano bed ("Lovely Piano Song") that only comes up for the end card. Options 2 and 3 use "Hopeful".

## Quick start

```bash
npm i
npm run dev        # Remotion Studio: open Options/Option1-Story, Option2-Illustrated or Option3-Product
npm run video:1    # renders and masters option-1-story.mp4 (also video:2, video:3)
```

## Option 1 — story

| Time | Picture | Arabic text |
|---|---|---|
| 0–2.4s | Leaf motes drift, and a mate leaf falls onto water; its shadow grows, then ripples spread. The camera pushes in slowly | السرّ ليس في الأوراق… (calligraphic) |
| 2.4–4.8s | The water floods red with an organic, liquid edge and boils. A counter races to **100°**, and a hand-drawn X crosses it out. The leaf burns and flies off, and the camera shakes | ولا في الماء المغلي… |
| 4.8–7.2s | **Freeze.** The X erases itself, the red drains away, the counter rolls down to **77°** and turns green, and a dial ring draws itself | |
| 7.2–9.6s | **The drop.** 77° punches in, with leaf confetti and a warm light leak. A hand-drawn underline marks "المثالية" | **بل في الدرجة المثالية** |
| 9.6–14.4s | The ring flies into the kettle's dial, and the kettle sketches itself in ink. A scan line turns the drawing into the **3D kettle**. Four spec callouts spring out, pinned to the model | **إبريق متة ذكي** · specs |
| 14.4–19.2s | A carved mate gourd appears, and the kettle pours (the stream follows the spout). Steam rises and three "77°" badges land on the beats | **من أول صبّة… حتى الأخيرة** |
| 19.2–21.6s | A sun rises, energy runs from a solar panel to the base, and "500" is circled by hand | **500 واط فقط** |
| 21.6–24.0s | Close-up "how to": the button glows, the dial turns while the LED counts 28° → 77°, then steam | ١ اضغط · ٢ أدِر · ٣ استمتع |
| 24.0–30.0s | The opening leaf flies into the **MATET logo**. The kettle turns to face the camera, and on the song's final chord (26.4s) the call to action appears with the WhatsApp number and the Business Solutions Center logo | **إبريق متة ذكي** · متة مثالية في كل مرة · **اطلب الآن** |

The music ("Lovely Piano Song") is exactly 100 BPM, so 1 bar is 2.4 s (72 frames). The scene changes, callouts, badges and how-to steps land on its bars and beats. At the freeze (4.8 s) the kettle is switched off, the piano rings out in the room and the dial clicks down in silence; the piano returns at 7.2 s and its final note lands on the call to action (26.4 s).

## Project structure

```
src/
  Root.tsx              compositions: Options/Option1-Story, Option2-Illustrated, Option3-Product
  MatetAd.tsx           option 1: paper background → Opening → Product → vignette → soundtrack
  option2/              option 2: illustrated kettle, gourd, line boil, the whole film + its cue sheet
  option3/              option 3: product-photo kit (kit.tsx) and its shots + cue sheet
  scenes/               one file per scene (Leaf, Temperature, Reveal, Pour, Solar, HowTo, End)
  kettle/               3D kettle (three.js via @remotion/three), line art, poses
    pose.ts             where the kettle is at every moment + project() for 2D overlays
  components/           headline "slam", ink reveal, odometer, leaf, halo, light leak, paper
  audio/Soundtrack.tsx  music + every sound effect as <Audio>, on the same cue sheet
  lib/time.ts           timing, easing and keyframe helpers
public/                 fonts, logo, prepared audio
audio-src/              original CC0 music and sound effects (with credits)
tools/
  prepare_audio.py      the three music edits + the sound effects
  stills.mjs            renders PNG stills for quick review (npm run stills -- 3,8,13)
  master.mjs            final loudness pass (-14 LUFS) with Remotion's bundled ffmpeg
```

Remotion packages used:
- `@remotion/three` for the 3D kettle (physically based materials, lit by a real studio HDRI).
- `@remotion/paths` for the self-drawing lines.
- `@remotion/rough-notation` for the hand-drawn X, underlines and circle.
- `@remotion/effects` for the paper texture and light leak.
- `@remotion/noise` for the liquid edge.
- `@remotion/fonts` and `@remotion/media`.

## Editing

- **Text:** the Arabic lines live in the scene files, for example `scenes/EndScene.tsx` for the call to action and phone number.
- **Timing:** all times are global seconds on the music's grid. Change a scene's times and its sound effects in `audio/Soundtrack.tsx` together.
- **Colours and fonts:** `src/theme.ts`.
- **Audio:** after changing the music edit or adding sound effects, run `npm run audio` (needs Python with numpy, scipy and librosa).

## Notes

- `remotion.config.ts` uses a local Chrome Headless Shell if one exists at the configured path. It was needed only because the container that built this blocks Remotion's browser download. On a normal computer, Remotion downloads its own browser automatically. You can also set `REMOTION_BROWSER_EXECUTABLE` to use a specific build.
- WebGL is enabled with `Config.setChromiumOpenGlRenderer("angle")` for the 3D and the effects.

## Licences

- **Remotion:** free for individuals and for companies with **up to 3 employees**. Larger for-profit companies need a Company License from https://www.remotion.pro/license.
- **Music:** "Lovely Piano Song" and "Hopeful" by Kevin MacLeod, via FreePD, are public domain (CC0).
- **Sound effects:** CC0 (Kenney, Ben Burnes and others). See `audio-src/sfx/CREDITS.txt`.
- **Fonts:** Alexandria, Aref Ruqaa and Amiri, under the SIL Open Font License.
- **Studio HDRI:** "Studio Small 03" from Poly Haven, CC0.
- **Product photos (option 3):** cut out of the MATET brochure.
- **three.js:** MIT.
