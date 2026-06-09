# PolisAI Watchdog — keeps uvicorn + cloudflared alive
$backendDir = "C:\Users\Administrator\Desktop\polish\backend"
$cloudflaredExe = "C:\Users\Administrator\Desktop\ShritAgent\bin\cloudflared.exe"
$cfLogFile = "C:\Users\Administrator\cf-backend.log"

Write-Host "[watchdog] Starting PolisAI backend + Cloudflare tunnel..."

function Start-Backend {
    $existing = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*uvicorn*" -or $_.MainWindowTitle -like "*uvicorn*" }
    if (-not $existing) {
        Write-Host "[watchdog] Starting uvicorn..."
        Start-Process -FilePath "python" `
            -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000" `
            -WorkingDirectory $backendDir `
            -WindowStyle Hidden
    }
}

function Start-Tunnel {
    $existing = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
    if (-not $existing) {
        Write-Host "[watchdog] Starting cloudflared tunnel..."
        Start-Process -FilePath $cloudflaredExe `
            -ArgumentList "tunnel --url http://localhost:8000" `
            -RedirectStandardError $cfLogFile `
            -WindowStyle Hidden
        Start-Sleep 12
        $url = Select-String -Path $cfLogFile -Pattern "https://.*trycloudflare\.com" | Select-Object -Last 1
        if ($url) { Write-Host "[watchdog] Tunnel URL: $($url.Matches[0].Value)" }
    }
}

Start-Backend
Start-Tunnel

# Watch loop — check every 30 seconds
while ($true) {
    Start-Sleep 30

    $uvicorn = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CPU -gt 0 }
    if (-not $uvicorn) {
        Write-Host "[watchdog $(Get-Date -Format 'HH:mm:ss')] uvicorn down — restarting..."
        Start-Backend
    }

    $cf = Get-Process cloudflared -ErrorAction SilentlyContinue
    if (-not $cf) {
        Write-Host "[watchdog $(Get-Date -Format 'HH:mm:ss')] cloudflared down — restarting..."
        Start-Tunnel
    }
}
