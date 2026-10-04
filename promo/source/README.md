# How the 60 s promo was made

No video editor. The whole promo is code: a browser compositor draws every frame, Python
collects them, and ffmpeg stitches picture and sound.

| File | Role |
| --- | --- |
| `render/main.js` | Compositor. An edit decision list maps each output second to source footage or a 3D scene, then draws captions, the live-dashboard crop and 2D graphics on a 1920×1080 canvas, 30 fps. |
| `render/scenes3d.js` | The 3D scenes in three.js r170 with bloom. Everything is procedural: forearm, sleeve, electrodes, MyoWare, UNO Q, battery. |
| `server.py` | Serves the render page and saves each frame the page POSTs as `frames/f_NNNNN.jpg`. |
| `track.py` | Hand-measured keyframes that follow the laptop screen in the handheld phone footage; prints an ffmpeg `crop` expression. |
| `audio/synth.py` | The music: 120 BPM in A minor, every drum, bass note, pad and riser synthesised from scratch with nothing but the Python standard library. No samples. |

The inputs (frames extracted from the phone recording, the voice track) are not in the repo, so
this is here to read rather than to re-run. The finished cut is
[`media/clyf-promo-720p.mp4`](../../media/clyf-promo-720p.mp4).

Assembly, roughly:

```sh
python3 server.py 8765                       # then open http://127.0.0.1:8765/render/ and run it
ffmpeg -framerate 30 -i frames/f_%05d.jpg -i final_audio.wav \
       -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest CLYF-promo.mp4
```

The voice is ducked under the music with `sidechaincompress` and the mix is normalised to −14 LUFS.
