#!/usr/bin/env sh
set -eu

# Script de inicialización de base de datos para entorno local (migraciones, diccionario y admin seed).
# No usar contra bases de datos en producción.

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

cd "$REPO_ROOT"
pnpm --filter api run db:setup:local
