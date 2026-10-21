#!/usr/bin/env python3
"""Local dev server for the Mary Gold site.

Serves the static site with Netlify-like clean URLs so you can preview the
public pages and the /admin CMS locally.

Usage:
    python3 scripts/dev.py            # http://localhost:8000
    python3 scripts/dev.py 5000
"""
import os
import sys
import http.server
import socketserver
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ROUTES = {
    "/": "index.html",
    "/about": "about.html",
    "/programs": "programs.html",
    "/events": "events.html",
    "/contact": "contact.html",
    "/admin": "admin/index.html",
    "/admin/": "admin/index.html",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path

        if path in ROUTES:
            self.path = "/" + ROUTES[path]
        elif path.endswith("/") and path.rstrip("/") in ROUTES:
            self.path = "/" + ROUTES[path.rstrip("/")]
        elif path.rstrip("/") in ROUTES and not path.endswith("/"):
            self.path = "/" + ROUTES[path.rstrip("/")]

        return super().do_GET()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), Handler) as httpd:
        print("Mary Gold dev server running:  http://localhost:%d" % port)
        print("Admin (CMS):                   http://localhost:%d/admin/" % port)
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
