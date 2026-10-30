#!/usr/bin/env bash
# Gera portaria-toliman.zip com o que vai para a pasta do SharePoint.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f portaria-toliman.zip
tmp=$(mktemp -d)
cp -r painel/painel.html painel/LEIA-ME.md painel/lib painel/js "$tmp/"
mkdir -p "$tmp/entrega"
cp entrega/power-automate-fluxos.md entrega/roteiro-claude-no-edge.md "$tmp/entrega/"
(cd "$tmp" && zip -qr "$OLDPWD/portaria-toliman.zip" .)
rm -rf "$tmp"
echo "portaria-toliman.zip gerado"
