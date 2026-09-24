"""
TrustGuard — Unified Single-Command Runner
Launches both Backend (FastAPI) and Frontend (Vite) simultaneously,
monitors health, auto-opens the browser, and cleanly stops both on Ctrl+C.
"""
import os
import sys
import time
import socket
import signal
import subprocess
import webbrowser
import threading

# Ensure UTF-8 output on Windows console (prevents charmap UnicodeEncodeError)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

BACKEND_PORT = 8000
FRONTEND_PORT = 5173

# Color terminal helpers
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"


def is_port_in_use(port: int) -> bool:
    """Check if a port is actively listening."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def kill_port_owners():
    """Kill any lingering processes occupying ports 8000 or 5173 on Windows."""
    if sys.platform == "win32":
        cmd = (
            f"Get-NetTCPConnection -LocalPort {BACKEND_PORT}, {FRONTEND_PORT} -ErrorAction SilentlyContinue "
            "| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
        )
        try:
            subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, timeout=5)
        except Exception:
            pass


def stream_output(pipe, prefix: str, color: str):
    """Stream process stdout/stderr with clean colorized prefix."""
    try:
        for line in iter(pipe.readline, ''):
            if not line:
                break
            line_str = line.strip()
            if line_str:
                print(f"{color}[{prefix}]{RESET} {line_str}", flush=True)
    except Exception:
        pass


def main():
    print(f"\n{BOLD}{CYAN}===================================================={RESET}")
    print(f"{BOLD}{CYAN}      TrustGuard — Forensic Evidence Dossier       {RESET}")
    print(f"{CYAN}  'We don't return a verdict. We return a case file.'{RESET}")
    print(f"{BOLD}{CYAN}===================================================={RESET}\n")

    print(f"{YELLOW}>>> Checking and freeing ports {BACKEND_PORT} & {FRONTEND_PORT}...{RESET}")
    kill_port_owners()
    time.sleep(1)

    print(f"{GREEN}>>> Starting Backend (FastAPI on port {BACKEND_PORT})...{RESET}")
    backend_cmd = [
        sys.executable,
        "-m", "uvicorn",
        "backend.main:app",
        "--host", "127.0.0.1",
        "--port", str(BACKEND_PORT),
        "--reload"
    ]
    
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=ROOT_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    print(f"{GREEN}>>> Starting Frontend (Vite on port {FRONTEND_PORT})...{RESET}")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_cmd = [
        npm_cmd,
        "run", "dev",
        "--", "--host", "127.0.0.1", "--port", str(FRONTEND_PORT)
    ]
    
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Start output streaming threads
    t1 = threading.Thread(target=stream_output, args=(backend_proc.stdout, "BACKEND", CYAN), daemon=True)
    t2 = threading.Thread(target=stream_output, args=(frontend_proc.stdout, "FRONTEND", GREEN), daemon=True)
    t1.start()
    t2.start()

    # Wait for services to be ready
    print(f"\n{YELLOW}>>> Initializing services...{RESET}")
    backend_ready = False
    frontend_ready = False
    
    for _ in range(30):
        if not backend_ready and is_port_in_use(BACKEND_PORT):
            backend_ready = True
        if not frontend_ready and is_port_in_use(FRONTEND_PORT):
            frontend_ready = True
        if backend_ready and frontend_ready:
            break
        time.sleep(0.5)

    print(f"\n{BOLD}{GREEN}[OK] All services are running!{RESET}")
    print(f"  * Frontend UI:    {BOLD}http://localhost:{FRONTEND_PORT}{RESET}")
    print(f"  * Backend API:    {BOLD}http://127.0.0.1:{BACKEND_PORT}/docs{RESET}")
    print(f"\n{YELLOW}>>> Opening browser to http://localhost:{FRONTEND_PORT}...{RESET}")
    print(f"{CYAN}>>> Press Ctrl + C in this terminal anytime to stop all services.{RESET}\n")

    # Automatically open browser
    try:
        webbrowser.open(f"http://localhost:{FRONTEND_PORT}")
    except Exception:
        pass

    # Handle Ctrl+C gracefully
    def shutdown(signum=None, frame=None):
        print(f"\n\n{YELLOW}>>> Shutting down TrustGuard services...{RESET}")
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
            kill_port_owners()
        except Exception:
            pass
        print(f"{GREEN}✓ All processes stopped cleanly. Goodbye!{RESET}\n")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, shutdown)

    # Keep running until Ctrl+C
    try:
        while True:
            if backend_proc.poll() is not None:
                print(f"{RED}Backend process exited unexpectedly.{RESET}")
                shutdown()
            if frontend_proc.poll() is not None:
                print(f"{RED}Frontend process exited unexpectedly.{RESET}")
                shutdown()
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
