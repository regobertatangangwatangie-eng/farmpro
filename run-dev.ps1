param()

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Host "Starting FarmPro dev environment from $root"

# Backend
Push-Location (Join-Path $root 'backend')
Write-Host "Installing backend dependencies..."
npm install
Write-Host "Starting backend (new terminal)..."
Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command","Set-Location -LiteralPath '$PWD'; npm run start"
Pop-Location

# Frontend
Push-Location (Join-Path $root 'frontend')
Write-Host "Installing frontend dependencies..."
npm install
Write-Host "Starting frontend (new terminal)..."
Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command","Set-Location -LiteralPath '$PWD'; npm start"
Pop-Location

Write-Host "Dev servers launched. Check the new terminals for logs."
