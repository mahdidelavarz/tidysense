using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step4GoalProjectModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Projects_UserId_Id",
                table: "Projects");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "Projects",
                newName: "CompletionMeaning");

            migrationBuilder.AddColumn<Guid>(
                name: "GoalId",
                table: "Projects",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewDateSource",
                table: "Projects",
                type: "character varying(24)",
                maxLength: 24,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Projects",
                type: "character varying(24)",
                maxLength: 24,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Projects",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "TerminalAt",
                table: "Projects",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Projects"
                SET "ReviewDateSource" = 'MIGRATED_DEFAULT',
                    "Source" = 'SYSTEM_MIGRATED',
                    "Status" = 'ACTIVE',
                    "Version" = CASE WHEN "Version" > 0 THEN "Version" ELSE 1 END
                """);

            migrationBuilder.AlterColumn<string>(
                name: "ReviewDateSource",
                table: "Projects",
                type: "character varying(24)",
                maxLength: 24,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(24)",
                oldMaxLength: 24,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Source",
                table: "Projects",
                type: "character varying(24)",
                maxLength: 24,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(24)",
                oldMaxLength: 24,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Projects",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(16)",
                oldMaxLength: 16,
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "Goals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DesiredOutcome = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    TargetDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ReviewDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ReviewDateSource = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    LastContinuationDecisionAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    TerminalAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Source = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Goals", x => x.Id);
                    table.UniqueConstraint("AK_Goals_Id_UserId", x => new { x.Id, x.UserId });
                    table.CheckConstraint("CK_Goals_ReviewDateSource", "\"ReviewDateSource\" IN ('USER', 'SYSTEM_DEFAULT', 'MIGRATED_DEFAULT')");
                    table.CheckConstraint("CK_Goals_Source", "\"Source\" IN ('MANUAL', 'AI_ASSISTED', 'SYSTEM_MIGRATED')");
                    table.CheckConstraint("CK_Goals_Status", "\"Status\" IN ('ACTIVE', 'ACHIEVED', 'ABANDONED')");
                    table.CheckConstraint("CK_Goals_TerminalState", "(\"Status\" = 'ACTIVE' AND \"TerminalAt\" IS NULL) OR (\"Status\" IN ('ACHIEVED', 'ABANDONED') AND \"TerminalAt\" IS NOT NULL)");
                    table.CheckConstraint("CK_Goals_Version", "\"Version\" > 0");
                    table.ForeignKey(
                        name: "FK_Goals_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_GoalId_UserId",
                table: "Projects",
                columns: new[] { "GoalId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_UserId_CreatedAt_Id",
                table: "Projects",
                columns: new[] { "UserId", "CreatedAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_UserId_Status_ReviewDate",
                table: "Projects",
                columns: new[] { "UserId", "Status", "ReviewDate" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Projects_ReviewDateSource",
                table: "Projects",
                sql: "\"ReviewDateSource\" IN ('USER', 'SYSTEM_DEFAULT', 'MIGRATED_DEFAULT')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Projects_Source",
                table: "Projects",
                sql: "\"Source\" IN ('MANUAL', 'AI_ASSISTED', 'SYSTEM_MIGRATED')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Projects_Status",
                table: "Projects",
                sql: "\"Status\" IN ('ACTIVE', 'COMPLETED', 'STOPPED')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Projects_TerminalState",
                table: "Projects",
                sql: "(\"Status\" = 'ACTIVE' AND \"TerminalAt\" IS NULL) OR (\"Status\" IN ('COMPLETED', 'STOPPED') AND \"TerminalAt\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Projects_Version",
                table: "Projects",
                sql: "\"Version\" > 0");

            migrationBuilder.CreateIndex(
                name: "IX_Goals_UserId_CreatedAt_Id",
                table: "Goals",
                columns: new[] { "UserId", "CreatedAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_Goals_UserId_Status_ReviewDate",
                table: "Goals",
                columns: new[] { "UserId", "Status", "ReviewDate" });

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Goals_GoalId_UserId",
                table: "Projects",
                columns: new[] { "GoalId", "UserId" },
                principalTable: "Goals",
                principalColumns: new[] { "Id", "UserId" },
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Goals_GoalId_UserId",
                table: "Projects");

            migrationBuilder.DropTable(
                name: "Goals");

            migrationBuilder.DropIndex(
                name: "IX_Projects_GoalId_UserId",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Projects_UserId_CreatedAt_Id",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Projects_UserId_Status_ReviewDate",
                table: "Projects");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Projects_ReviewDateSource",
                table: "Projects");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Projects_Source",
                table: "Projects");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Projects_Status",
                table: "Projects");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Projects_TerminalState",
                table: "Projects");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Projects_Version",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "GoalId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "ReviewDateSource",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "TerminalAt",
                table: "Projects");

            migrationBuilder.RenameColumn(
                name: "CompletionMeaning",
                table: "Projects",
                newName: "Description");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_UserId_Id",
                table: "Projects",
                columns: new[] { "UserId", "Id" });
        }
    }
}
