#!/usr/bin/env python3
"""
Simple local dev server for testing the site.
Run: python3 serve.py
Then open: http://localhost:8000
"""

import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"\n🚀 Frontend server at http://localhost:{PORT}")
        print(f"📁 Serving: {DIRECTORY}")
        print("\n⚠️  You also need to run the API locally:")
        print("   cd ../joshfreeman-socialnet-api && DEBUG=true uvicorn main:app --port 8080 --reload")
        print("\nPress Ctrl+C to stop\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped.")
