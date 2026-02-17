using System.Text;
using Serilog;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NovaDrive.Data;
using System.Text.Json.Serialization;
using NovaDrive.Repositories;
using NovaDrive.Services;
using NovaDrive.Validators;
using FluentValidation;
using FluentValidation.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Configuration & logging
builder.Host.UseSerilog((ctx, lc) => lc.WriteTo.Console());

// DbContext - prefer PostgreSQL, fallback to SQLite for dev
var conn = builder.Configuration.GetConnectionString("Postgres");
if (!string.IsNullOrWhiteSpace(conn))
    builder.Services.AddDbContext<NovaDriveContext>(opt => opt.UseNpgsql(conn));
else
    builder.Services.AddDbContext<NovaDriveContext>(opt => opt.UseSqlite("Data Source=novadrive.db"));

// Services & repos
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IVehicleRepository, VehicleRepository>();

builder.Services.AddSingleton<IPricingService>(_ => new PricingService(decimal.Parse(builder.Configuration["Vat:Rate"] ?? "0.21")));
builder.Services.AddSingleton<IAuthService, AuthService>();
builder.Services.AddSingleton<ITelemetryService, TelemetryService>();
builder.Services.AddSingleton<IPdfService, PdfService>();

// Validation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterValidator>();

// JSON enum handling: accept enum names as strings in JSON (e.g. "Standard")
builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(opts =>
{
    opts.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    opts.SerializerOptions.PropertyNameCaseInsensitive = true;
});

// JWT
var jwtKey = builder.Configuration["Jwt:Key"] ?? "ThisIsADevSecretKey_DoNotUseInProd";
var issuer = builder.Configuration["Jwt:Issuer"] ?? "novadrive";
var audience = builder.Configuration["Jwt:Audience"] ?? "novadrive_clients";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

// CORS - allow the website test during development
builder.Services.AddCors(options => options.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// gRPC
builder.Services.AddGrpc();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Ensure DB + seed demo data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NovaDriveContext>();
    var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
    try
    {
        // apply EF Core migrations (use migrations in /Migrations)
        db.Database.Migrate();

        if (!db.Users.Any())
        {
            db.Users.Add(new NovaDrive.Models.User { Email = "admin@novadrive.local", PasswordHash = auth.HashPassword("Admin123!"), Role = NovaDrive.Models.UserRole.Admin, FullName = "System Admin" });
            db.Users.Add(new NovaDrive.Models.User { Email = "passenger@novadrive.local", PasswordHash = auth.HashPassword("Password123!"), Role = NovaDrive.Models.UserRole.Passenger, FullName = "Demo Passenger", LoyaltyPoints = 240 });
        }

        if (!db.Vehicles.Any())
        {
            db.Vehicles.Add(new NovaDrive.Models.Vehicle { VIN = "VIN0001", LicensePlate = "ND-001", Model = "Nova Standard", Type = NovaDrive.Models.VehicleType.Standard, Year = 2023, Latitude = 51.0, Longitude = 3.0 });
            db.Vehicles.Add(new NovaDrive.Models.Vehicle { VIN = "VIN0002", LicensePlate = "ND-002", Model = "Nova Van", Type = NovaDrive.Models.VehicleType.Van, Year = 2021, Latitude = 51.01, Longitude = 3.01 });
            db.Vehicles.Add(new NovaDrive.Models.Vehicle { VIN = "VIN0003", LicensePlate = "ND-003", Model = "Nova Lux", Type = NovaDrive.Models.VehicleType.Luxury, Year = 2024, Latitude = 51.02, Longitude = 3.02 });
        }

        db.SaveChanges();
    }
    catch (Exception ex) { /* ignore in demo */ }
}

app.UseSwagger();
app.UseSwaggerUI();

// CORS for website tests
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

// gRPC endpoint (internal telemetry)
app.MapGrpcService<NovaDrive.Grpc.TelemetryGrpcService>();

// Minimal API endpoints (public)
app.MapPost("/api/public/register", async (NovaDrive.DTOs.RegisterDto dto, IUserRepository users, IAuthService auth) =>
{
    var existing = await users.GetByEmailAsync(dto.Email);
    if (existing != null) return Results.Conflict(new { Message = "Email already registered" });

    var user = new NovaDrive.Models.User
    {
        Email = dto.Email,
        PasswordHash = auth.HashPassword(dto.Password),
        Role = NovaDrive.Models.UserRole.Passenger,
        FullName = dto.FullName,
        HomeAddress = dto.HomeAddress,
        LoyaltyPoints = 0
    };

    await users.AddAsync(user);

    return Results.Created($"/api/public/users/{user.Id}", new { user.Id, user.Email });
});

app.MapPost("/api/public/login", async (NovaDrive.DTOs.LoginDto dto, IUserRepository users, IAuthService auth) =>
{
    var user = await users.GetByEmailAsync(dto.Email);
    if (user == null) return Results.Unauthorized();
    if (!auth.VerifyPassword(user.PasswordHash, dto.Password)) return Results.Unauthorized();

    user.LastLoginAt = DateTime.UtcNow;
    await users.UpdateAsync(user);

    var token = auth.GenerateJwtToken(user);
    return Results.Ok(new { Token = token, Role = user.Role.ToString(), UserId = user.Id });
});

app.MapPost("/api/public/price", (NovaDrive.DTOs.PriceRequestDto req, IPricingService pricing) =>
{
    var res = pricing.CalculatePrice(req.DistanceKm, req.DurationMinutes, req.VehicleType, req.StartTime, req.LoyaltyPoints, req.DiscountCode);
    return Results.Ok(new { res.BasePrice, res.AfterMultipliers, res.LoyaltyDiscount, res.PromoDiscount, res.VatAmount, res.TotalPrice });
});

app.MapPost("/api/public/rides", async (NovaDrive.DTOs.RideRequestDto req, IUserRepository users, IVehicleRepository vehicles, NovaDrive.Data.NovaDriveContext db, IPricingService pricing) =>
{
    var passenger = await users.GetByIdAsync(req.PassengerId);
    if (passenger == null) return Results.BadRequest(new { Message = "Passenger not found" });

    var vehicle = await vehicles.GetNearestActiveAsync(req.PickupLat, req.PickupLng);

    // compute simple distance/duration approximation for demo
    decimal distanceKm = Math.Max(0.5m, Math.Round((decimal)(Math.Sqrt(Math.Pow(req.PickupLat - req.DropoffLat, 2) + Math.Pow(req.PickupLng - req.DropoffLng, 2)) * 111), 2));
    decimal durationMin = Math.Max(2m, Math.Round(distanceKm / 0.5m * 5m, 0));

    var price = pricing.CalculatePrice(distanceKm, durationMin, vehicle?.Type ?? NovaDrive.Models.VehicleType.Standard, DateTime.UtcNow, passenger.LoyaltyPoints);

    var ride = new NovaDrive.Models.Ride
    {
        PassengerId = passenger.Id,
        VehicleId = vehicle?.Id,
        PickupLat = req.PickupLat,
        PickupLng = req.PickupLng,
        DropoffLat = req.DropoffLat,
        DropoffLng = req.DropoffLng,
        PickupAddress = req.PickupAddress,
        DropoffAddress = req.DropoffAddress,
        DistanceKm = distanceKm,
        DurationMinutes = durationMin,
        FareExcludingVat = Math.Round(price.TotalPrice - price.VatAmount, 2),
        VatAmount = price.VatAmount,
        TotalFare = price.TotalPrice,
        Currency = "EUR"
    };

    db.Rides.Add(ride);
    await db.SaveChangesAsync();

    return Results.Created($"/api/public/rides/{ride.Id}", new { ride.Id, ride.TotalFare, ride.Currency });
});

// list rides (optional filter by passengerId)
app.MapGet("/api/public/rides", async (string? passengerId, NovaDrive.Data.NovaDriveContext db) =>
{
    if (!string.IsNullOrWhiteSpace(passengerId) && Guid.TryParse(passengerId, out var pid))
        return Results.Ok(await db.Rides.Where(r => r.PassengerId == pid).ToListAsync());

    return Results.Ok(await db.Rides.ToListAsync());
});

app.MapGet("/api/public/rides/{id:guid}", async (Guid id, NovaDrive.Data.NovaDriveContext db) =>
{
    var ride = await db.Rides.FindAsync(id);
    return ride is null ? Results.NotFound() : Results.Ok(ride);
});

// complete ride (simulate payment + invoice generation)
app.MapPost("/api/public/rides/{id:guid}/complete", async (Guid id, NovaDrive.Data.NovaDriveContext db, IPdfService pdf, IConfiguration cfg) =>
{
    var ride = await db.Rides.FindAsync(id);
    if (ride == null) return Results.NotFound();

    ride.Status = NovaDrive.Models.RideStatus.Completed;
    ride.CompletedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    // create payment record
    var payment = new NovaDrive.Models.Payment
    {
        RideId = ride.Id,
        Amount = ride.TotalFare ?? 0m,
        Currency = ride.Currency ?? "EUR",
        Status = NovaDrive.Models.PaymentStatus.Successful,
        TransactionReference = Guid.NewGuid().ToString(),
        PaidAt = DateTime.UtcNow
    };

    db.Payments.Add(payment);
    await db.SaveChangesAsync();

    // generate PDF invoice and return it
    var invoiceHtml = $"Ride {ride.Id} - Amount: {ride.TotalFare} {ride.Currency}";
    var filename = pdf.GenerateInvoicePdf(ride.Id.ToString(), "passenger@novadrive.local", invoiceHtml);
    var bytes = await File.ReadAllBytesAsync(filename);
    return Results.File(bytes, "application/pdf", Path.GetFileName(filename));
});

// telemetry read (latest entries)
app.MapGet("/api/public/telemetry/latest", async (int limit, ITelemetryService telemetry) =>
{
    var l = Math.Clamp(limit, 1, 100);
    var entries = await telemetry.GetLatestAsync(l);
    return Results.Ok(entries);
});

// Telemetry ingestion (public endpoint used by vehicle system or simulator)
app.MapPost("/api/telemetry", async (NovaDrive.Services.TelemetryEntry entry, ITelemetryService telemetry) =>
{
    entry.Timestamp = entry.Timestamp == default ? DateTime.UtcNow : entry.Timestamp;
    await telemetry.InsertAsync(entry);
    return Results.Accepted();
});

// simple admin endpoints (protected)
app.MapGet("/api/admin/vehicles", async (NovaDrive.Data.NovaDriveContext db) => await db.Vehicles.ToListAsync()).RequireAuthorization();
app.MapPost("/api/admin/vehicles", async (NovaDrive.Models.Vehicle v, NovaDrive.Data.NovaDriveContext db) => { db.Vehicles.Add(v); await db.SaveChangesAsync(); return Results.Created($"/api/admin/vehicles/{v.Id}", v); }).RequireAuthorization();

app.Run();

// Needed for WebApplicationFactory in integration tests
public partial class Program { }
