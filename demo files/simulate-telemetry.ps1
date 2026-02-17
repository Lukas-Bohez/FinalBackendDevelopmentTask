Param(
    [string]$url = 'http://localhost:5000/api/telemetry',
    [int]$count = 20,
    [int]$delayMs = 1000
)

Write-Host "Sending $count telemetry messages to $url"
for ($i = 0; $i -lt $count; $i++) {
    $payload = @{
        vehicleId      = [guid]::NewGuid().ToString();
        timestamp      = (Get-Date -UFormat %s) * 1000; # unix ms
        latitude       = 51.0 + (Get-Random -Minimum -0.02 -Maximum 0.02);
        longitude      = 3.0 + (Get-Random -Minimum -0.02 -Maximum 0.02);
        speedKmh       = (Get-Random -Minimum 0 -Maximum 100);
        batteryPercent = (Get-Random -Minimum 10 -Maximum 100);
        internalTempC  = (Get-Random -Minimum 20 -Maximum 70);
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri $url -Method Post -Body $payload -ContentType 'application/json'
        Write-Host "sent $($i+1)" -ForegroundColor Green
    }
    catch {
        Write-Host "failed: $_" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds $delayMs
}
