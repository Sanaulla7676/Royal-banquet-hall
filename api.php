<?php
/**
 * Royal Banquet Hall — Admin Studio API Server
 * PHP 8.0+ Backend for Website Customization Studio
 * Handles: CMS save/load, image upload, publish, settings
 */

declare(strict_types=1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ── Configuration ──────────────────────────────────────────────────────────
define('CMS_DATA_FILE',   __DIR__ . '/data/cms-settings.json');
define('BACKUP_DIR',      __DIR__ . '/data/backups/');
define('UPLOADS_DIR',     __DIR__ . '/assets/uploads/');
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_IMG_TYPES', ['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']);
define('ALLOWED_VID_TYPES', ['video/mp4','video/webm','video/ogg']);

// ── Router ─────────────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$path   = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts  = explode('/', $path);
$action = $parts[count($parts) - 1] ?? '';

try {
    match (true) {
        $method === 'GET'  && $action === 'load-cms'      => respondJson(loadCMS()),
        $method === 'POST' && $action === 'save-cms'      => respondJson(saveCMS()),
        $method === 'POST' && $action === 'publish'       => respondJson(publishSite()),
        $method === 'POST' && $action === 'upload-image'  => respondJson(uploadImage()),
        $method === 'POST' && $action === 'upload-video'  => respondJson(uploadVideo()),
        $method === 'GET'  && $action === 'list-images'   => respondJson(listImages()),
        $method === 'DELETE' && $action === 'delete-image'=> respondJson(deleteImage()),
        $method === 'POST' && $action === 'rename-image'  => respondJson(renameImage()),
        $method === 'GET'  && $action === 'backups'       => respondJson(listBackups()),
        $method === 'POST' && $action === 'restore'       => respondJson(restoreBackup()),
        $method === 'GET'  && $action === 'status'        => respondJson(getStatus()),
        $method === 'POST' && ($action === 'login' || $action === 'auth') => respondJson(loginUser()),
        $method === 'POST' && $action === 'reset'         => respondJson(resetCMS()),
        default => respondError(404, 'Endpoint not found: ' . $action)
    };
} catch (Throwable $e) {
    respondError(500, $e->getMessage());
}

// ── Auth ───────────────────────────────────────────────────────────────────
function loginUser(): array {
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';
    $configuredUser = getenv('ADMIN_USERNAME') ?: '';
    $configuredPassword = getenv('ADMIN_PASSWORD') ?: '';

    if ($configuredUser === '' || $configuredPassword === '') {
        respondError(503, 'Legacy PHP admin auth is disabled. Use the Node/Vercel Admin Studio with environment-based authentication.');
    }

    if (strcasecmp($username, $configuredUser) === 0 && hash_equals($configuredPassword, $password)) {
        return [
            'success' => true,
            'message' => 'Credentials accepted by the legacy PHP endpoint. Use the canonical Admin Studio session API for administration.'
        ];
    }
    respondError(401, 'Invalid Login ID or Password');

}

// ── CMS Load ───────────────────────────────────────────────────────────────
function loadCMS(): array {
    if (!file_exists(CMS_DATA_FILE)) {
        return ['success' => true, 'data' => getDefaultCMS(), 'source' => 'defaults'];
    }
    $raw = file_get_contents(CMS_DATA_FILE);
    $cms = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new RuntimeException('CMS data file is corrupted');
    }
    return ['success' => true, 'data' => $cms, 'source' => 'file', 'modified' => filemtime(CMS_DATA_FILE)];
}

// ── CMS Save ───────────────────────────────────────────────────────────────
function saveCMS(): array {
    $body = getJsonBody();
    if (empty($body)) {
        throw new InvalidArgumentException('Request body is empty or invalid JSON');
    }

    ensureDir(dirname(CMS_DATA_FILE));
    ensureDir(BACKUP_DIR);

    // Auto-backup current state before overwriting
    if (file_exists(CMS_DATA_FILE)) {
        $backupFile = BACKUP_DIR . 'backup_' . date('Y-m-d_H-i-s') . '.json';
        copy(CMS_DATA_FILE, $backupFile);
        // Keep only last 20 backups
        pruneBackups(20);
    }

    $body['_meta'] = [
        'saved_at' => date('c'),
        'version'  => '1.0',
        'server'   => 'php',
    ];

    $written = file_put_contents(CMS_DATA_FILE, json_encode($body, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    if ($written === false) {
        throw new RuntimeException('Failed to write CMS data file. Check permissions.');
    }

    return ['success' => true, 'message' => 'CMS settings saved', 'bytes' => $written, 'timestamp' => date('c')];
}

// ── Publish ────────────────────────────────────────────────────────────────
function publishSite(): array {
    $cms = loadCMS()['data'];
    $report = [];

    // Apply logo settings
    if (!empty($cms['logo'])) {
        $report[] = applyLogoSettings($cms['logo']);
    }

    // Apply theme colors
    if (!empty($cms['theme'])) {
        $report[] = applyThemeColors($cms['theme']);
    }

    // Apply hero settings
    if (!empty($cms['hero'])) {
        $report[] = applyHeroSettings($cms['hero']);
    }

    // Apply font animations
    if (!empty($cms['fontAnimations'])) {
        $report[] = applyFontAnimations($cms['fontAnimations']);
    }

    // Generate published snapshot
    $snapshot = [
        'published_at' => date('c'),
        'cms'          => $cms,
        'report'       => $report,
    ];
    file_put_contents(__DIR__ . '/data/published.json', json_encode($snapshot, JSON_PRETTY_PRINT));

    return [
        'success'     => true,
        'message'     => 'Website published successfully!',
        'published_at'=> date('c'),
        'report'      => $report,
    ];
}

function applyLogoSettings(array $logo): string {
    // In production: patch index.html, events.html, etc. with new logo settings
    // Here we log the intent
    return "Logo: width={$logo['width']}px height={$logo['height']}px";
}

function applyThemeColors(array $theme): string {
    $active = $theme['active'] ?? 0;
    return "Theme #{$active} applied across all pages";
}

function applyHeroSettings(array $hero): string {
    return "Hero: src={$hero['src']} height={$hero['height']}vh animation={$hero['animation']}";
}

function applyFontAnimations(array $fa): string {
    return "Font animation #{$fa['active']} applied";
}

// ── Image Upload ───────────────────────────────────────────────────────────
function uploadImage(): array {
    if (empty($_FILES['image'])) {
        throw new InvalidArgumentException('No image file received');
    }
    $file = $_FILES['image'];
    validateUpload($file, ALLOWED_IMG_TYPES, MAX_UPLOAD_SIZE);

    ensureDir(UPLOADS_DIR . 'images/');
    $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $safeName = sanitizeFilename($file['name']);
    $dest     = UPLOADS_DIR . 'images/' . $safeName;

    // Avoid overwrites
    if (file_exists($dest)) {
        $base = pathinfo($safeName, PATHINFO_FILENAME);
        $safeName = $base . '_' . time() . '.' . $ext;
        $dest = UPLOADS_DIR . 'images/' . $safeName;
    }

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        throw new RuntimeException('Failed to save uploaded image');
    }

    return [
        'success' => true,
        'message' => 'Image uploaded successfully',
        'file'    => $safeName,
        'path'    => 'assets/uploads/images/' . $safeName,
        'size'    => filesize($dest),
        'url'     => getBaseUrl() . '/assets/uploads/images/' . $safeName,
    ];
}

// ── Video Upload ───────────────────────────────────────────────────────────
function uploadVideo(): array {
    if (empty($_FILES['video'])) {
        throw new InvalidArgumentException('No video file received');
    }
    $file = $_FILES['video'];
    validateUpload($file, ALLOWED_VID_TYPES, 50 * 1024 * 1024); // 50MB for videos

    ensureDir(UPLOADS_DIR . 'videos/');
    $safeName = sanitizeFilename($file['name']);
    $dest     = UPLOADS_DIR . 'videos/' . $safeName;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        throw new RuntimeException('Failed to save uploaded video');
    }

    return [
        'success' => true,
        'message' => 'Video uploaded successfully',
        'file'    => $safeName,
        'path'    => 'assets/uploads/videos/' . $safeName,
        'size'    => filesize($dest),
        'url'     => getBaseUrl() . '/assets/uploads/videos/' . $safeName,
    ];
}

// ── List Images ────────────────────────────────────────────────────────────
function listImages(): array {
    $dirs = [
        __DIR__ . '/assets/images/',
        UPLOADS_DIR . 'images/',
    ];

    $images = [];
    foreach ($dirs as $dir) {
        if (!is_dir($dir)) continue;
        $files = glob($dir . '*.{jpg,jpeg,png,webp,gif,svg}', GLOB_BRACE);
        foreach ($files as $file) {
            $name = basename($file);
            $rel  = str_replace(__DIR__ . '/', '', $file);
            $images[] = [
                'name'     => $name,
                'path'     => $rel,
                'url'      => getBaseUrl() . '/' . $rel,
                'size'     => filesize($file),
                'modified' => filemtime($file),
                'type'     => mime_content_type($file),
            ];
        }
    }

    usort($images, fn($a, $b) => $b['modified'] - $a['modified']);

    return ['success' => true, 'count' => count($images), 'images' => $images];
}

// ── Delete Image ───────────────────────────────────────────────────────────
function deleteImage(): array {
    $body = getJsonBody();
    $path = $body['path'] ?? '';

    if (empty($path)) throw new InvalidArgumentException('No path provided');

    // Security: only allow deletions within uploads dir
    $abs = realpath(__DIR__ . '/' . ltrim($path, '/'));
    if (!$abs || strpos($abs, realpath(UPLOADS_DIR)) !== 0) {
        throw new RuntimeException('Access denied: cannot delete files outside uploads directory');
    }

    if (!file_exists($abs)) throw new RuntimeException('File not found');
    unlink($abs);

    return ['success' => true, 'message' => 'Image deleted', 'path' => $path];
}

// ── Rename Image ───────────────────────────────────────────────────────────
function renameImage(): array {
    $body    = getJsonBody();
    $oldPath = $body['path']    ?? '';
    $newName = $body['newName'] ?? '';

    if (empty($oldPath) || empty($newName)) {
        throw new InvalidArgumentException('Missing path or newName');
    }

    $absOld = realpath(__DIR__ . '/' . ltrim($oldPath, '/'));
    if (!$absOld || strpos($absOld, realpath(UPLOADS_DIR)) !== 0) {
        throw new RuntimeException('Access denied');
    }

    $dir    = dirname($absOld);
    $ext    = pathinfo($absOld, PATHINFO_EXTENSION);
    $newFile= sanitizeFilename($newName);
    if (!str_contains($newFile, '.')) $newFile .= '.' . $ext;
    $absNew = $dir . '/' . $newFile;

    rename($absOld, $absNew);

    $rel = str_replace(__DIR__ . '/', '', $absNew);
    return ['success' => true, 'message' => 'Renamed', 'new_path' => $rel];
}

// ── Backups ────────────────────────────────────────────────────────────────
function listBackups(): array {
    ensureDir(BACKUP_DIR);
    $files   = glob(BACKUP_DIR . 'backup_*.json');
    $backups = [];
    foreach ($files as $f) {
        $backups[] = ['file' => basename($f), 'date' => filemtime($f), 'size' => filesize($f)];
    }
    usort($backups, fn($a, $b) => $b['date'] - $a['date']);
    return ['success' => true, 'count' => count($backups), 'backups' => $backups];
}

function restoreBackup(): array {
    $body = getJsonBody();
    $file = basename($body['file'] ?? '');
    if (empty($file)) throw new InvalidArgumentException('No backup file specified');

    $src = BACKUP_DIR . $file;
    if (!file_exists($src)) throw new RuntimeException('Backup file not found');

    // Validate JSON
    $raw = file_get_contents($src);
    json_decode($raw);
    if (json_last_error() !== JSON_ERROR_NONE) throw new RuntimeException('Backup file is invalid JSON');

    copy($src, CMS_DATA_FILE);
    return ['success' => true, 'message' => "Restored from $file", 'restored_at' => date('c')];
}

// ── Status ─────────────────────────────────────────────────────────────────
function getStatus(): array {
    $backups = glob(BACKUP_DIR . 'backup_*.json') ?: [];
    $uploads = glob(UPLOADS_DIR . 'images/*.{jpg,jpeg,png,webp}', GLOB_BRACE) ?: [];
    return [
        'success'       => true,
        'server'        => 'PHP ' . PHP_VERSION,
        'cms_exists'    => file_exists(CMS_DATA_FILE),
        'cms_modified'  => file_exists(CMS_DATA_FILE) ? date('c', filemtime(CMS_DATA_FILE)) : null,
        'backups'       => count($backups),
        'uploads'       => count($uploads),
        'published_at'  => file_exists(__DIR__ . '/data/published.json')
                            ? json_decode(file_get_contents(__DIR__ . '/data/published.json'), true)['published_at'] ?? null
                            : null,
        'timestamp'     => date('c'),
        'php_version'   => PHP_VERSION,
    ];
}

// ── Reset ──────────────────────────────────────────────────────────────────
function resetCMS(): array {
    if (file_exists(CMS_DATA_FILE)) {
        // Backup before reset
        $backupFile = BACKUP_DIR . 'pre_reset_' . date('Y-m-d_H-i-s') . '.json';
        copy(CMS_DATA_FILE, $backupFile);
        unlink(CMS_DATA_FILE);
    }
    return ['success' => true, 'message' => 'CMS reset to defaults. Backup created.'];
}

// ── Default CMS ─────────────────────────────────────────────────────────────
function getDefaultCMS(): array {
    return [
        'logo'         => ['src' => 'assets/images/royal-hall-crest.webp', 'width' => 145, 'height' => 98, 'position' => 'left'],
        'navbar'       => ['design' => 0, 'buttonStyle' => 0, 'animation' => 0, 'hoverAnimation' => 0, 'height' => 72, 'bgColor' => '#0a0b0d', 'transparent' => true],
        'hero'         => ['src' => 'assets/images/hero-venue.jpg', 'scale' => 100, 'posX' => 50, 'posY' => 50, 'height' => 70, 'animation' => 0, 'displayMode' => 'cover', 'overlayColor' => '#000000', 'overlayOpacity' => 40, 'brightness' => 100, 'contrast' => 100],
        'heroHeading'  => ['text' => 'A Royal Celebration Awaits', 'animation' => 0, 'font' => 0, 'colorCombo' => 0, 'size' => 56, 'weight' => 800, 'lineHeight' => 1.15, 'letterSpacing' => -1],
        'heroSub'      => ['text' => 'The Perfect Venue for Weddings, Receptions, Birthdays, Corporate Events & More.', 'preset' => 0, 'size' => 18, 'weight' => 400, 'lineHeight' => 1.6],
        'background'   => ['src' => '', 'animation' => 0, 'posX' => 50, 'posY' => 50, 'overlayOpacity' => 30],
        'video'        => ['src' => '', 'autoplay' => true, 'loop' => true, 'muted' => true, 'posX' => 50, 'posY' => 50],
        'theme'        => ['active' => 0],
        'animations'   => ['activeItems' => []],
        'effects'      => ['activeItems' => []],
        'components'   => ['activeItems' => []],
        'fontAnimations' => ['active' => 0, 'targets' => []],
    ];
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function respondJson(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit();
}

function respondError(int $status, string $message): void {
    respondJson(['success' => false, 'error' => $message], $status);
}

function ensureDir(string $dir): void {
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException("Cannot create directory: $dir");
    }
}

function sanitizeFilename(string $name): string {
    $name = basename($name);
    $name = preg_replace('/[^a-zA-Z0-9._-]/', '_', $name);
    $name = preg_replace('/_+/', '_', $name);
    return strtolower($name);
}

function validateUpload(array $file, array $allowedTypes, int $maxSize): void {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors = [
            UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit',
            UPLOAD_ERR_FORM_SIZE  => 'File exceeds form limit',
            UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        ];
        throw new RuntimeException($errors[$file['error']] ?? 'Unknown upload error');
    }
    if ($file['size'] > $maxSize) {
        throw new InvalidArgumentException('File size exceeds maximum allowed (' . round($maxSize / 1024 / 1024) . 'MB)');
    }
    $mime = mime_content_type($file['tmp_name']);
    if (!in_array($mime, $allowedTypes, true)) {
        throw new InvalidArgumentException("File type '$mime' is not allowed");
    }
}

function pruneBackups(int $keep): void {
    $files = glob(BACKUP_DIR . 'backup_*.json');
    if (!$files || count($files) <= $keep) return;
    usort($files, fn($a, $b) => filemtime($a) - filemtime($b));
    $toDelete = array_slice($files, 0, count($files) - $keep);
    foreach ($toDelete as $f) unlink($f);
}

function getBaseUrl(): string {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host     = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $path     = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
    return $protocol . '://' . $host . $path;
}
