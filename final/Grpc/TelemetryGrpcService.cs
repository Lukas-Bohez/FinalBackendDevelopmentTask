using System;
using System.Threading.Tasks;
using Grpc.Core;
using Microsoft.Extensions.Logging;
using NovaDrive.Services;

namespace NovaDrive.Grpc
{
    public class TelemetryGrpcService : Novadrive.TelemetryService.TelemetryServiceBase
    {
        private readonly ITelemetryService _telemetry;
        private readonly ILogger<TelemetryGrpcService> _logger;

        public TelemetryGrpcService(ITelemetryService telemetry, ILogger<TelemetryGrpcService> logger)
        {
            _telemetry = telemetry;
            _logger = logger;
        }

        public override async Task<Novadrive.TelemetryAck> Send(Novadrive.TelemetryEntry request, ServerCallContext context)
        {
            _logger.LogDebug("gRPC telemetry received from {vid}", request.VehicleId);

            var entry = new NovaDrive.Services.TelemetryEntry
            {
                VehicleId = Guid.Parse(request.VehicleId),
                Timestamp = request.Timestamp == 0 ? DateTime.UtcNow : DateTimeOffset.FromUnixTimeMilliseconds(request.Timestamp).UtcDateTime,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                SpeedKmh = request.SpeedKmh,
                BatteryPercent = request.BatteryPercent,
                InternalTempC = request.InternalTempC
            };

            await _telemetry.InsertAsync(entry);
            return new Novadrive.TelemetryAck { Ok = true, Message = "stored" };
        }
    }
}
