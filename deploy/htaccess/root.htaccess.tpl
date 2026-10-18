Options -Indexes
DirectoryIndex index.html
RewriteEngine On

# HTTPS
RewriteCond %{HTTPS} !=on
RewriteCond %{HTTP:X-Forwarded-Proto} !https
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
# www → apex (prod only; harmless elsewhere)
RewriteCond %{HTTP_HOST} ^www\.(yogeshkumarasamy\.in)$ [NC]
RewriteRule ^ https://%1%{REQUEST_URI} [R=301,L]

# Never serve VCS / legacy FTP state / env files
RewriteRule (^|/)\.(git|svn|env|ftp-deploy-sync-state\.json) - [R=404,L,NC]

# Subdomain folders Hostinger nests inside the apex docroot must not leak
RewriteCond %{HTTP_HOST} ^yogeshkumarasamy\.in$ [NC]
RewriteRule ^(dev|staging)(/|$) - [R=404,L]

# Previews exist only on dev. The live prefix is /preview/; /previews/ is still refused.
RewriteCond %{HTTP_HOST} !^dev\.yogeshkumarasamy\.in$ [NC]
RewriteRule ^previews?(/|$) - [R=404,L]

# Root → portfolio (302 until verified, then 301 on prod). The browser keeps #hash routes.
RewriteRule ^$ /portfolio/ [R=302,L]
# Old root-level portfolio files from the pre-move layout
RewriteRule ^(index\.html|og\.png|favicon\.svg|sitemap\.xml)$ /portfolio/$1 [R=301,L]

<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=31536000"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(self)"
  # Report-only first; __API_ORIGINS__ = this env's Worker origins
  Header always set Content-Security-Policy-Report-Only "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' __API_ORIGINS__; frame-ancestors 'self'; base-uri 'self'"
  # dev + staging only (CI omits this line on prod)
  Header always set X-Robots-Tag "noindex, nofollow"
</IfModule>
