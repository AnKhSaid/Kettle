# MATET Smart Mate Kettle — animated ad (Arabic)

A 26-second vertical (1080×1920, 9:16) motion ad for Reels, TikTok, WhatsApp Status and Stories.
Style: warm cream paper, hand-drawn lines that draw themselves, flat fills, soft grain, and calm motion.

**Final video:** `matet-ad.mp4`

## Script (storyboard)

| Time | On screen | Copy |
|---|---|---|
| 0–4s | A mate leaf draws itself, then fills green | **السرّ ليس في الأوراق…** |
| 4–9s | A temperature dial fills to **100°**, which gets crossed out, then cools to **77°** as the colour turns from clay to green | **ولا في الماء المغلي…** → **بل في الدرجة المثالية** |
| 9–14s | The dial shrinks into a callout, the MATET kettle draws itself and turns matte black, and the base LED lights up at 77° | **إبريق متة ذكي** / يثبّت الحرارة التي تختارها… طوال الوقت |
| 14–18.6s | The camera tilts the kettle, and the gooseneck pours into a mate gourd with steam rising | **من أول صبّة… حتى الأخيرة** |
| 18.6–21.6s | Three features with line icons | حرارة ثابتة بدقة · تعمل على الطاقة الشمسية (500 واط) · عنق رفيع لصبّ دقيق |
| 21.6–26.5s | MATET logo, headline, call to action, WhatsApp number, Business Solutions Center logo | **إبريق متة ذكي** · متة مثالية في كل مرة · **اطلب الآن** · +963 931 884 610 |

The hook: the first four seconds pose a riddle ("the secret isn't in the leaves… nor in boiling water…").
Viewers keep watching to learn the answer, and the answer is the product's main feature.

## Files

- `index.html`: the whole animation (SVG and HTML text, driven by a single `render(t)` timeline). Open it in a browser to preview it with play and scrub controls.
- `render.js`: renders `index.html` frame by frame to `matet-ad.mp4` with Playwright and ffmpeg.
- `soundtrack.py`: generates `soundtrack.wav`, an original ambient pad with plucks synced to the visuals and a pour sound. It needs numpy.
- `fonts/`: Noto Naskh Arabic (headlines) and IBM Plex Sans Arabic (body). Both use the SIL Open Font License.
- `grain.png`: a paper-grain tile.
- `bsc-logo.png`: the Business Solutions Center logo, cut out from `Business Solutions Center/Logo_bsc.png`.

## Editing

- **Copy:** change the text in the `<div id="t…">` / `.feat` elements in `index.html`.
- **Timing:** each scene is a commented block in `render(t)`, and the numbers are seconds.
- **Colours:** change the CSS variables at the top (`--green`, `--leaf`, `--clay`, `--cream`, …).
- **Phone number:** edit `#phone`.

## Re-rendering

```bash
npm i playwright            # or use a global install
python3 soundtrack.py       # optional; the video renders silent without soundtrack.wav
node render.js              # -> matet-ad.mp4
node render.js --stills 3,8,13,17,20,25   # quick PNG checks in stills/
```

`ffmpeg` must be on PATH, or you can set `FFMPEG=/path/to/ffmpeg`.
