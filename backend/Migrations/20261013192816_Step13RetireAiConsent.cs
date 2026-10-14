using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <summary>
    /// Retires the AI consent step (Discussion 027 §2). The account's current consent state is
    /// dropped; the decisions themselves remain R1 <c>AI_CONSENT_CHANGED</c> events. Rolling back
    /// restores the columns empty, so the Step 11 gate would ask every account again.
    /// </summary>
    public partial class Step13RetireAiConsent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Users_AiConsent",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AiConsentAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AiConsentNoticeVersion",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AiConsentProvider",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AiConsentRevision",
                table: "Users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AiConsentAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AiConsentNoticeVersion",
                table: "Users",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AiConsentProvider",
                table: "Users",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "AiConsentRevision",
                table: "Users",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Users_AiConsent",
                table: "Users",
                sql: "(\"AiConsentProvider\" IS NULL) = (\"AiConsentNoticeVersion\" IS NULL) AND (\"AiConsentProvider\" IS NULL) = (\"AiConsentAt\" IS NULL)");
        }
    }
}
