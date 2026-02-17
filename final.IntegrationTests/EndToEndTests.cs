using System;
using System.Collections.Generic;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Configurations;
using DotNet.Testcontainers.Containers;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

#nullable enable

namespace NovaDrive.IntegrationTests
{
    public class EndToEndTests : IAsyncLifetime
    {
        private readonly PostgreSqlTestcontainer _pgContainer;
        private readonly MongoDbTestcontainer _mongoContainer;
        private WebApplicationFactory<Program>? _factory;
        private System.Net.Http.HttpClient? _client;

        public EndToEndTests()
        {
            _pgContainer = new TestcontainersBuilder<PostgreSqlTestcontainer>()
                .WithDatabase(new PostgreSqlTestcontainerConfiguration { Database = "novadrive", Username = "postgres", Password = "postgres" })
                .WithImage("postgres:15")
                .WithCleanUp(true)
                .Build();

            _mongoContainer = new TestcontainersBuilder<MongoDbTestcontainer>()
                .WithDatabase(new MongoDbTestcontainerConfiguration { Database = "novadrive" })
                .WithImage("mongo:6.0")
                .WithCleanUp(true)
                .Build();
        }

        public async Task InitializeAsync()
        {
            await _pgContainer.StartAsync();
            await _mongoContainer.StartAsync();

            var pgConn = _pgContainer.ConnectionString;
            var mongoConn = _mongoContainer.ConnectionString;

            _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            {
                builder.ConfigureAppConfiguration((ctx, conf) =>
                {
                    var settings = new Dictionary<string, string>
                    {
                        ["ConnectionStrings:Postgres"] = pgConn,
                        ["Mongo:ConnectionString"] = mongoConn,
                        ["Jwt:Key"] = "IntegrationTest_SecretKey_ChangeMe"
                    };
                    conf.AddInMemoryCollection(settings);
                });
            });

            _client = _factory.CreateClient();
        }

        [Fact]
        public async Task Register_Price_Ride_Telemetry_Workflow()
        {
            // Register
            var reg = new { email = "ituser@example.com", password = "Password123!", fullName = "IT User" };
            var regResp = await _client!.PostAsJsonAsync("/api/public/register", reg);
            regResp.EnsureSuccessStatusCode();
            var regBody = await regResp.Content.ReadFromJsonAsync<JsonElement>();
            var userId = regBody.GetProperty("Id").GetGuid();

            // Price estimate
            var priceReq = new { distanceKm = 3.5m, durationMinutes = 8m, vehicleType = "Standard", startTime = DateTime.UtcNow };
            var priceResp = await _client.PostAsJsonAsync("/api/public/price", priceReq);
            priceResp.EnsureSuccessStatusCode();
            var body = await priceResp.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(body.GetProperty("TotalPrice").GetDecimal() >= 5.0m);

            // Request a ride
            var rideReq = new { passengerId = userId, pickupLat = 51.0m, pickupLng = 3.0m, dropoffLat = 51.01m, dropoffLng = 3.01m, pickupAddress = "Start", dropoffAddress = "End" };
            var rideResp = await _client.PostAsJsonAsync("/api/public/rides", rideReq);
            rideResp.EnsureSuccessStatusCode();
            var rideBody = await rideResp.Content.ReadFromJsonAsync<JsonElement>();
            var rideId = rideBody.GetProperty("Id").GetGuid();

            // Complete ride (should return PDF)
            var completeResp = await _client.PostAsync($"/api/public/rides/{rideId}/complete", null);
            completeResp.EnsureSuccessStatusCode();
            Assert.Equal("application/pdf", completeResp.Content.Headers.ContentType?.MediaType);

            // Telemetry ingestion
            var telemetry = new { vehicleId = Guid.NewGuid(), timestamp = DateTime.UtcNow, latitude = 51.0, longitude = 3.0, speedKmh = 12.5, batteryPercent = 75, internalTempC = 40.0 };
            var telResp = await _client.PostAsJsonAsync("/api/telemetry", telemetry);
            Assert.Equal(System.Net.HttpStatusCode.Accepted, telResp.StatusCode);
        }

        public async Task DisposeAsync()
        {
            _client?.Dispose();
            _factory?.Dispose();
            await _mongoContainer.StopAsync();
            await _pgContainer.StopAsync();
        }
    }
}
