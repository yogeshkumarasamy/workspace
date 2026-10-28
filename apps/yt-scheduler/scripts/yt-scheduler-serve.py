#!/usr/bin/env python3
"""Serve a YT Scheduler dist/ and keep directory indexes ahead of the SPA shell.

The home-server bug rewrote every directory in do_GET to /index.html. /privacy
and /terms then returned the login shell even though privacy/index.html and
terms/index.html were on disk.

If the path is a directory and that directory has index.html, leave the request
for SimpleHTTPRequestHandler. It redirects to a trailing slash, then serves
directory/index.html. Fall back to /index.html only when the path does not
exist, or the directory has no index.html. Missing hashed assets stay 404s.

  python3 scripts/yt-scheduler-serve.py --directory dist --port 8080

Copy this file over ~/yt-scheduler-serve.py on the home server and restart that
process after a redeploy. nginx: scripts/nginx.sample.conf.
"""

from __future__ import annotations

import argparse
import os
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

# Same extensions the Hostinger .htaccess refuses to rewrite onto index.html.
ASSET_EXT = re.compile(
    r"\.(?:js|mjs|css|map|json|png|jpe?g|gif|svg|webp|avif|ico|woff2?|txt|xml|webmanifest)$",
    re.IGNORECASE,
)


class SchedulerHandler(SimpleHTTPRequestHandler):
    """Directory index first, then the SPA shell."""

    def do_GET(self) -> None:
        self._apply_spa_fallback()
        super().do_GET()

    def do_HEAD(self) -> None:
        self._apply_spa_fallback()
        super().do_HEAD()

    def _apply_spa_fallback(self) -> None:
        parts = urlsplit(self.path)
        rel = unquote(parts.path)
        fs_path = self.translate_path(rel)
        if os.path.isdir(fs_path):
            if os.path.isfile(os.path.join(fs_path, "index.html")):
                return
        elif os.path.isfile(fs_path):
            return
        elif ASSET_EXT.search(rel):
            return
        fallback = "/index.html"
        if parts.query:
            fallback += "?" + parts.query
        self.path = fallback


def serve(directory: str, host: str, port: int) -> None:
    root = os.path.abspath(directory)
    if not os.path.isdir(root):
        raise SystemExit(f"directory does not exist: {root}")
    handler = partial(SchedulerHandler, directory=root)
    httpd = ThreadingHTTPServer((host, port), handler)
    print(f"listening http://{host}:{httpd.server_address[1]}/", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the YT Scheduler static dist")
    parser.add_argument("--directory", default="dist", help="dist directory (default: dist)")
    parser.add_argument("--bind", default="0.0.0.0", help="bind address (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8080, help="port (default: 8080, 0 = ephemeral)")
    args = parser.parse_args()
    serve(args.directory, args.bind, args.port)


if __name__ == "__main__":
    main()
