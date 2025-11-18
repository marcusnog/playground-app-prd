# Script para limpar cache e rebuildar
Write-Host "Limpando cache..." -ForegroundColor Yellow

# Limpar cache do Vite
if (Test-Path "node_modules\.vite") {
    Remove-Item -Recurse -Force "node_modules\.vite"
    Write-Host "Cache do Vite removido" -ForegroundColor Green
}

# Limpar cache do TypeScript
if (Test-Path ".tsbuildinfo") {
    Remove-Item -Force ".tsbuildinfo"
    Write-Host "Cache do TypeScript removido" -ForegroundColor Green
}

# Reinstalar dependências
Write-Host "Reinstalando dependências..." -ForegroundColor Yellow
npm install

# Build
Write-Host "Executando build..." -ForegroundColor Yellow
npm run build

Write-Host "Concluído!" -ForegroundColor Green

