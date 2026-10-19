using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class PlanningDraftRedo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Correction",
                table: "PlanningAttempts",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RedoOfDraftId",
                table: "PlanningAttempts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_PlanningAttempts_Redo",
                table: "PlanningAttempts",
                sql: "(\"RedoOfDraftId\" IS NULL OR \"PreviousAttemptId\" IS NULL) AND (\"Correction\" IS NULL OR \"RedoOfDraftId\" IS NOT NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_PlanningAttempts_Redo",
                table: "PlanningAttempts");

            migrationBuilder.DropColumn(
                name: "Correction",
                table: "PlanningAttempts");

            migrationBuilder.DropColumn(
                name: "RedoOfDraftId",
                table: "PlanningAttempts");
        }
    }
}
