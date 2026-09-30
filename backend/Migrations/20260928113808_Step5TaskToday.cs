using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step5TaskToday : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddUniqueConstraint(
                name: "AK_Projects_Id_UserId",
                table: "Projects",
                columns: new[] { "Id", "UserId" });

            migrationBuilder.CreateTable(
                name: "Tasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GoalId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    PlannedDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Deadline = table.Column<DateOnly>(type: "date", nullable: true),
                    SequenceId = table.Column<Guid>(type: "uuid", nullable: true),
                    SequenceOrder = table.Column<int>(type: "integer", nullable: true),
                    CompletedForLocalDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    TerminalAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Source = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tasks", x => x.Id);
                    table.CheckConstraint("CK_Tasks_Deadline", "\"Deadline\" IS NULL OR \"PlannedDate\" IS NULL OR \"PlannedDate\" <= \"Deadline\"");
                    table.CheckConstraint("CK_Tasks_ParentExclusive", "NOT (\"GoalId\" IS NOT NULL AND \"ProjectId\" IS NOT NULL)");
                    table.CheckConstraint("CK_Tasks_SequencePair", "(\"SequenceId\" IS NULL AND \"SequenceOrder\" IS NULL) OR (\"SequenceId\" IS NOT NULL AND \"SequenceOrder\" IS NOT NULL AND \"SequenceOrder\" > 0)");
                    table.CheckConstraint("CK_Tasks_Source", "\"Source\" IN ('MANUAL', 'AI_ASSISTED', 'SYSTEM_MIGRATED')");
                    table.CheckConstraint("CK_Tasks_Status", "\"Status\" IN ('ACTIVE', 'COMPLETED', 'DROPPED')");
                    table.CheckConstraint("CK_Tasks_TemporalValidity", "\"Status\" <> 'ACTIVE' OR \"GoalId\" IS NOT NULL OR \"ProjectId\" IS NOT NULL OR \"PlannedDate\" IS NOT NULL");
                    table.CheckConstraint("CK_Tasks_TerminalState", "(\"Status\" = 'ACTIVE' AND \"TerminalAt\" IS NULL AND \"CompletedForLocalDate\" IS NULL) OR (\"Status\" = 'COMPLETED' AND \"TerminalAt\" IS NOT NULL AND \"CompletedForLocalDate\" IS NOT NULL) OR (\"Status\" = 'DROPPED' AND \"TerminalAt\" IS NOT NULL AND \"CompletedForLocalDate\" IS NULL)");
                    table.CheckConstraint("CK_Tasks_Version", "\"Version\" > 0");
                    table.ForeignKey(
                        name: "FK_Tasks_Goals_GoalId_UserId",
                        columns: x => new { x.GoalId, x.UserId },
                        principalTable: "Goals",
                        principalColumns: new[] { "Id", "UserId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Tasks_Projects_ProjectId_UserId",
                        columns: x => new { x.ProjectId, x.UserId },
                        principalTable: "Projects",
                        principalColumns: new[] { "Id", "UserId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Tasks_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_GoalId_UserId",
                table: "Tasks",
                columns: new[] { "GoalId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ProjectId_UserId",
                table: "Tasks",
                columns: new[] { "ProjectId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_UserId_CreatedAt_Id",
                table: "Tasks",
                columns: new[] { "UserId", "CreatedAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_UserId_GoalId_Status",
                table: "Tasks",
                columns: new[] { "UserId", "GoalId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_UserId_ProjectId_Status",
                table: "Tasks",
                columns: new[] { "UserId", "ProjectId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_UserId_SequenceId_SequenceOrder",
                table: "Tasks",
                columns: new[] { "UserId", "SequenceId", "SequenceOrder" },
                unique: true,
                filter: "\"SequenceId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_UserId_Status_PlannedDate",
                table: "Tasks",
                columns: new[] { "UserId", "Status", "PlannedDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Tasks");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Projects_Id_UserId",
                table: "Projects");
        }
    }
}
