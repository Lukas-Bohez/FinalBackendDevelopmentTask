using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NovaDrive.Services;
using Xunit;

namespace NovaDrive.IntegrationTests;

public class EndToEndTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public EndToEndTests(WebApplicationFactory<Program> factory)
    {
        var dbPath = Path.Combine(Path.GetTempPath(), $"novadrive_integration_{Guid.NewGuid():N}.db");
        var sqliteConnection = $"Data Source={dbPath}";

        Environment.SetEnvironmentVariable("Database__Provider", "sqlite");
        Environment.SetEnvironmentVariable("ConnectionStrings__Sqlite", sqliteConnection);

        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Database:Provider"] = "sqlite",
                    ["ConnectionStrings:Sqlite"] = sqliteConnection
                });
            });

            builder.ConfigureServices(services =>
            {
                var telemetryDescriptor = services.SingleOrDefault(d =>
                    d.ServiceType == typeof(ITelemetryService));
                if (telemetryDescriptor is not null)
                {
                    services.Remove(telemetryDescriptor);
                }

                services.AddSingleton<ITelemetryService, InMemoryTelemetryService>();
            });
        });
    }

    [Fact]
    public async Task PricingEstimate_ReturnsSuccessfulResponse()
    {
        using var client = _factory.CreateClient();

        var payload = new
        {
            distanceKm = 4.2m,
            durationMinutes = 12m,
            vehicleType = "Standard",
            startTime = DateTime.UtcNow,
            loyaltyPoints = 0,
            discountCode = (string?)null
        };

        var response = await client.PostAsJsonAsync("/api/pricing/estimate", payload);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("totalPrice", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AuthAndRideWorkflow_CanCreateAndCompleteRide()
    {
        using var client = _factory.CreateClient();
        var uniqueEmail = $"e2e-{Guid.NewGuid():N}@novadrive.local";

        var registerPayload = new
        {
            email = uniqueEmail,
            password = "Password123!",
            fullName = "Integration Rider",
            homeAddress = "Test Street 1"
        };

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", registerPayload);
        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);

        var registerResult = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(registerResult);
        Assert.False(string.IsNullOrWhiteSpace(registerResult!.Token));

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", registerResult.Token);

        var ridePayload = new
        {
            passengerId = registerResult.UserId,
            pickupLat = 51.0,
            pickupLng = 3.0,
            dropoffLat = 51.01,
            dropoffLng = 3.01,
            pickupAddress = "Campus",
            dropoffAddress = "Station"
        };

        var createRideResponse = await client.PostAsJsonAsync("/api/rides", ridePayload);
        Assert.Equal(HttpStatusCode.Created, createRideResponse.StatusCode);

        var createRideResult = await createRideResponse.Content.ReadFromJsonAsync<CreateRideResponse>();
        Assert.NotNull(createRideResult);

        var completeRideResponse = await client.PostAsync($"/api/rides/{createRideResult!.Id}/complete", null);
        Assert.Equal(HttpStatusCode.OK, completeRideResponse.StatusCode);
        Assert.Equal("application/pdf", completeRideResponse.Content.Headers.ContentType?.MediaType);

        var pdfBytes = await completeRideResponse.Content.ReadAsByteArrayAsync();
        Assert.True(pdfBytes.Length > 100);
    }

    [Fact]
    public async Task TelemetryEndpoints_CanStoreAndReadLatest()
    {
        using var client = _factory.CreateClient();

        var vehicleId = Guid.NewGuid();
        var telemetryPayload = new
        {
            vehicleId,
            timestamp = DateTime.UtcNow,
            latitude = 51.0,
            longitude = 3.0,
            speedKmh = 20.5,
            batteryPercent = 82,
            internalTempC = 41.2
        };

        var postResponse = await client.PostAsJsonAsync("/api/telemetry", telemetryPayload);
        Assert.Equal(HttpStatusCode.Accepted, postResponse.StatusCode);

        var latestResponse = await client.GetAsync("/api/telemetry/latest?limit=5");
        Assert.Equal(HttpStatusCode.OK, latestResponse.StatusCode);

        var body = await latestResponse.Content.ReadAsStringAsync();
        Assert.Contains(vehicleId.ToString(), body, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class AuthResponse
    {
        public string Token { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public Guid UserId { get; set; }
    }

    private sealed class CreateRideResponse
    {
        public Guid Id { get; set; }
        public decimal TotalFare { get; set; }
        public string Currency { get; set; } = string.Empty;
    }

    private sealed class InMemoryTelemetryService : ITelemetryService
    {
        private readonly List<TelemetryEntry> _entries = [];

        public Task InsertAsync(TelemetryEntry entry)
        {
            _entries.Add(entry);
            return Task.CompletedTask;
        }

        public Task<List<TelemetryEntry>> GetLatestAsync(int limit = 50)
            => Task.FromResult(_entries.OrderByDescending(e => e.Timestamp).Take(limit).ToList());

        public Task<List<TelemetryEntry>> GetByVehicleAsync(Guid vehicleId, int limit = 50)
            => Task.FromResult(_entries
                .Where(e => e.VehicleId == vehicleId)
                .OrderByDescending(e => e.Timestamp)
                .Take(limit)
                .ToList());
    }
}
