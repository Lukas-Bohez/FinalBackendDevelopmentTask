using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using NovaDrive.Data;

#nullable disable

namespace NovaDrive.Migrations
{
    [DbContext(typeof(NovaDriveContext))]
    partial class NovaDriveContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
            modelBuilder
                .HasAnnotation("ProductVersion", "8.0.12")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            modelBuilder.Entity("NovaDrive.Models.User", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<string>("Email").IsRequired().HasColumnType("text");
                b.Property<string>("PasswordHash").IsRequired().HasColumnType("text");
                b.Property<int>("Role").HasColumnType("integer");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp without time zone");
                b.Property<DateTime?>("LastLoginAt").HasColumnType("timestamp without time zone");
                b.Property<string>("FullName").HasColumnType("text");
                b.Property<string>("HomeAddress").HasColumnType("text");
                b.Property<int>("LoyaltyPoints").HasColumnType("integer");
                b.Property<string>("PreferredPaymentMethod").HasColumnType("text");
                b.HasKey("Id");
                b.HasIndex("Email").IsUnique();
                b.ToTable("Users");
            });

            modelBuilder.Entity("NovaDrive.Models.Vehicle", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<string>("VIN").IsRequired().HasColumnType("text");
                b.Property<string>("LicensePlate").IsRequired().HasColumnType("text");
                b.Property<string>("Model").IsRequired().HasColumnType("text");
                b.Property<int>("Type").HasColumnType("integer");
                b.Property<int>("Year").HasColumnType("integer");
                b.Property<bool>("IsActive").HasColumnType("boolean");
                b.Property<double?>("Latitude").HasColumnType("double precision");
                b.Property<double?>("Longitude").HasColumnType("double precision");
                b.HasKey("Id");
                b.ToTable("Vehicles");
            });

            modelBuilder.Entity("NovaDrive.Models.Ride", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<Guid>("PassengerId").HasColumnType("uuid");
                b.Property<Guid?>("VehicleId").HasColumnType("uuid");
                b.Property<int>("Status").HasColumnType("integer");
                b.Property<string>("PickupAddress").IsRequired().HasColumnType("text");
                b.Property<string>("DropoffAddress").IsRequired().HasColumnType("text");
                b.Property<double>("PickupLat").HasColumnType("double precision");
                b.Property<double>("PickupLng").HasColumnType("double precision");
                b.Property<double>("DropoffLat").HasColumnType("double precision");
                b.Property<double>("DropoffLng").HasColumnType("double precision");
                b.Property<decimal>("DistanceKm").HasColumnType("numeric(18,2)");
                b.Property<decimal>("DurationMinutes").HasColumnType("numeric(18,2)");
                b.Property<DateTime>("RequestedAt").HasColumnType("timestamp without time zone");
                b.Property<DateTime?>("StartedAt").HasColumnType("timestamp without time zone");
                b.Property<DateTime?>("CompletedAt").HasColumnType("timestamp without time zone");
                b.Property<decimal?>("FareExcludingVat").HasColumnType("numeric(18,2)");
                b.Property<decimal?>("VatAmount").HasColumnType("numeric(18,2)");
                b.Property<decimal?>("TotalFare").HasColumnType("numeric(18,2)");
                b.Property<string>("Currency").HasColumnType("text");
                b.HasKey("Id");
                b.HasIndex("PassengerId");
                b.HasIndex("VehicleId");
                b.ToTable("Rides");
            });

            modelBuilder.Entity("NovaDrive.Models.Payment", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<Guid>("RideId").HasColumnType("uuid");
                b.Property<decimal>("Amount").HasColumnType("numeric(18,2)");
                b.Property<string>("Currency").IsRequired().HasColumnType("text");
                b.Property<int>("Status").HasColumnType("integer");
                b.Property<string>("TransactionReference").HasColumnType("text");
                b.Property<DateTime?>("PaidAt").HasColumnType("timestamp without time zone");
                b.HasKey("Id");
                b.HasIndex("RideId");
                b.ToTable("Payments");
            });

            modelBuilder.Entity("NovaDrive.Models.Ride", b =>
            {
                b.HasOne("NovaDrive.Models.User", null)
                    .WithMany()
                    .HasForeignKey("PassengerId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();

                b.HasOne("NovaDrive.Models.Vehicle", null)
                    .WithMany()
                    .HasForeignKey("VehicleId")
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity("NovaDrive.Models.Payment", b =>
            {
                b.HasOne("NovaDrive.Models.Ride", null)
                    .WithMany()
                    .HasForeignKey("RideId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });
        }
    }
}
