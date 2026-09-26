# MATET Smart Mate Kettle — animated ad (Arabic), v2

This is a 30-second vertical ad (1080×1920, 30 fps) for Reels, TikTok, Shorts, Stories and WhatsApp Status. It mixes hand-drawn line animation with a real-time 3D model of the kettle, and it has an original score played on sampled instruments with sound effects synced to the picture.

**Final video:** `matet-ad.mp4`

## Story

The ad opens with a riddle, raises the tension, and then reveals the answer. The answer is the kettle's main feature.

| Time | Picture | Arabic text | Sound |
|---|---|---|---|
| 0–2.4s | A mate leaf drifts down and lands on water, and ripples spread out | السرّ ليس في الأوراق… (calligraphic Ruqaa script) | Ney-like flute in maqam Hijaz over a cello drone, and a water drop |
| 2.4–4.8s | The screen floods red and boils. A counter races from 40° to **100°**, the leaf burns and flies off, the camera shakes, and 100° gets scribbled out | ولا في الماء المغلي… | Bubbling, a rising tremolo, an oud run, an accelerating darbuka roll, and a marker scribble |
| 4.8–7.2s | **Freeze.** The bubbles stop, the red drains away, the counter rolls down to **77°** and turns green, and a dial ring draws around it | | Tape-stop to silence, then a sub-boom, a celesta countdown, mechanical ticks and a reverse swell |
| 7.2–9.6s | **The drop.** 77° punches in and bursts into leaf confetti | **بل في الدرجة المثالية** | The groove kicks in: maqsum darbuka rhythm, bass, oud and qanun-style lead |
| 9.6–14.4s | The ring morphs into the kettle's dial, the kettle sketches itself in ink, and a scan line turns the drawing into a **3D kettle** that turns on a turntable. The LED lights up at 77°, and four spec callouts pop out | **إبريق متة ذكي** / يثبّت الحرارة التي تختارها… طوال الوقت · عنق رفيع · سعة 0.6 لتر · شاشة LED دائرية · ستانلس ستيل 304 | Sketch sounds, a shimmer, an LED beep, and pops on each callout |
| 14.4–19.2s | A carved mate gourd pops in, and the kettle lifts and pours. Steam rises and three "77°" badges stamp in, one per pour | **من أول صبّة… حتى الأخيرة** | Harp, the pour, steam, and three glockenspiel dings |
| 19.2–21.6s | A sun rises behind the kettle, and energy runs from a solar panel to the base | **500 واط فقط** / متوافقة مع منظومات الطاقة الشمسية | A string swell and electric zaps |
| 21.6–24.0s | Close-up "how to" in three beats: the power button glows, the dial turns (the LED counts 28° → 77°), then it zooms out | ١ اضغط · ٢ أدِر · ٣ استمتع | A click, a boot beep, a ratchet and whooshes |
| 24.0–30.0s | The opening leaf flies back in and becomes the **MATET logo**. The hero kettle spins, and the call to action and WhatsApp number appear with the Business Solutions Center logo | **إبريق متة ذكي** · متة مثالية في كل مرة · **اطلب الآن** · +963 931 884 610 | A crash, a logo chime, the final D-major chord and an impact |

## Files

| Path | What it is |
|---|---|
| `index.html` | The stage: layers, text, and styles. Open it through any static server (see below) to preview it with play and scrub controls. |
| `js/main.js` | The master timeline (GSAP) plus the procedural effects: bubbles, confetti, water, steam, callouts and camera shake. All timings are in seconds. |
| `js/kettle3d.js` | The 3D kettle and gourd (three.js). The model is built from the same profile numbers as the 2D line art, so the drawing lines up exactly with the 3D model. |
| `render.js` | A frame-accurate renderer: headless Chromium → PNG frames → ffmpeg → `matet-ad.mp4`. |
| `audio/build_audio.py` | Composes the score (MIDI), renders it with FluidSynth, synthesises the sound effects, mixes and masters (−14 LUFS). |
| `audio/mix.wav` | The final mastered soundtrack. |
| `audio/stem_music.wav`, `audio/stem_sfx.wav` | Separate music and sound-effect stems, for re-editing in Premiere. |
| `lib/` | GSAP 3.15 (with its DrawSVG, MorphSVG and CustomEase plugins) and three.js r186. |
| `fonts/` | Alexandria and Aref Ruqaa (SIL Open Font License). |

## Editing

- **Text:** change the `<div id="t…">` elements in `index.html`, the `.pill` callouts, and the `.badge` elements.
- **Timing:** each scene is a commented block in `js/main.js`, labelled A to I.
- **Colours:** change the CSS variables at the top of `index.html`.
- **Phone number:** edit `#phone` in `index.html`.

If you change a scene's timing, change the matching cues in `audio/build_audio.py`. Both use the same seconds.

## Rebuilding

```bash
# tools: node + playwright (Chromium), ffmpeg, python3 (numpy scipy mido), fluidsynth
curl -L -o audio/GeneralUser-GS.sf2 https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/GeneralUser-GS.sf2
python3 audio/build_audio.py              # -> audio/mix.wav
node render.js                            # -> matet-ad.mp4 (about 15 min on CPU)
node render.js --stills 3,8,13,17,20,25   # quick PNG checks in stills/
npx http-server .                         # then open http://localhost:8080 for the live preview
```

## Licences

- **GeneralUser GS soundfont:** free for commercial music production (see `audio/GeneralUser-GS-LICENSE.txt`).
- **GSAP:** free for commercial use under its standard license.
- **three.js:** MIT.
- **Fonts:** OFL.

The music and sound effects were composed and synthesised for this ad.
