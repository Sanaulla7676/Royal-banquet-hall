# Royal Banquet Hall — Admin Studio & Visual CMS

A luxury management studio and in-context visual CMS for **The Royal Party Hall** website.

---

## Quick Start

### 1. Run the secured local admin server

Set private environment variables before running the server. Production passwords and API secrets must never be stored in source code.

```powershell
npm install
$env:ADMIN_USERNAME="choose-a-new-admin-user"
$env:ADMIN_PASSWORD="use-a-new-unique-password"
$env:ADMIN_SESSION_SECRET="use-at-least-32-random-characters"
npm run admin
```

- Public website: `http://localhost:3001/`
- Admin Studio: `http://localhost:3001/admin-studio.html`
- Legacy admin URL: `http://localhost:3001/admin.html` redirects to the canonical Studio.

### 2. Configure production

The public website stays on Vercel. Vercel forwards `/api/*` requests to the Node.js backend at `https://royal-banquet-backend.onrender.com`.

Open Render Dashboard → `royal-banquet-backend` → **Environment** and set these values there. Never put them in source control or browser code:

- `DATABASE_URL`: connection string from the existing Neon project `royal-banquet-cms`, database `royal_banquet_cms`.
- `ADMIN_USERNAME`: a new administrator login ID.
- `ADMIN_PASSWORD`: a new, unique, strong password that has not been shared in chat or embedded in source.
- `ADMIN_SESSION_SECRET`: a randomly generated secret with at least 32 characters.
- `CLOUDINARY_CLOUD_NAME`: the Cloudinary cloud name.
- `CLOUDINARY_API_KEY`: the Cloudinary API key.
- `CLOUDINARY_API_SECRET`: a newly rotated Cloudinary API secret.
- Optional `ADMIN_ALLOWED_ORIGINS`: comma-separated trusted origins if an additional custom domain is introduced.

Do not share the database URL, administrator password, session secret, Cloudinary API secret, or deployment-hook URLs in chat or commit them to Git.

### 3. Deploy and verify the backend

After all environment values have been configured, trigger a Render redeploy. Verify `/api/status` reports configured storage, auth, and Cloudinary readiness without exposing values. Then test sign-in, session validation, draft save/reload, publish/reload, backups, and signed Cloudinary media uploads before promoting the change to production.

CMS drafts, published content, and new backups are stored in the existing Neon `cms_state` table. New images/videos are uploaded to Cloudinary. The Cloudinary API secret stays on the backend and uploads must use short-lived server-signed requests. Missing required configuration should fail clearly instead of returning false success.

### 4. Admin authentication

Sign-in is verified server-side and uses a signed HttpOnly cookie. Browser localStorage is a local recovery copy only, never proof of authentication. The public website's crown button / Ctrl + Shift + A shortcut can open the same server-validated sign-in flow.

---

## Implemented Studio areas

The 13-page Studio includes layout, theme/colors, typography, animations/effects, component controls, navbar/logo settings, media uploads, page management, venue information, custom CSS, backups, and publishing. The legacy `admin.html` URL forwards to `admin-studio.html`.

---

## Key files

- `admin-studio.html`: canonical Admin Studio
- `assets/css/royal-admin.css`: admin and in-context editor styling
- `assets/js/admin-studio.js`: Studio controls and signed media upload client
- `assets/js/royal-cms.js`: runtime CMS engine
- `server.js`: production backend and protected APIs
- `lib/admin-auth.js`: server-side authentication/session helpers
- `lib/cms-db.js`: Neon CMS persistence
- `render.yaml`: required Render environment variable names (no secret values)
