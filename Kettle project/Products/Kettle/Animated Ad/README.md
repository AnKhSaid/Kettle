# MATET Smart Mate Kettle — animated ad (Arabic), v2

This is a 30-second vertical ad (1080×1920, 30 fps) for Reels, TikTok, Shorts, Stories and WhatsApp Status. It mixes hand-drawn line animation with a real-time 3D model of the kettle. It is scored to a real, professionally produced track, with recorded sound effects synced to the picture.

**Final video:** `matet-ad.mp4`

## Story

The ad opens with a riddle, raises the tension, and then reveals the answer. The answer is the kettle's main feature.

| Time | Picture | Arabic text | Sound |
|---|---|---|---|
| 0–2.4s | Leaf motes drift, and a mate leaf falls (its shadow grows on the water), lands, and sends out ripples. The camera pushes in slowly | السرّ ليس في الأوراق… (calligraphic Ruqaa script) | The song's opening, muffled, and a real water drop |
| 2.4–4.8s | The screen floods red and boils. A counter races from 40° to **100°**, the leaf burns and flies off, the camera shakes, and 100° gets scribbled out | ولا في الماء المغلي… | A real boiling-water recording, and a marker scribble. The music opens up |
| 4.8–7.2s | **Freeze.** The bubbles stop, the red drains away, the counter rolls down to **77°** and turns green, and a dial ring draws around it | | Tape-stop to silence, then a deep bell, countdown ticks, and a reversed swell of the drop |
| 7.2–9.6s | **The drop.** 77° punches in and bursts into leaf confetti | **بل في الدرجة المثالية** | The music drops in on a section entrance |
| 9.6–14.4s | The ring morphs into the kettle's dial, the kettle sketches itself, then turns into the **3D kettle** on a turntable. The LED lights up at 77°, and four spec callouts pop out on the eighth notes | **إبريق متة ذكي** / يثبّت الحرارة التي تختارها… طوال الوقت · specs | Pencil lines, a soft whoosh and shimmer, and pops |
| 14.4–19.2s | A carved mate gourd appears, and the kettle lifts and pours. Steam rises and three "77°" badges land on the beats | **من أول صبّة… حتى الأخيرة** | Real pouring water, a wood knock, and glass chimes |
| 19.2–21.6s | A sun rises and energy runs from a solar panel to the base | **500 واط فقط** / متوافقة مع منظومات الطاقة الشمسية | A whoosh and soft ticks |
| 21.6–24.0s | Close-up "how to": a button press, the dial turning (the LED counts 28° → 77°), then a zoom out | ١ اضغط · ٢ أدِر · ٣ استمتع | A real button click, a ratchet and whooshes |
| 24.0–30.0s | The opening leaf flutters into the **MATET logo**. The kettle turns to face the camera (logo centred), and on the song's final chord (26.4s) the call to action appears with the number and the Business Solutions Center logo | **إبريق متة ذكي** · متة مثالية في كل مرة · **اطلب الآن** · +963 931 884 610 | Paper flutter, a logo knock, and the final chord ringing out |

## Files

| Path | What it is |
|---|---|
| `index.html` | The stage: layers, text, and styles. Open it through any static server (see below) to preview it with play and scrub controls. |
| `js/main.js` | The master timeline (GSAP) plus the procedural effects: bubbles, confetti, water, steam, callouts and camera shake. All timings are in seconds. |
| `js/kettle3d.js` | The 3D kettle and gourd (three.js). The model is built from the same profile numbers as the 2D line art, so the drawing lines up exactly with the 3D model. |
| `render.js` | A frame-accurate renderer: headless Chromium → PNG frames → ffmpeg → `matet-ad.mp4`. |
| `audio/build_audio.py` | Edits the music to picture (a muffled intro, a tape-stop, a reversed swell, and the drop on bar 36), places the recorded sound effects, mixes and masters. |
| `audio/music/` | "Hopeful" by Kevin MacLeod (FreePD, **CC0 / public domain**). It is 100 BPM, the same beat grid as the video. |
| `audio/sfx/` | Recorded sound effects, all **CC0**. See `audio/sfx/CREDITS.txt`. |
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
# tools: node + playwright (Chromium), ffmpeg, python3 (numpy scipy librosa)
python3 audio/build_audio.py              # -> audio/mix.wav
node render.js                            # -> matet-ad.mp4 (about 15 min on CPU)
node render.js --stills 3,8,13,17,20,25   # quick PNG checks in stills/
npx http-server .                         # then open http://localhost:8080 for the live preview
```

## Licences

- **Music:** "Hopeful" by Kevin MacLeod, via FreePD, is public domain (CC0). You can use it commercially without attribution.
- **Sound effects:** all CC0 (Kenney, and Ben Burnes' packs, among others). See `audio/sfx/CREDITS.txt`.
- **GSAP:** free for commercial use under its standard license.
- **three.js:** MIT.
- **Fonts:** OFL.
