using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step6RoutineOccurrence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Routines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GoalId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: true),
                    ContinuationOfRoutineId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    RecurrenceDefinition = table.Column<string>(type: "jsonb", nullable: false),
                    RecurrenceTimezone = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    TimesOfDay = table.Column<TimeOnly[]>(type: "time without time zone[]", nullable: false),
                    EffectiveFromLocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EffectiveUntilLocalDate = table.Column<DateOnly>(type: "date", nullable: true),
                    MaterializedThroughLocalDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    StoppedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Source = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Routines", x => x.Id);
                    table.CheckConstraint("CK_Routines_ContinuationNotSelf", "\"ContinuationOfRoutineId\" IS NULL OR \"ContinuationOfRoutineId\" <> \"Id\"");
                    table.CheckConstraint("CK_Routines_EffectiveRange", "\"EffectiveUntilLocalDate\" IS NULL OR \"EffectiveUntilLocalDate\" >= \"EffectiveFromLocalDate\" - 1");
                    table.CheckConstraint("CK_Routines_ParentExclusive", "NOT (\"GoalId\" IS NOT NULL AND \"ProjectId\" IS NOT NULL)");
                    table.CheckConstraint("CK_Routines_RecurrenceObject", "jsonb_typeof(\"RecurrenceDefinition\") = 'object'");
                    table.CheckConstraint("CK_Routines_Source", "\"Source\" IN ('MANUAL', 'AI_ASSISTED', 'SYSTEM_MIGRATED')");
                    table.CheckConstraint("CK_Routines_Status", "\"Status\" IN ('ACTIVE', 'STOPPED')");
                    table.CheckConstraint("CK_Routines_StoppedState", "(\"Status\" = 'ACTIVE' AND \"StoppedAt\" IS NULL AND \"EffectiveUntilLocalDate\" IS NULL) OR (\"Status\" = 'STOPPED' AND \"StoppedAt\" IS NOT NULL AND \"EffectiveUntilLocalDate\" IS NOT NULL)");
                    table.CheckConstraint("CK_Routines_Version", "\"Version\" > 0");
                    table.ForeignKey(
                        name: "FK_Routines_Goals_GoalId_UserId",
                        columns: x => new { x.GoalId, x.UserId },
                        principalTable: "Goals",
                        principalColumns: new[] { "Id", "UserId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Routines_Projects_ProjectId_UserId",
                        columns: x => new { x.ProjectId, x.UserId },
                        principalTable: "Projects",
                        principalColumns: new[] { "Id", "UserId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Routines_Routines_ContinuationOfRoutineId",
                        column: x => x.ContinuationOfRoutineId,
                        principalTable: "Routines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Routines_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RoutineOccurrences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RoutineId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScheduledLocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ScheduledLocalTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoutineOccurrences", x => x.Id);
                    table.CheckConstraint("CK_RoutineOccurrences_Resolution", "(\"Status\" = 'PENDING' AND \"ResolvedAt\" IS NULL) OR (\"Status\" IN ('DONE', 'MISSED') AND \"ResolvedAt\" IS NOT NULL)");
                    table.CheckConstraint("CK_RoutineOccurrences_Status", "\"Status\" IN ('PENDING', 'DONE', 'MISSED')");
                    table.CheckConstraint("CK_RoutineOccurrences_Version", "\"Version\" > 0");
                    table.ForeignKey(
                        name: "FK_RoutineOccurrences_Routines_RoutineId",
                        column: x => x.RoutineId,
                        principalTable: "Routines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RoutineOccurrences_Status_ScheduledLocalDate",
                table: "RoutineOccurrences",
                columns: new[] { "Status", "ScheduledLocalDate" });

            migrationBuilder.CreateIndex(
                name: "IX_RoutineOccurrences_TimedIdentity",
                table: "RoutineOccurrences",
                columns: new[] { "RoutineId", "ScheduledLocalDate", "ScheduledLocalTime" },
                unique: true,
                filter: "\"ScheduledLocalTime\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_RoutineOccurrences_UntimedIdentity",
                table: "RoutineOccurrences",
                columns: new[] { "RoutineId", "ScheduledLocalDate" },
                unique: true,
                filter: "\"ScheduledLocalTime\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Routines_ContinuationOfRoutineId",
                table: "Routines",
                column: "ContinuationOfRoutineId",
                unique: true,
                filter: "\"ContinuationOfRoutineId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Routines_GoalId_UserId",
                table: "Routines",
                columns: new[] { "GoalId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_Routines_ProjectId_UserId",
                table: "Routines",
                columns: new[] { "ProjectId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_Routines_UserId_CreatedAt_Id",
                table: "Routines",
                columns: new[] { "UserId", "CreatedAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_Routines_UserId_GoalId_Status",
                table: "Routines",
                columns: new[] { "UserId", "GoalId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Routines_UserId_ProjectId_Status",
                table: "Routines",
                columns: new[] { "UserId", "ProjectId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Routines_UserId_Status",
                table: "Routines",
                columns: new[] { "UserId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RoutineOccurrences");

            migrationBuilder.DropTable(
                name: "Routines");
        }
    }
}
