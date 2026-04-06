using NovaDrive.Models;

namespace NovaDrive.DTOs;

// ── Vehicle ───────────────────────────────────────────────
public record CreateVehicleDto(
    string VIN,
    string LicensePlate,
    string Model,
    VehicleType Type,
    int Year,
    double? Latitude,
    double? Longitude);

public record UpdateVehicleDto(
    string? LicensePlate,
    string? Model,
    VehicleType? Type,
    bool? IsActive,
    double? Latitude,
    double? Longitude);

// ── MaintenanceLog ────────────────────────────────────────
public record CreateMaintenanceLogDto(
    Guid VehicleId,
    string Description,
    string Technician,
    decimal Cost,
    int? NextServiceMileage);

public record UpdateMaintenanceLogDto(
    string? Description,
    string? Technician,
    decimal? Cost,
    int? NextServiceMileage);

// ── SupportTicket ─────────────────────────────────────────
public record CreateSupportTicketDto(
    string Subject,
    string Description,
    TicketPriority Priority = TicketPriority.Medium);

public record UpdateSupportTicketDto(
    TicketStatus? Status,
    string? Resolution);

// ── DiscountCode ──────────────────────────────────────────
public record CreateDiscountCodeDto(
    string Code,
    DiscountType Type,
    decimal Value,
    decimal? MinAmount,
    DateTime? ExpiresAt);

// ── Payment ───────────────────────────────────────────────
public record CreatePaymentDto(
    Guid RideId,
    decimal Amount,
    string Currency = "EUR");
