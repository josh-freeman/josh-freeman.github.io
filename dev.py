#!/usr/bin/env python3
"""
Local development server - runs both API and frontend.
Usage: python3 dev.py
"""

import subprocess
import sys
import os
import signal
import time

FRONTEND_DIR = os.path.dirname(os.path.abspath(__file__))
API_DIR = os.path.join(os.path.dirname(FRONTEND_DIR), "joshfreeman-blog-api")

def main():
    if not os.path.exists(API_DIR):
        print(f"❌ API directory not found: {API_DIR}")
        print("   Expected joshfreeman-blog-api alongside josh-freeman.github.io")
        sys.exit(1)

    processes = []

    def cleanup(signum=None, frame=None):
        print("\n\nShutting down...")
        for p in processes:
            p.terminate()
        for p in processes:
            p.wait()
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    # Seed database with sample data
    api_python = os.path.join(API_DIR, ".venv", "bin", "python")
    seed_script = os.path.join(API_DIR, "seed.py")
    if not os.path.exists(api_python):
        print(f"❌ API venv not found. Run: cd {API_DIR} && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt")
        sys.exit(1)
    if os.path.exists(seed_script):
        subprocess.run([api_python, seed_script], cwd=API_DIR, capture_output=True)

    # Start API
    print("🚀 Starting API at http://localhost:8080")
    api_venv = os.path.join(API_DIR, ".venv", "bin", "uvicorn")
    api_proc = subprocess.Popen(
        [api_venv, "main:app", "--port", "8080", "--reload"],
        cwd=API_DIR,
        env={**os.environ, "DEBUG": "true"}
    )
    processes.append(api_proc)

    time.sleep(1)  # Let API start

    # Start frontend
    print("🌐 Starting frontend at http://localhost:8000")
    frontend_proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8000"],
        cwd=FRONTEND_DIR
    )
    processes.append(frontend_proc)

    print("\n✅ Dev environment ready!")
    print("   Frontend: http://localhost:8000")
    print("   API:      http://localhost:8080")
    print("\nPress Ctrl+C to stop\n")

    # Wait for either to exit
    while True:
        for p in processes:
            if p.poll() is not None:
                print(f"Process exited unexpectedly")
                cleanup()
        time.sleep(0.5)

if __name__ == "__main__":
    main()
