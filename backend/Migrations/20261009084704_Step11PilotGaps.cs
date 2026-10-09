using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step11PilotGaps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_OperationsRecords_Kind",
                table: "OperationsRecords");

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

            migrationBuilder.CreateTable(
                name: "PilotFeedbackResponses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Instrument = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    InstrumentVersion = table.Column<int>(type: "integer", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    Answer = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PilotFeedbackResponses", x => x.Id);
                    table.CheckConstraint("CK_PilotFeedbackResponses_Answer", "\"Answer\" BETWEEN 1 AND 5");
                    table.CheckConstraint("CK_PilotFeedbackResponses_Instrument", "\"Instrument\" IN ('H1_USEFULNESS', 'H2_UNDERSTANDING')");
                    table.CheckConstraint("CK_PilotFeedbackResponses_InstrumentVersion", "\"InstrumentVersion\" > 0");
                    table.ForeignKey(
                        name: "FK_PilotFeedbackResponses_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Users_AiConsent",
                table: "Users",
                sql: "(\"AiConsentProvider\" IS NULL) = (\"AiConsentNoticeVersion\" IS NULL) AND (\"AiConsentProvider\" IS NULL) = (\"AiConsentAt\" IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OperationsRecords_Kind",
                table: "OperationsRecords",
                sql: "\"Kind\" IN ('MAINTENANCE_RUN', 'USER_ERASURE', 'ALERT_DIGEST')");

            migrationBuilder.CreateIndex(
                name: "IX_PilotFeedbackResponses_CreatedAt",
                table: "PilotFeedbackResponses",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PilotFeedbackResponses_Instrument_SubjectId",
                table: "PilotFeedbackResponses",
                columns: new[] { "Instrument", "SubjectId" });

            migrationBuilder.CreateIndex(
                name: "IX_PilotFeedbackResponses_UserId_Instrument_SubjectId",
                table: "PilotFeedbackResponses",
                columns: new[] { "UserId", "Instrument", "SubjectId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PilotFeedbackResponses");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Users_AiConsent",
                table: "Users");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OperationsRecords_Kind",
                table: "OperationsRecords");

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

            // The previous schema has no place for a digest record (R4 diagnostics).
            migrationBuilder.Sql("DELETE FROM \"OperationsRecords\" WHERE \"Kind\" = 'ALERT_DIGEST'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OperationsRecords_Kind",
                table: "OperationsRecords",
                sql: "\"Kind\" IN ('MAINTENANCE_RUN', 'USER_ERASURE')");
        }
    }
}
