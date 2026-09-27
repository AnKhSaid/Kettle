# MATET smart mate kettle — Arabic video ad (Remotion)

This is a 30-second vertical ad (1080×1920, 30 fps) for Reels, TikTok, Shorts, Stories and WhatsApp Status. It is built with [Remotion](https://www.remotion.dev), where the whole video is React code. You can preview it, scrub it and edit it in **Remotion Studio**, then render it to MP4.

**Final video:** `matet-ad.mp4`

## Quick start

```bash
npm i
npm run dev        # opens Remotion Studio: preview, scrub, and edit text and timing
npm run video      # renders out/matet-ad-raw.mp4, then masters the loudness to matet-ad.mp4
```

In Studio, open **MatetAd** for the full ad. The folder **MatetAd-Scenes** holds its two parts, **Opening** and **Product**, as their own timelines.

## Story

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

The music ("Hopeful") is exactly 100 BPM, so 1 bar is 2.4 s (72 frames). The scene changes, callouts, badges and how-to steps land on its bars and beats.

## Project structure

```
src/
  Root.tsx              compositions: MatetAd + MatetAd-Scenes/Opening, Product
  MatetAd.tsx           paper background → Opening → Product → vignette → soundtrack
  scenes/               one file per scene (Leaf, Temperature, Reveal, Pour, Solar, HowTo, End)
  kettle/               3D kettle (three.js via @remotion/three), line art, poses
    pose.ts             where the kettle is at every moment + project() for 2D overlays
  components/           headline "slam", ink reveal, odometer, leaf, halo, light leak, paper
  audio/Soundtrack.tsx  music + every sound effect as <Audio>, on the same cue sheet
  lib/time.ts           timing, easing and keyframe helpers
public/                 fonts, logo, prepared audio
audio-src/              original CC0 music and sound effects (with credits)
tools/
  prepare_audio.py      edits the music to picture and converts the sound effects
  stills.mjs            renders PNG stills for quick review (npm run stills -- 3,8,13)
  master.mjs            final loudness pass (-14 LUFS) with Remotion's bundled ffmpeg
```

Remotion packages used:
- `@remotion/three` for the 3D kettle.
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
- **Music:** "Hopeful" by Kevin MacLeod, via FreePD, is public domain (CC0).
- **Sound effects:** CC0 (Kenney, Ben Burnes and others). See `audio-src/sfx/CREDITS.txt`.
- **Fonts:** Alexandria and Aref Ruqaa, under the SIL Open Font License.
- **three.js:** MIT.
