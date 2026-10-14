using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step19ReconcileQuickActions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReconcileQuickActions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActionType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    PreviousPlannedDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ResultingVersion = table.Column<long>(type: "bigint", nullable: false),
                    AppliedEventId = table.Column<Guid>(type: "uuid", nullable: false),
                    UndoEventId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UndoneAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReconcileQuickActions", x => x.Id);
                    table.CheckConstraint("CK_ReconcileQuickActions_ActionType", "\"ActionType\" IN ('COMPLETE_TASK', 'CARRY_TO_TODAY')");
                    table.CheckConstraint("CK_ReconcileQuickActions_Carry", "(\"ActionType\" = 'CARRY_TO_TODAY') = (\"PreviousPlannedDate\" IS NOT NULL)");
                    table.CheckConstraint("CK_ReconcileQuickActions_Status", "\"Status\" IN ('APPLIED', 'UNDONE')");
                    table.CheckConstraint("CK_ReconcileQuickActions_Undone", "(\"Status\" = 'UNDONE') = (\"UndoneAt\" IS NOT NULL AND \"UndoEventId\" IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_ReconcileQuickActions_ReconcileSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ReconcileSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileQuickActions_SessionId_CreatedAt",
                table: "ReconcileQuickActions",
                columns: new[] { "SessionId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileQuickActions_UserId_TaskId",
                table: "ReconcileQuickActions",
                columns: new[] { "UserId", "TaskId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReconcileQuickActions");
        }
    }
}
