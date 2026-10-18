Options -Indexes
<IfModule mod_headers.c>
  Header always set X-Robots-Tag "noindex, nofollow, noarchive"
  Header always set Cache-Control "no-store"
</IfModule>
RewriteEngine On
# No landing page or listing at /previews/ or /previews/<app>/
RewriteRule ^([a-z-]+/?)?$ - [R=404,L]
