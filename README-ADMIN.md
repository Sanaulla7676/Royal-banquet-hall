# Royal Banquet Hall — Admin Studio & Visual CMS

A luxury management studio and in-context visual CMS for **The Royal Party Hall** website.

---

## 👑 Quick Start

### 1. Launch the Live Admin Server
Run the local dev & persistence server:
```bash
npm run admin
```
- **Public Website:** `http://localhost:3000/`
- **Admin Studio Dashboard:** `http://localhost:3000/admin.html`

### 2. Admin Authentication
- **Default Admin PIN:** `royal2026`
- **In-Context Studio Hotkey:** Press `Ctrl + Shift + A` on any live public page, or click the discreet crown icon `♛` in the bottom-right corner.

---

## ✨ Features Implemented

### 1. Visual Layout & Element Resizing
- **Canvas Resizing Controls:** Real-time sliders for Width, Min/Max Height, Padding, Margins, Scale factor (0.5x to 1.6x), and X/Y offset positioning.
- **Section Reordering:** Move sections up or down (`.hero`, `.quick-search`, `.cards`, `.features`, `.cta-banner`, etc.) with drag handles and instant preview.
- **Live In-Context Editor:** On any public page, toggle **✏️ Visual Edit** to click any element and open the floating inspector drawer.

### 2. Colors & Theme Studio
- **5 Curated Luxury Presets:**
  - 👑 **Royal Heritage:** Classic 24K Gold, Forest Obsidian, and Warm Cream.
  - 💎 **Midnight Sapphire:** Deep Sapphire, Champagne Gold, and Pearl.
  - 🌹 **Imperial Velvet:** Deep Wine Crimson, Antique Rose Gold, and Ivory.
  - 🌿 **Emerald Palace:** Lush Jade, Polished Brass, and Silk Linen.
  - 🌑 **Obsidian Noir:** Dark luxury mode with carbon surfaces and 24K gold accents.
- **Individual Token Customizer:** Live color pickers and hex inputs for `--gold`, `--gold2`, `--ink`, `--ink2`, `--cream`, `--paper`, `--text`, `--muted`, and `--line`.

### 3. Fonts & Typography Studio
- **Curated Google Fonts Collection:**
  - **Headings & Serif:** Playfair Display, Cinzel, Cormorant Garamond, Bodoni Moda, Marcellus, Prata, Montserrat.
  - **Body & Sans:** DM Sans, Plus Jakarta Sans, Outfit, Inter, Poppins, Roboto.
  - **Script Accents:** Parisienne, Great Vibes, Alex Brush, Pinyon Script.
- **Typography Scale Controls:** Sliders for Heading Scale Multiplier (0.8x to 1.4x) and Body Text Multiplier (0.85x to 1.25x).

### 4. Media Manager & Cloudinary Free Tier Integration
- **Cloudinary Free Tier Ready:**
  - Zero server-side code needed: enter your free Cloudinary **Cloud Name** and unsigned **Upload Preset**.
  - Direct unsigned browser uploads with automatic CDN optimization (`f_auto, q_auto`).
  - Generous free allowance (25 monthly credits, ~25GB bandwidth & storage).
- **Local Fallback Uploader:** Works out-of-the-box with immediate browser base64 storage even without credentials.
- **Instant Image Swapper:** Click any photo on the page to replace it with any newly uploaded image or web URL.
- **Video Management:** Change or toggle the entrance intro video (`#site-intro video`) and embed video players.

### 5. Page Builder & Page Manager
- **Create New Pages:**
  - Enter Page Title, Slug (e.g. `packages.html`, `decor.html`), and meta description.
  - Choose from luxury templates:
    1. **Banquet Packages & Pricing:** Tiered cards with amenities, guest count badges, and booking CTA.
    2. **Decor & Stage Portfolio:** Visual showcase for stage themes, lighting designs, and floral setups.
    3. **Venue Story & Narrative:** Split-screen layout with spacious hall features and guest reviews.
  - Automatically compiles the standalone HTML page and adds it to the navbar menu!
- **Hide & Delete Pages:** One-click page removal with automatic navbar cleanup.

### 6. Buttons Customizer
- **Interactive Button Playground:** Live preview for `.btn-gold`, `.btn-dark`, and `.btn-outline`.
- **Customizable Properties:**
  - Background: Solid color, linear gradients, or gloss.
  - Border Radius: Sharp (0px), Subtle Curve (6px), Modern Rounded (12px), Full Capsule Pill (999px).
  - Hover Effects: Float Lift (-2px), 24K Gold Ambient Glow, or Scale Zoom (1.04x).
  - Padding & Font Weights.

### 7. Navbar & Header Customizer
- **Brand Logo:** Change logo image source URL or upload new crest, adjust logo width and height.
- **Menu Links Manager:** Reorder links with Up/Down buttons, edit link labels and URLs, or add custom menu items.
- **Header CTA:** Toggle header action button visibility, change label (e.g. "Check Your Date", "Book Now"), and link.
- **Sticky Glassmorphism:** Header backdrop blur and background opacity.

### 8. Pro Options & Venue Info
- **Live Contact Synchronization:** WhatsApp enquiry phone number, booking email, physical address, and Google Maps link automatically synchronize across all pages, forms, and footer cards.
- **Custom CSS Injector:** Add custom CSS overrides.
- **Backup & Restore:** Download complete JSON snapshots of all settings or restore with one click.
- **Factory Reset Safeguard:** Restore original pristine defaults whenever needed.

---

## 📁 Key File Locations

- `admin.html`: Dedicated Admin Studio Dashboard
- `assets/css/royal-admin.css`: Admin and in-context visual editor styling
- `assets/js/royal-cms-data.js`: Persistent CMS data store
- `assets/js/royal-cms.js`: Runtime engine loaded on public pages
- `scripts/admin-server.mjs`: Local Node.js server with disk persistence API (`/api/save-cms`, `/api/create-page`, `/api/delete-page`)
