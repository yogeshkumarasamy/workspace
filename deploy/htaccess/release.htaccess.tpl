Options -Indexes
DirectoryIndex index.html
RewriteEngine On
RewriteBase __BASE__releases/__SHA__/

# 1. Real files as-is
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
# 2. Option B (yt-scheduler PHP API) only: route /api/* to the front controller
RewriteRule ^api/ api/index.php [L]
# 3. Old tab asking for a chunk from an older build → previous release (chains back). Omitted on the first release.
RewriteRule ^assets/(.+)$ __BASE__releases/__PREVIOUS__/assets/$1 [L]
# 4. Missing static files are real 404s (never return index.html for a .js)
RewriteRule \.(js|mjs|css|map|json|webmanifest|png|jpe?g|gif|svg|webp|avif|ico|woff2?|txt|xml)$ - [R=404,L,NC]
# 5. History-routing SPA fallback (portfolio is hash-routed; this rule is harmless there)
RewriteRule ^ index.html [L]

<IfModule mod_headers.c>
  # Shell + runtime files always revalidate
  <FilesMatch "^(index\.html|app-config\.json|\.release\.json|sw\.js|registerSW\.js|manifest\.webmanifest)$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>
  # Vite content-hashed files (name-XXXXXXXX.ext) are immutable
  <FilesMatch "-[A-Za-z0-9_-]{8}\.(js|mjs|css|woff2?|png|jpe?g|svg|webp|avif)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "^sw\.js$">
    Header set Service-Worker-Allowed "__BASE__"
  </FilesMatch>
</IfModule>
<IfModule mod_mime.c>
  AddType application/manifest+json .webmanifest
  AddType text/javascript .js .mjs
</IfModule>
# Option B only: secrets live outside the docroot; deny direct access to PHP internals
<FilesMatch "\.(sql|lock|neon|dist|md)$">
  Require all denied
</FilesMatch>
