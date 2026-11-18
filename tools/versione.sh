#!/bin/sh
# Aggiunge/aggiorna ?v=<versione> agli import dei moduli, così i browser scaricano subito la nuova versione dopo un push.
# Uso: sh tools/versione.sh   (dalla radice del repository)
V=$(date +%Y%m%d%H%M)
cd "$(dirname "$0")/.." || exit 1
sed -i -E "s#(from '\./[a-z]+\.js)(\?v=[0-9]+)?'#\1?v=$V'#g; s#(import\('\.\./supabase\.min\.js)(\?v=[0-9]+)?'\)#\1?v=$V')#g" js/*.js
sed -i -E "s#(src=\"js/main\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#; s#(href=\"css/luminos\.css)(\?v=[0-9]+)?\"#\1?v=$V\"#" index.html
echo "versione: $V"
