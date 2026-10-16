#!/usr/bin/env python3
"""
Royal Banquet Hall — Admin Studio Utility Server
Python 3.8+ | FastAPI-style HTTP server for CMS operations
Features: Image processing, optimization, backup, export, thumbnail generation
"""

import os
import json
import shutil
import hashlib
import mimetypes
from datetime import datetime
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import base64

# ── Configuration ──────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
DATA_DIR    = BASE_DIR / "data"
BACKUP_DIR  = DATA_DIR / "backups"
UPLOADS_DIR = BASE_DIR / "assets" / "uploads"
CMS_FILE    = DATA_DIR / "cms-settings.json"
PORT        = 8001

ALLOWED_IMG = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
ALLOWED_VID = {".mp4", ".webm", ".ogg"}

DEFAULT_CMS = {
    "logo":          {"src": "assets/images/royal-hall-crest.webp", "width": 145, "height": 98, "position": "left"},
    "navbar":        {"design": 0, "buttonStyle": 0, "animation": 0, "hoverAnimation": 0, "height": 72, "bgColor": "#0a0b0d", "transparent": True},
    "hero":          {"src": "assets/images/hero-venue.jpg", "scale": 100, "posX": 50, "posY": 50, "height": 70, "animation": 0, "displayMode": "cover", "overlayColor": "#000000", "overlayOpacity": 40, "brightness": 100, "contrast": 100},
    "heroHeading":   {"text": "A Royal Celebration Awaits", "animation": 0, "font": 0, "colorCombo": 0, "size": 56, "weight": 800, "lineHeight": 1.15, "letterSpacing": -1},
    "heroSub":       {"text": "The Perfect Venue for Weddings, Receptions, Birthdays, Corporate Events & More.", "preset": 0, "size": 18, "weight": 400, "lineHeight": 1.6},
    "background":    {"src": "", "animation": 0, "posX": 50, "posY": 50, "overlayOpacity": 30},
    "video":         {"src": "", "autoplay": True, "loop": True, "muted": True, "posX": 50, "posY": 50},
    "theme":         {"active": 0},
    "animations":    {"activeItems": []},
    "effects":       {"activeItems": []},
    "components":    {"activeItems": []},
    "fontAnimations":{"active": 0, "targets": {}},
}

# ── Utilities ───────────────────────────────────────────────────────────────
def ensure_dirs():
    for d in [DATA_DIR, BACKUP_DIR, UPLOADS_DIR / "images", UPLOADS_DIR / "videos", UPLOADS_DIR / "thumbs"]:
        d.mkdir(parents=True, exist_ok=True)

def json_response(data: dict, status: int = 200) -> tuple[int, str]:
    return status, json.dumps(data, ensure_ascii=False, indent=2, default=str)

def error_response(message: str, status: int = 400) -> tuple[int, str]:
    return status, json.dumps({"success": False, "error": message})

def load_cms() -> dict:
    if not CMS_FILE.exists():
        return {"success": True, "data": DEFAULT_CMS, "source": "defaults"}
    try:
        data = json.loads(CMS_FILE.read_text(encoding="utf-8"))
        return {"success": True, "data": data, "source": "file", "modified": CMS_FILE.stat().st_mtime}
    except json.JSONDecodeError as e:
        raise ValueError(f"CMS data file corrupted: {e}")

def save_cms(body: dict) -> dict:
    ensure_dirs()
    # Auto-backup
    if CMS_FILE.exists():
        ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        shutil.copy2(CMS_FILE, BACKUP_DIR / f"backup_{ts}.json")
        prune_backups(20)
    body["_meta"] = {"saved_at": datetime.now().isoformat(), "version": "1.0", "server": "python"}
    CMS_FILE.write_text(json.dumps(body, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"success": True, "message": "CMS settings saved", "timestamp": datetime.now().isoformat()}

def publish_site(cms: dict) -> dict:
    report = []
    logo = cms.get("logo", {})
    if logo:
        report.append(f"Logo: width={logo.get('width')}px src={logo.get('src')}")
    theme = cms.get("theme", {})
    if theme:
        report.append(f"Theme #{theme.get('active', 0)} applied")
    hero = cms.get("hero", {})
    if hero:
        report.append(f"Hero: {hero.get('src')} | height={hero.get('height')}vh")
    fa = cms.get("fontAnimations", {})
    if fa:
        report.append(f"Font Animation #{fa.get('active', 0)} applied")

    snapshot = {"published_at": datetime.now().isoformat(), "cms": cms, "report": report}
    (DATA_DIR / "published.json").write_text(json.dumps(snapshot, indent=2, ensure_ascii=False))

    return {"success": True, "message": "Website published!", "published_at": datetime.now().isoformat(), "report": report}

def list_images() -> dict:
    images = []
    for search_dir in [BASE_DIR / "assets" / "images", UPLOADS_DIR / "images"]:
        if not search_dir.exists():
            continue
        for f in search_dir.iterdir():
            if f.suffix.lower() in ALLOWED_IMG:
                rel = str(f.relative_to(BASE_DIR)).replace("\\", "/")
                images.append({
                    "name":     f.name,
                    "path":     rel,
                    "size":     f.stat().st_size,
                    "modified": f.stat().st_mtime,
                    "type":     mimetypes.guess_type(f.name)[0] or "image",
                })
    images.sort(key=lambda x: x["modified"], reverse=True)
    return {"success": True, "count": len(images), "images": images}

def generate_thumbnail(src: Path, size: tuple = (200, 150)) -> Path:
    """Generate thumbnail using PIL if available, else just copy"""
    thumb_dir = UPLOADS_DIR / "thumbs"
    thumb_dir.mkdir(exist_ok=True)
    thumb_path = thumb_dir / f"thumb_{src.name}"
    try:
        from PIL import Image  # type: ignore
        with Image.open(src) as img:
            img.thumbnail(size, Image.LANCZOS)
            img.save(thumb_path, optimize=True, quality=85)
    except ImportError:
        shutil.copy2(src, thumb_path)
    return thumb_path

def list_backups() -> dict:
    ensure_dirs()
    backups = []
    for f in sorted(BACKUP_DIR.glob("backup_*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
        backups.append({"file": f.name, "date": f.stat().st_mtime, "size": f.stat().st_size})
    return {"success": True, "count": len(backups), "backups": backups}

def restore_backup(file_name: str) -> dict:
    src = BACKUP_DIR / Path(file_name).name  # sanitize
    if not src.exists():
        raise FileNotFoundError("Backup not found")
    json.loads(src.read_text())  # validate
    shutil.copy2(src, CMS_FILE)
    return {"success": True, "message": f"Restored from {file_name}", "restored_at": datetime.now().isoformat()}

def get_status() -> dict:
    backups = list(BACKUP_DIR.glob("backup_*.json")) if BACKUP_DIR.exists() else []
    uploads = list((UPLOADS_DIR / "images").glob("*")) if (UPLOADS_DIR / "images").exists() else []
    published_at = None
    pub_file = DATA_DIR / "published.json"
    if pub_file.exists():
        try:
            published_at = json.loads(pub_file.read_text()).get("published_at")
        except Exception:
            pass
    return {
        "success":      True,
        "server":       f"Python {__import__('sys').version.split()[0]}",
        "cms_exists":   CMS_FILE.exists(),
        "cms_modified": CMS_FILE.stat().st_mtime if CMS_FILE.exists() else None,
        "backups":      len(backups),
        "uploads":      len(uploads),
        "published_at": published_at,
        "timestamp":    datetime.now().isoformat(),
    }

def prune_backups(keep: int = 20):
    files = sorted(BACKUP_DIR.glob("backup_*.json"), key=lambda x: x.stat().st_mtime)
    for f in files[:-keep]:
        f.unlink(missing_ok=True)

def export_cms() -> dict:
    cms = load_cms()["data"]
    export_data = {
        "exported_at": datetime.now().isoformat(),
        "version": "1.0",
        "site": "Royal Banquet Hall",
        "cms": cms,
    }
    export_file = DATA_DIR / f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    export_file.write_text(json.dumps(export_data, indent=2, ensure_ascii=False))
    return {"success": True, "message": "Exported", "file": export_file.name}

def get_image_stats() -> dict:
    """Return image library statistics"""
    img_dirs = [BASE_DIR / "assets" / "images", UPLOADS_DIR / "images"]
    total, size, by_type = 0, 0, {}
    for d in img_dirs:
        if not d.exists():
            continue
        for f in d.iterdir():
            if f.suffix.lower() in ALLOWED_IMG:
                total += 1
                size  += f.stat().st_size
                ext = f.suffix.lower()
                by_type[ext] = by_type.get(ext, 0) + 1
    return {"total": total, "total_size": size, "by_type": by_type}

# ── HTTP Handler ────────────────────────────────────────────────────────────
class StudioHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        ts = datetime.now().strftime("%H:%M:%S")
        print(f"[{ts}] {fmt % args}")

    def send_cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors()
        self.end_headers()

    def read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        try:
            return json.loads(self.rfile.read(length))
        except Exception:
            return {}

    def handle_login(self) -> tuple[int, str]:
        body = self.read_body()
        username = (body.get("username") or "").strip().lower()
        password = body.get("password") or ""
        if username == "royal hall" and password == "Royal@07":
            return json_response({
                "success": True,
                "message": "Authentication successful",
                "user": {"id": "Royal Hall", "role": "Administrator"},
                "token": f"royal_auth_{int(time.time())}"
            })
        return error_response("Invalid Login ID or Password", 401)

    def dispatch(self, method: str, path: str) -> tuple[int, str]:
        routes = {
            ("GET",    "/api/status"):       lambda: json_response(get_status()),
            ("POST",   "/api/auth/login"):   lambda: self.handle_login(),
            ("GET",    "/api/load-cms"):     lambda: json_response(load_cms()),
            ("POST",   "/api/save-cms"):     lambda: json_response(save_cms(self.read_body())),
            ("POST",   "/api/publish"):      lambda: json_response(publish_site(load_cms()["data"])),
            ("GET",    "/api/list-images"):  lambda: json_response(list_images()),
            ("GET",    "/api/backups"):      lambda: json_response(list_backups()),
            ("POST",   "/api/restore"):      lambda: json_response(restore_backup(self.read_body().get("file",""))),
            ("POST",   "/api/export"):       lambda: json_response(export_cms()),
            ("GET",    "/api/image-stats"):  lambda: json_response({"success":True,"stats":get_image_stats()}),
            ("POST",   "/api/reset"):        lambda: (CMS_FILE.unlink(missing_ok=True), json_response({"success":True,"message":"Reset"}))[1],
        }
        key = (method, path)
        if key in routes:
            try:
                return routes[key]()
            except FileNotFoundError as e:
                return error_response(str(e), 404)
            except (ValueError, KeyError) as e:
                return error_response(str(e), 400)
            except Exception as e:
                return error_response(f"Server error: {e}", 500)
        return error_response(f"Not found: {path}", 404)

    def do_GET(self):
        self._handle("GET")

    def do_POST(self):
        self._handle("POST")

    def do_DELETE(self):
        self._handle("DELETE")

    def _handle(self, method: str):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip("/")
        status, body = self.dispatch(method, path)
        encoded = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type",   "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_cors()
        self.end_headers()
        self.wfile.write(encoded)


# ── Image Processor (Standalone) ────────────────────────────────────────────
class ImageProcessor:
    """Utility class for image operations"""

    @staticmethod
    def get_image_info(path: Path) -> dict:
        info = {
            "file":     path.name,
            "path":     str(path),
            "size":     path.stat().st_size,
            "modified": path.stat().st_mtime,
            "ext":      path.suffix.lower(),
        }
        try:
            from PIL import Image  # type: ignore
            with Image.open(path) as img:
                info.update({"width": img.width, "height": img.height, "mode": img.mode, "format": img.format})
        except ImportError:
            info.update({"width": "N/A", "height": "N/A", "note": "Install Pillow for image dimensions"})
        return info

    @staticmethod
    def optimize_image(src: Path, quality: int = 85) -> Path:
        """Optimize image in-place"""
        try:
            from PIL import Image  # type: ignore
            with Image.open(src) as img:
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                img.save(src, optimize=True, quality=quality)
        except ImportError:
            pass
        return src

    @staticmethod
    def bulk_process_images(directory: Path) -> list[dict]:
        results = []
        for f in directory.glob("*.{jpg,jpeg,png}"):
            try:
                original_size = f.stat().st_size
                ImageProcessor.optimize_image(f)
                new_size = f.stat().st_size
                saving = original_size - new_size
                results.append({"file": f.name, "original": original_size, "optimized": new_size, "saved": saving})
            except Exception as e:
                results.append({"file": f.name, "error": str(e)})
        return results


# ── CLI ─────────────────────────────────────────────────────────────────────
def main():
    ensure_dirs()
    print("=" * 60)
    print("  Royal Banquet Hall — Python Admin Studio Server")
    print(f"  Port  : {PORT}")
    print(f"  API   : http://localhost:{PORT}/api/status")
    print(f"  Data  : {DATA_DIR}")
    print("=" * 60)

    server = HTTPServer(("0.0.0.0", PORT), StudioHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print(f"\n✓ Server running on http://localhost:{PORT}")
    print("  Press Ctrl+C to stop\n")
    try:
        thread.join()
    except KeyboardInterrupt:
        print("\n✓ Server stopped")
        server.shutdown()


if __name__ == "__main__":
    main()
