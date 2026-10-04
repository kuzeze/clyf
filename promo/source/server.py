"""Serve the promo workspace and accept rendered frames from the browser compositor.

GET  /...            static files under this directory (render page, vendor, source frames)
POST /frame/<n>      body = JPEG; saved as frames/f_<n:05d>.jpg
POST /log            body = text; printed (progress and errors from the page)
"""
import http.server, os, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent
FRAMES = ROOT / 'frames'
FRAMES.mkdir(exist_ok=True)

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(ROOT), **k)
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        m = re.fullmatch(r'/frame/(\d+)', self.path)
        if m:
            (FRAMES / f"f_{int(m.group(1)):05d}.jpg").write_bytes(body)
        elif self.path == '/log':
            print(body.decode('utf-8', 'replace'), flush=True)
        else:
            self.send_response(404); self.end_headers(); return
        self.send_response(204); self.end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
