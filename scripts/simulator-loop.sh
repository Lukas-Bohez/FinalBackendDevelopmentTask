#!/bin/sh
set -eu

API_BASE_URL="${API_BASE_URL:-http://api:80}"
DELAY_SECONDS="${SIMULATOR_DELAY_SECONDS:-3}"

vehicle_ids="11111111-1111-1111-1111-111111111111 22222222-2222-2222-2222-222222222222 33333333-3333-3333-3333-333333333333"

echo "Starting telemetry simulator loop against ${API_BASE_URL}"

random_float() {
  min="$1"
  max="$2"
  awk -v min="$min" -v max="$max" 'BEGIN{srand(); printf "%.6f", min+rand()*(max-min)}'
}

random_int() {
  max="$1"
  awk -v max="$max" 'BEGIN{srand(); print int(rand()*max)}'
}

while true; do
  for vid in $vehicle_ids; do
    lat="$(random_float 50.980000 51.040000)"
    lon="$(random_float 2.980000 3.040000)"
    speed="$(random_float 20 120)"
    battery="$(( $(random_int 76) + 25 ))"
    temp="$(random_float 35 75)"
    ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    payload="{\"vehicleId\":\"${vid}\",\"timestamp\":\"${ts}\",\"latitude\":${lat},\"longitude\":${lon},\"speedKmh\":${speed},\"batteryPercent\":${battery},\"internalTempC\":${temp}}"

    curl -sS -X POST "${API_BASE_URL}/api/telemetry" -H "Content-Type: application/json" -d "$payload" >/dev/null || true

    if [ "$(random_int 20)" -eq 0 ]; then
      diag="{\"vehicleId\":\"${vid}\",\"sensorType\":\"Lidar\",\"errorCode\":\"SIM_LIDAR_$(date +%s)\",\"severity\":\"Warning\",\"timestamp\":\"${ts}\",\"rawSensorDataJson\":\"{\\\"source\\\":\\\"simulator\\\"}\"}"
      curl -sS -X POST "${API_BASE_URL}/api/sensors/diagnostics" -H "Content-Type: application/json" -d "$diag" >/dev/null || true
    fi

    echo "$(date -u +"%H:%M:%S") telemetry sent for ${vid}"
  done

  sleep "$DELAY_SECONDS"
done