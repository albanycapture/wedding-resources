# Frame Sense

A browser game for getting faster and more accurate at reading crops and
compositions. One roll of twelve frames, in four strips:

| Strip | What you do | Levels |
| --- | --- | --- |
| **Read** | Name what you see | Call the Crop · Name the Device · Stacked |
| **Judge** | Find the flaw | Edge Patrol · Stronger Frame · Will It Print? |
| **Make** | Crop it yourself | Re-crop · Crop to Brief · Compose to Brief |
| **Deadline** | All of it, against the clock | Speed Cull · Second Look · The Full Gallery |

Each level has a pass mark and a pace target. Pass one to open the next.
Scenes are drawn in code, so every run is different. **Crop Lab** lets you
practise on your own photos; they stay in your browser and are never uploaded.

## Play

Open `index.html` in any modern browser. It is one self-contained file, so it
also works from a phone or when hosted as a static page. Progress is saved in
the browser you play in.

Controls: number keys or taps to answer, arrow keys for edges and for moving
the crop box, `+` / `-` to resize it, `Enter` to lock or continue, `Esc` to
leave a run.

## Share it on your own network

The game has no server side and `index.html` is complete in itself, typefaces
included. It makes no network requests, so it also works with no internet.

**Give each person the file.** On a computer it opens with a double-click.

**Or serve it from one computer**, so phones and tablets on the same Wi-Fi can
play too. Put `index.html` in a folder of its own, open a terminal in that
folder, and run:

```bash
python3 -m http.server 8000
```

On Windows the command is `py -m http.server 8000`. Teammates then open
`http://<that computer's network address>:8000`. Stop it with Ctrl+C.

- The server shows everything in the folder it runs from, which is why the file
  sits in a folder by itself.
- It can only be reached from the same network, so use one you trust.
- Each person's progress is stored in their own browser under that address. If
  the computer's address changes, their progress stays behind at the old one,
  so give the computer a fixed address in the router if this is long-term.

## Change it

`index.html` is generated. Edit the files in `src/`, then rebuild:

```bash
node build.mjs
```

Check that every generated question is still valid:

```bash
node selftest.mjs 500
```

| File | What it holds |
| --- | --- |
| `src/40-figures.js` | The people, and where their joints are |
| `src/50-env.js`, `src/55-details.js` | Venues and detail still-lifes |
| `src/65-judge.js` | What each crop edge does to the people in frame |
| `src/66-items.js`, `src/67-make.js` | Question generators and crop scoring |
| `src/80-levels.js` | The twelve levels, pass marks and pace targets |
| `src/90-app.js`, `src/95-lab.js` | Screens, the drill engine, Crop Lab |
| `src/fonts/` | Archivo and Chivo Mono (SIL Open Font License), embedded into `index.html` |
