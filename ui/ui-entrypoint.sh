#!/bin/sh

# Patch index.html to insert config parameter in the global window object
sed -i "s@<script></script>@<script>window.configs={SERVER_URL:\"${SERVER_URL}\",REPOSITORY_SERVER_URL:\"${REPOSITORY_SERVER_URL}\"}</script>@" /usr/share/nginx/html/index.html

# Start nginx
nginx -g "daemon off;"
