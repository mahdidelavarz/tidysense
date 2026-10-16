using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step24PlanningWindows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ContinuationOfWindowId",
                table: "PlanningAttempts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PlanningWindows",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GoalId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Week = table.Column<int>(type: "integer", nullable: false),
                    PreviousWindowId = table.Column<Guid>(type: "uuid", nullable: true),
                    SourceDraftId = table.Column<Guid>(type: "uuid", nullable: false),
                    Decision = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    DecidedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanningWindows", x => x.Id);
                    table.CheckConstraint("CK_PlanningWindows_Dates", "\"EndDate\" >= \"StartDate\" AND \"EndDate\" - \"StartDate\" <= 6");
                    table.CheckConstraint("CK_PlanningWindows_Decided", "(\"Decision\" IS NULL) = (\"DecidedAt\" IS NULL)");
                    table.CheckConstraint("CK_PlanningWindows_Decision", "\"Decision\" IS NULL OR \"Decision\" IN ('CONTINUE_AS_IS', 'ADJUST', 'PAUSE_OR_STOP', 'REPLANNED')");
                    table.CheckConstraint("CK_PlanningWindows_OneScope", "(\"GoalId\" IS NOT NULL) <> (\"ProjectId\" IS NOT NULL)");
                    table.CheckConstraint("CK_PlanningWindows_Version", "\"Version\" > 0");
                    table.CheckConstraint("CK_PlanningWindows_Week", "\"Week\" >= 1");
                    table.ForeignKey(
                        name: "FK_PlanningWindows_Goals_GoalId_UserId",
                        columns: x => new { x.GoalId, x.UserId },
                        principalTable: "Goals",
                        principalColumns: new[] { "Id", "UserId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlanningWindows_PlanningWindows_PreviousWindowId",
                        column: x => x.PreviousWindowId,
                        principalTable: "PlanningWindows",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PlanningWindows_Projects_ProjectId_UserId",
                        columns: x => new { x.ProjectId, x.UserId },
                        principalTable: "Projects",
                        principalColumns: new[] { "Id", "UserId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlanningWindows_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlanningWindows_GoalId_UserId",
                table: "PlanningWindows",
                columns: new[] { "GoalId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanningWindows_PreviousWindowId",
                table: "PlanningWindows",
                column: "PreviousWindowId",
                unique: true,
                filter: "\"PreviousWindowId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PlanningWindows_ProjectId_UserId",
                table: "PlanningWindows",
                columns: new[] { "ProjectId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanningWindows_UserId_Decision_EndDate",
                table: "PlanningWindows",
                columns: new[] { "UserId", "Decision", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanningWindows_UserId_GoalId",
                table: "PlanningWindows",
                columns: new[] { "UserId", "GoalId" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanningWindows_UserId_ProjectId",
                table: "PlanningWindows",
                columns: new[] { "UserId", "ProjectId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlanningWindows");

            migrationBuilder.DropColumn(
                name: "ContinuationOfWindowId",
                table: "PlanningAttempts");
        }
    }
}
