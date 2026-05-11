using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NovaDrive.Data;
using NovaDrive.DTOs;
using NovaDrive.Models;
using NovaDrive.Repositories;
using NovaDrive.Services;
using NovaDrive.Validators;
using Prometheus;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ── Logging ───────────────────────────────────────────────
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console());

// ── Database ──────────────────────────────────────────────
var provider = builder.Configuration["Database:Provider"]?.Trim().ToLowerInvariant() ?? "postgres";
if (provider == "sqlite")
{
    var sqliteConn = builder.Configuration.GetConnectionString("Sqlite") ?? "Data Source=novadrive.db";
    builder.Services.AddDbContext<NovaDriveContext>(opt => opt.UseSqlite(sqliteConn));
}
else
{
    var postgresConn = builder.Configuration.GetConnectionString("Postgres");
    if (!string.IsNullOrWhiteSpace(postgresConn))
        builder.Services.AddDbContext<NovaDriveContext>(opt => opt.UseNpgsql(postgresConn));
    else
        builder.Services.AddDbContext<NovaDriveContext>(opt =>
            opt.UseNpgsql("Host=localhost;Database=novadrive;Username=postgres;Password=postgres"));
}

// ── Repositories ──────────────────────────────────────────
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IVehicleRepository, VehicleRepository>();
builder.Services.AddScoped<IRideRepository, RideRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<IMaintenanceLogRepository, MaintenanceLogRepository>();
builder.Services.AddScoped<ISupportTicketRepository, SupportTicketRepository>();
builder.Services.AddScoped<IDiscountCodeRepository, DiscountCodeRepository>();

// ── Services ──────────────────────────────────────────────
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddSingleton<IAuthService, AuthService>();
builder.Services.AddSingleton<ITelemetryService, TelemetryService>();
builder.Services.AddSingleton<ISensorDiagnosticsService, SensorDiagnosticsService>();
builder.Services.AddSingleton<IPdfService, PdfService>();
builder.Services.AddSingleton<IInvoiceEmailService, InvoiceEmailService>();

// ── Validation ────────────────────────────────────────────
builder.Services.AddValidatorsFromAssemblyContaining<RegisterValidator>();

// ── JSON ──────────────────────────────────────────────────
builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(opts =>
{
    opts.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    opts.SerializerOptions.PropertyNameCaseInsensitive = true;
});

// ── JWT Auth ──────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"] ?? "ThisIsADevSecretKey_DoNotUseInProd!32charsMin";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.RequireHttpsMetadata = false;
        opt.SaveToken = true;
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "novadrive",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "novadrive_clients",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddHealthChecks();

// ── CORS ──────────────────────────────────────────────────
builder.Services.AddCors(o =>
    o.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// ── gRPC ──────────────────────────────────────────────────
builder.Services.AddGrpc();

// ── Swagger ───────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "NovaDrive API", Version = "v1" });
});

var app = builder.Build();

// ── Migrate & Seed ────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NovaDriveContext>();
    var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
    var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        // Some environments (e.g., SQLite integration tests) run without EF migrations.
        // EnsureCreated keeps startup resilient while production can still use Migrate.
        if (db.Database.IsSqlite())
        {
            db.Database.EnsureCreated();
        }
        else if (db.Database.GetMigrations().Any())
        {
            db.Database.Migrate();
        }
        else
        {
            db.Database.EnsureCreated();
        }

        var existingEmails = db.Users
            .Select(u => u.Email)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (!existingEmails.Contains("admin@novadrive.local"))
        {
            db.Users.Add(new User
            {
                Email = "admin@novadrive.local",
                PasswordHash = auth.HashPassword("Admin123!"),
                Role = UserRole.Admin,
                FullName = "System Admin"
            });
        }

        if (!existingEmails.Contains("passenger@novadrive.local"))
        {
            db.Users.Add(new User
            {
                Email = "passenger@novadrive.local",
                PasswordHash = auth.HashPassword("Password123!"),
                Role = UserRole.Passenger,
                FullName = "Demo Passenger",
                LoyaltyPoints = 240
            });
        }

        if (!db.Vehicles.Any())
        {
            db.Vehicles.AddRange(
                new Vehicle { VIN = "1HGCG5655WA043444", LicensePlate = "ND-001", Model = "Nova Standard", Type = VehicleType.Standard, Year = 2023, Latitude = 51.0, Longitude = 3.0 },
                new Vehicle { VIN = "2HGCG5655WA043445", LicensePlate = "ND-002", Model = "Nova Van", Type = VehicleType.Van, Year = 2021, Latitude = 51.01, Longitude = 3.01 },
                new Vehicle { VIN = "3HGCG5655WA043446", LicensePlate = "ND-003", Model = "Nova Lux", Type = VehicleType.Luxury, Year = 2024, Latitude = 51.02, Longitude = 3.02 });
        }

        if (!db.DiscountCodes.Any())
        {
            db.DiscountCodes.AddRange(
                new DiscountCode { Code = "WELCOME5", Type = DiscountType.Flat, Value = 5m, MinAmount = 0, ExpiresAt = DateTime.UtcNow.AddYears(1) },
                new DiscountCode { Code = "SUMMER24", Type = DiscountType.Percentage, Value = 15m, MinAmount = 10, ExpiresAt = DateTime.UtcNow.AddMonths(6) });
        }

        db.SaveChanges();
    }
    catch (Exception ex)
    {
        log.LogError(ex, "Failed to migrate/seed database");
        try
        {
            db.Database.EnsureCreated();
        }
        catch (Exception ensureEx)
        {
            log.LogError(ensureEx, "Failed to ensure database is created");
        }
    }
}

// ── Middleware ─────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("AllowAll");
app.UseHttpMetrics();
app.UseAuthentication();
app.UseAuthorization();
// Study guide endpoint (serves StudyGuide.md placed next to Program.cs)
app.MapGet("/study", async (Microsoft.AspNetCore.Hosting.IWebHostEnvironment env) =>
{
    var file = Path.Combine(env.ContentRootPath, "StudyGuide.md");
    return Results.File(file, "text/markdown");
}).WithTags("Docs");
app.MapGrpcService<NovaDrive.Grpc.TelemetryGrpcService>();
app.MapMetrics();
app.MapHealthChecks("/health");

// ═══════════════════════════════════════════════════════════
//  ROUTE GROUPS
// ═══════════════════════════════════════════════════════════

// helper to extract UserId from JWT
static Guid GetUserId(HttpContext ctx)
{
    var sub = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
              ?? ctx.User.FindFirstValue("sub");
    return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
}

static UserRole GetUserRole(HttpContext ctx)
{
    var roleClaim = ctx.User.FindFirstValue(ClaimTypes.Role);
    return Enum.TryParse<UserRole>(roleClaim, out var role) ? role : UserRole.Passenger;
}

// ─── AUTH ─────────────────────────────────────────────────
var auth_api = app.MapGroup("/api/auth").WithTags("Auth");

auth_api.MapPost("/register", async (RegisterDto dto, IValidator<RegisterDto> validator,
    IUserRepository users, IAuthService auth) =>
{
    var val = await validator.ValidateAsync(dto);
    if (!val.IsValid)
        return Results.ValidationProblem(val.ToDictionary());

    if (await users.GetByEmailAsync(dto.Email) is not null)
        return Results.Conflict(new { Message = "Email already registered" });

    var user = new User
    {
        Email = dto.Email,
        PasswordHash = auth.HashPassword(dto.Password),
        Role = UserRole.Passenger,
        FullName = dto.FullName,
        HomeAddress = dto.HomeAddress
    };
    await users.AddAsync(user);

    var token = auth.GenerateJwtToken(user);
    return Results.Created($"/api/users/{user.Id}",
           new AuthResultDto(token, user.Role.ToString(), user.Id));
});

auth_api.MapPost("/login", async (LoginDto dto, IValidator<LoginDto> validator,
    IUserRepository users, IAuthService auth) =>
{
    var val = await validator.ValidateAsync(dto);
    if (!val.IsValid) return Results.ValidationProblem(val.ToDictionary());

    var user = await users.GetByEmailAsync(dto.Email);
    if (user is null || !auth.VerifyPassword(user.PasswordHash, dto.Password))
        return Results.Unauthorized();

    user.LastLoginAt = DateTime.UtcNow;
    await users.UpdateAsync(user);

    var token = auth.GenerateJwtToken(user);
    return Results.Ok(new AuthResultDto(token, user.Role.ToString(), user.Id));
});

// ─── PRICING ──────────────────────────────────────────────
var pricing_api = app.MapGroup("/api/pricing").WithTags("Pricing");

pricing_api.MapPost("/estimate", async (PriceRequestDto req, IValidator<PriceRequestDto> validator,
    IPricingService pricing) =>
{
    var val = await validator.ValidateAsync(req);
    if (!val.IsValid) return Results.ValidationProblem(val.ToDictionary());

    var res = await pricing.CalculatePriceAsync(req.DistanceKm, req.DurationMinutes,
        req.VehicleType, req.StartTime, req.LoyaltyPoints, req.DiscountCode);

    return Results.Ok(new PriceBreakdownDto(
        res.BasePrice, res.AfterMultipliers, res.LoyaltyDiscount,
        res.PromoDiscount, res.VatAmount, res.TotalPrice));
});

// ─── RIDES ────────────────────────────────────────────────
var rides_api = app.MapGroup("/api/rides").RequireAuthorization().WithTags("Rides");

rides_api.MapPost("/", async (RideRequestDto req, IValidator<RideRequestDto> validator,
    IUserRepository users, IVehicleRepository vehicles,
    IRideRepository rides, IPricingService pricing, HttpContext ctx) =>
{
    var val = await validator.ValidateAsync(req);
    if (!val.IsValid) return Results.ValidationProblem(val.ToDictionary());

    var passenger = await users.GetByIdAsync(req.PassengerId);
    if (passenger is null) return Results.BadRequest(new { Message = "Passenger not found" });

    var vehicle = await vehicles.GetNearestActiveAsync(req.PickupLat, req.PickupLng);

    decimal distanceKm = Math.Max(0.5m, Math.Round((decimal)(
        Math.Sqrt(Math.Pow(req.PickupLat - req.DropoffLat, 2)
                + Math.Pow(req.PickupLng - req.DropoffLng, 2)) * 111), 2));
    decimal durationMin = Math.Max(2m, Math.Round(distanceKm / 0.5m * 5m, 0));

    var price = await pricing.CalculatePriceAsync(distanceKm, durationMin,
        vehicle?.Type ?? VehicleType.Standard, DateTime.UtcNow, passenger.LoyaltyPoints);

    var ride = new Ride
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
        FareExcludingVat = price.TotalPrice - price.VatAmount,
        VatAmount = price.VatAmount,
        TotalFare = price.TotalPrice,
        Currency = "EUR"
    };
    await rides.AddAsync(ride);

    return Results.Created($"/api/rides/{ride.Id}",
           new { ride.Id, ride.TotalFare, ride.Currency });
});

rides_api.MapGet("/", async (Guid? passengerId, IRideRepository rides) =>
{
    if (passengerId.HasValue)
        return Results.Ok(await rides.GetByPassengerAsync(passengerId.Value));
    return Results.Ok(await rides.GetAllAsync());
});

rides_api.MapGet("/{id:guid}", async (Guid id, IRideRepository rides) =>
{
    var ride = await rides.GetByIdAsync(id);
    return ride is null ? Results.NotFound() : Results.Ok(ride);
});

rides_api.MapPost("/{id:guid}/complete", async (Guid id, IRideRepository rides,
    IPaymentRepository payments, IUserRepository users, IPdfService pdf, IInvoiceEmailService emailer) =>
{
    var ride = await rides.GetByIdAsync(id);
    if (ride is null) return Results.NotFound();
    if (ride.Status == RideStatus.Completed)
        return Results.BadRequest(new { Message = "Ride already completed" });

    ride.Status = RideStatus.Completed;
    ride.CompletedAt = DateTime.UtcNow;
    await rides.UpdateAsync(ride);

    // credit loyalty points (1 point per EUR spent)
    var passenger = await users.GetByIdAsync(ride.PassengerId);
    if (passenger is not null)
    {
        passenger.LoyaltyPoints += (int)(ride.TotalFare ?? 0);
        await users.UpdateAsync(passenger);
    }

    var payment = new Payment
    {
        RideId = ride.Id,
        Amount = ride.TotalFare ?? 0m,
        Currency = ride.Currency ?? "EUR",
        Status = PaymentStatus.Successful,
        TransactionReference = $"TXN-{Guid.NewGuid():N}"[..20],
        PaidAt = DateTime.UtcNow
    };
    await payments.AddAsync(payment);

    var pdfPath = pdf.GenerateInvoicePdf(ride.Id.ToString(),
        passenger?.Email ?? "unknown",
        ride.FareExcludingVat ?? 0, ride.VatAmount ?? 0,
        ride.TotalFare ?? 0, ride.Currency ?? "EUR");

    if (passenger is not null)
    {
        await emailer.SendInvoiceAsync(passenger.Email, ride.Id.ToString(), pdfPath,
            ride.TotalFare ?? 0, ride.Currency ?? "EUR");
    }

    var bytes = await File.ReadAllBytesAsync(pdfPath);
    return Results.File(bytes, "application/pdf", Path.GetFileName(pdfPath));
});

// ─── TELEMETRY ────────────────────────────────────────────
var telemetry_api = app.MapGroup("/api/telemetry").WithTags("Telemetry");

telemetry_api.MapPost("/", async (TelemetryEntry entry, ITelemetryService telemetry) =>
{
    entry.Timestamp = entry.Timestamp == default ? DateTime.UtcNow : entry.Timestamp;
    await telemetry.InsertAsync(entry);
    return Results.Accepted();
});

telemetry_api.MapGet("/latest", async (int? limit, ITelemetryService telemetry) =>
{
    var l = Math.Clamp(limit ?? 20, 1, 100);
    return Results.Ok(await telemetry.GetLatestAsync(l));
});

telemetry_api.MapGet("/vehicle/{vehicleId:guid}", async (Guid vehicleId, int? limit,
    ITelemetryService telemetry) =>
{
    var l = Math.Clamp(limit ?? 20, 1, 100);
    return Results.Ok(await telemetry.GetByVehicleAsync(vehicleId, l));
});

// ─── ACTIVE RIDES (as telemetry proxy for GUI-created rides) ────
telemetry_api.MapGet("/active-rides", async (IRideRepository rides, IVehicleRepository vehicles) =>
{
    var activeRides = await rides.GetAllAsync();
    activeRides = activeRides
        .Where(r => r.Status == RideStatus.Requested || r.Status == RideStatus.EnRoute)
        .ToList();

    var result = new List<object>();
    foreach (var ride in activeRides)
    {
        var vehicle = ride.VehicleId.HasValue ? await vehicles.GetByIdAsync(ride.VehicleId.Value) : null;
        result.Add(new
        {
            vehicleId = ride.VehicleId?.ToString() ?? "unassigned",
            timestamp = ride.RequestedAt,
            latitude = vehicle?.Latitude ?? ride.PickupLat,
            longitude = vehicle?.Longitude ?? ride.PickupLng,
            speedKmh = 0.0,
            batteryPercent = 50,
            internalTempC = 22.0,
            displayName = $"Ride {ride.Id.ToString().Substring(0, 8)}",
            isRide = true
        });
    }
    return Results.Ok(result);
});

// ─── SENSOR DIAGNOSTICS ───────────────────────────────────
var diagnostics_api = app.MapGroup("/api/sensors/diagnostics").WithTags("Sensor Diagnostics");

diagnostics_api.MapPost("/", async (SensorDiagnosticEntry entry, ISensorDiagnosticsService diagnostics) =>
{
    entry.Timestamp = entry.Timestamp == default ? DateTime.UtcNow : entry.Timestamp;
    await diagnostics.InsertAsync(entry);
    return Results.Accepted();
});

diagnostics_api.MapGet("/latest", async (int? limit, ISensorDiagnosticsService diagnostics) =>
{
    var l = Math.Clamp(limit ?? 20, 1, 100);
    return Results.Ok(await diagnostics.GetLatestAsync(l));
});

diagnostics_api.MapGet("/vehicle/{vehicleId:guid}", async (Guid vehicleId, int? limit,
    ISensorDiagnosticsService diagnostics) =>
{
    var l = Math.Clamp(limit ?? 20, 1, 100);
    return Results.Ok(await diagnostics.GetByVehicleAsync(vehicleId, l));
});

// ─── SUPPORT TICKETS ──────────────────────────────────────
var tickets_api = app.MapGroup("/api/tickets").RequireAuthorization().WithTags("Support Tickets");

tickets_api.MapPost("/", async (CreateSupportTicketDto dto, IValidator<CreateSupportTicketDto> validator,
    ISupportTicketRepository tickets, HttpContext ctx) =>
{
    var val = await validator.ValidateAsync(dto);
    if (!val.IsValid) return Results.ValidationProblem(val.ToDictionary());

    var userId = GetUserId(ctx);
    var ticket = new SupportTicket
    {
        UserId = userId,
        Subject = dto.Subject,
        Description = dto.Description,
        Priority = dto.Priority
    };
    await tickets.AddAsync(ticket);
    return Results.Created($"/api/tickets/{ticket.Id}", ticket);
});

tickets_api.MapGet("/", async (ISupportTicketRepository tickets, HttpContext ctx) =>
{
    var role = GetUserRole(ctx);
    if (role == UserRole.Admin)
        return Results.Ok(await tickets.GetAllAsync());

    var userId = GetUserId(ctx);
    return Results.Ok(await tickets.GetByUserAsync(userId));
});

tickets_api.MapGet("/{id:guid}", async (Guid id, ISupportTicketRepository tickets) =>
{
    var t = await tickets.GetByIdAsync(id);
    return t is null ? Results.NotFound() : Results.Ok(t);
});

tickets_api.MapPut("/{id:guid}", async (Guid id, UpdateSupportTicketDto dto,
    ISupportTicketRepository tickets) =>
{
    var t = await tickets.GetByIdAsync(id);
    if (t is null) return Results.NotFound();

    if (dto.Status.HasValue) t.Status = dto.Status.Value;
    if (dto.Resolution is not null) t.Resolution = dto.Resolution;
    t.UpdatedAt = DateTime.UtcNow;

    await tickets.UpdateAsync(t);
    return Results.Ok(t);
});

// ─── ADMIN ────────────────────────────────────────────────
var admin_api = app.MapGroup("/api/admin").RequireAuthorization(p => p.RequireRole(UserRole.Admin.ToString())).WithTags("Admin");

// -- Users management --
admin_api.MapGet("/users", async (IUserRepository users) =>
    Results.Ok(await users.GetAllAsync()));

admin_api.MapGet("/users/{id:guid}", async (Guid id, IUserRepository users) =>
{
    var u = await users.GetByIdAsync(id);
    return u is null ? Results.NotFound() : Results.Ok(u);
});

admin_api.MapDelete("/users/{id:guid}", async (Guid id, IUserRepository users) =>
{
    await users.DeleteAsync(id);
    return Results.NoContent();
});

// -- Vehicles management --
admin_api.MapGet("/vehicles", async (IVehicleRepository vehicles) =>
    Results.Ok(await vehicles.GetAllAsync()));

admin_api.MapGet("/vehicles/{id:guid}", async (Guid id, IVehicleRepository vehicles) =>
{
    var v = await vehicles.GetByIdAsync(id);
    return v is null ? Results.NotFound() : Results.Ok(v);
});

admin_api.MapPost("/vehicles", async (CreateVehicleDto dto, IValidator<CreateVehicleDto> validator,
    IVehicleRepository vehicles) =>
{
    var val = await validator.ValidateAsync(dto);
    if (!val.IsValid) return Results.ValidationProblem(val.ToDictionary());

    var v = new Vehicle
    {
        VIN = dto.VIN,
        LicensePlate = dto.LicensePlate,
        Model = dto.Model,
        Type = dto.Type,
        Year = dto.Year,
        Latitude = dto.Latitude,
        Longitude = dto.Longitude
    };
    await vehicles.AddAsync(v);
    return Results.Created($"/api/admin/vehicles/{v.Id}", v);
});

admin_api.MapPut("/vehicles/{id:guid}", async (Guid id, UpdateVehicleDto dto,
    IVehicleRepository vehicles) =>
{
    var v = await vehicles.GetByIdAsync(id);
    if (v is null) return Results.NotFound();

    if (dto.LicensePlate is not null) v.LicensePlate = dto.LicensePlate;
    if (dto.Model is not null) v.Model = dto.Model;
    if (dto.Type.HasValue) v.Type = dto.Type.Value;
    if (dto.IsActive.HasValue) v.IsActive = dto.IsActive.Value;
    if (dto.Latitude.HasValue) v.Latitude = dto.Latitude.Value;
    if (dto.Longitude.HasValue) v.Longitude = dto.Longitude.Value;

    await vehicles.UpdateAsync(v);
    return Results.Ok(v);
});

admin_api.MapDelete("/vehicles/{id:guid}", async (Guid id, IVehicleRepository vehicles) =>
{
    await vehicles.DeleteAsync(id);
    return Results.NoContent();
});

// -- Maintenance Logs --
admin_api.MapGet("/maintenance", async (Guid? vehicleId, IMaintenanceLogRepository logs) =>
{
    if (vehicleId.HasValue)
        return Results.Ok(await logs.GetByVehicleAsync(vehicleId.Value));
    return Results.Ok(await logs.GetAllAsync());
});

admin_api.MapPost("/maintenance", async (CreateMaintenanceLogDto dto,
    IValidator<CreateMaintenanceLogDto> validator, IMaintenanceLogRepository logs) =>
{
    var val = await validator.ValidateAsync(dto);
    if (!val.IsValid) return Results.ValidationProblem(val.ToDictionary());

    var log = new MaintenanceLog
    {
        VehicleId = dto.VehicleId,
        Description = dto.Description,
        Technician = dto.Technician,
        Cost = dto.Cost,
        NextServiceMileage = dto.NextServiceMileage
    };
    await logs.AddAsync(log);
    return Results.Created($"/api/admin/maintenance/{log.Id}", log);
});

admin_api.MapPut("/maintenance/{id:guid}", async (Guid id, UpdateMaintenanceLogDto dto,
    IMaintenanceLogRepository logs) =>
{
    var log = await logs.GetByIdAsync(id);
    if (log is null) return Results.NotFound();

    if (dto.Description is not null) log.Description = dto.Description;
    if (dto.Technician is not null) log.Technician = dto.Technician;
    if (dto.Cost.HasValue) log.Cost = dto.Cost.Value;
    if (dto.NextServiceMileage.HasValue) log.NextServiceMileage = dto.NextServiceMileage.Value;

    await logs.UpdateAsync(log);
    return Results.Ok(log);
});

admin_api.MapDelete("/maintenance/{id:guid}", async (Guid id, IMaintenanceLogRepository logs) =>
{
    await logs.DeleteAsync(id);
    return Results.NoContent();
});

// -- Discount Codes --
admin_api.MapGet("/discounts", async (IDiscountCodeRepository discounts) =>
    Results.Ok(await discounts.GetAllAsync()));

admin_api.MapPost("/discounts", async (CreateDiscountCodeDto dto,
    IValidator<CreateDiscountCodeDto> validator, IDiscountCodeRepository discounts) =>
{
    var val = await validator.ValidateAsync(dto);
    if (!val.IsValid) return Results.ValidationProblem(val.ToDictionary());

    var d = new DiscountCode
    {
        Code = dto.Code,
        Type = dto.Type,
        Value = dto.Value,
        MinAmount = dto.MinAmount,
        ExpiresAt = dto.ExpiresAt
    };
    await discounts.AddAsync(d);
    return Results.Created($"/api/admin/discounts/{d.Id}", d);
});

admin_api.MapDelete("/discounts/{id:guid}", async (Guid id, IDiscountCodeRepository discounts) =>
{
    await discounts.DeleteAsync(id);
    return Results.NoContent();
});

app.Run();

// Required for WebApplicationFactory in integration tests
public partial class Program { }
