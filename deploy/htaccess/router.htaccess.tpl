Options -Indexes
RewriteEngine On
RewriteBase __BASE__
# Requests already inside releases/ are handled by that release's own .htaccess;
# if the release folder is gone (pruned) this stops a loop and gives a 404
RewriteRule ^releases/ - [L]
# Everything else → the live release
RewriteRule ^(.*)$ releases/__CURRENT__/$1 [L]
