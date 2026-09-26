using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using TidySense.Data;

#nullable disable

namespace TidySense.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260921120000_CompleteAuthentication")]
public sealed class CompleteAuthentication : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "OtpChallenges");
        migrationBuilder.AddColumn<bool>(
            name: "SetupComplete", table: "Users", type: "boolean", nullable: false, defaultValue: true);
        migrationBuilder.AddCheckConstraint(
            name: "CK_Users_SessionEpoch", table: "Users", sql: "\"SessionEpoch\" >= 0");
        migrationBuilder.CreateTable(
            name: "OtpChallenges",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                NormalizedPhone = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                Purpose = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                CodeDigest = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                AttemptCount = table.Column<int>(type: "integer", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                UsedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_OtpChallenges", x => x.Id);
                table.CheckConstraint("CK_OtpChallenges_AttemptCount", "\"AttemptCount\" >= 0");
            });
        migrationBuilder.CreateIndex(
            name: "IX_OtpChallenges_NormalizedPhone_Purpose_CreatedAt",
            table: "OtpChallenges", columns: new[] { "NormalizedPhone", "Purpose", "CreatedAt" });
        migrationBuilder.CreateTable(
            name: "OtpRateEvents",
            columns: table => new
            {
                Id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                Kind = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                KeyDigest = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_OtpRateEvents", x => x.Id));
        migrationBuilder.CreateIndex(
            name: "IX_OtpRateEvents_Kind_KeyDigest_CreatedAt",
            table: "OtpRateEvents", columns: new[] { "Kind", "KeyDigest", "CreatedAt" });
        migrationBuilder.CreateIndex(
            name: "IX_OtpRateEvents_CreatedAt", table: "OtpRateEvents", column: "CreatedAt");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "OtpRateEvents");
        migrationBuilder.DropTable(name: "OtpChallenges");
        migrationBuilder.DropCheckConstraint(name: "CK_Users_SessionEpoch", table: "Users");
        migrationBuilder.DropColumn(name: "SetupComplete", table: "Users");
        migrationBuilder.CreateTable(
            name: "OtpChallenges",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                UserId = table.Column<Guid>(type: "uuid", nullable: false),
                CodeHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                FailedAttempts = table.Column<int>(type: "integer", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                ConsumedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_OtpChallenges", x => x.Id);
                table.ForeignKey("FK_OtpChallenges_Users_UserId", x => x.UserId, "Users", "Id",
                    onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.CreateIndex(
            name: "IX_OtpChallenges_UserId_ExpiresAt",
            table: "OtpChallenges", columns: new[] { "UserId", "ExpiresAt" });
    }
}
