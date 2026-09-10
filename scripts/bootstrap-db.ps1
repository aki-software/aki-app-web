param()

$ErrorActionPreference = 'Stop'

# Script de inicialización de base de datos para entorno local (migraciones, diccionario y admin seed).
# No usar contra bases de datos en producción.

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..')

Set-Location $RepoRoot
pnpm --filter api run db:setup:local
