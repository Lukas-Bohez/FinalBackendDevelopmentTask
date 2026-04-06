param(
    [string]$BaseUrl = "http://localhost:5000",
    [int]$Iterations = 30,
    [int]$DelaySeconds = 2
)

$ErrorActionPreference = "Stop"

$vehicleIds = @(
    [guid]::Parse("11111111-1111-1111-1111-111111111111"),
    [guid]::Parse("22222222-2222-2222-2222-222222222222"),
    [guid]::Parse("33333333-3333-3333-3333-333333333333")
)

$sensorTypes = @("Lidar", "Radar", "Camera")
$severities = @("Info", "Warning", "Critical")

Write-Output "Starting simulation: $Iterations iterations, delay $DelaySeconds sec"

for ($i = 1; $i -le $Iterations; $i++) {
    $vid = $vehicleIds | Get-Random
    $telemetryPayload = @{
        vehicleId = $vid
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        latitude = [math]::Round((51.0 + (Get-Random -Minimum -0.02 -Maximum 0.02)), 6)
        longitude = [math]::Round((3.0 + (Get-Random -Minimum -0.02 -Maximum 0.02)), 6)
        speedKmh = [math]::Round((Get-Random -Minimum 0 -Maximum 65) + (Get-Random), 1)
        batteryPercent = Get-Random -Minimum 25 -Maximum 100
        internalTempC = [math]::Round((Get-Random -Minimum 30 -Maximum 75) + (Get-Random), 1)
    } | ConvertTo-Json

    try {
        Invoke-WebRequest -Uri "$BaseUrl/api/telemetry" -Method POST -ContentType "application/json" -Body $telemetryPayload -UseBasicParsing | Out-Null
        Write-Output "[$i] telemetry sent for $vid"
    }
    catch {
        Write-Output "[$i] telemetry failed: $($_.Exception.Message)"
    }

    if ((Get-Random -Minimum 1 -Maximum 5) -eq 1) {
        $sensorType = $sensorTypes | Get-Random
        $severity = $severities | Get-Random
        $errorCode = "$($sensorType.ToUpper())_" + (Get-Random -Minimum 100 -Maximum 999)
        $raw = @{ confidence = [math]::Round((Get-Random -Minimum 0.1 -Maximum 1.0), 3); notes = "Auto-generated diagnostic" } | ConvertTo-Json -Compress

        $diagPayload = @{
            vehicleId = $vid
            sensorType = $sensorType
            errorCode = $errorCode
            severity = $severity
            timestamp = (Get-Date).ToUniversalTime().ToString("o")
            rawSensorDataJson = $raw
        } | ConvertTo-Json

        try {
            Invoke-WebRequest -Uri "$BaseUrl/api/sensors/diagnostics" -Method POST -ContentType "application/json" -Body $diagPayload -UseBasicParsing | Out-Null
            Write-Output "[$i] diagnostic sent for $vid ($sensorType/$severity)"
        }
        catch {
            Write-Output "[$i] diagnostic failed: $($_.Exception.Message)"
        }
    }

    Start-Sleep -Seconds $DelaySeconds
}

Write-Output "Simulation completed."
