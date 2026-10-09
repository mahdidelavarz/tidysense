using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step11ReconcileExposure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReconcileExposures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Severity = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    FirstSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReconcileExposures", x => x.Id);
                    table.CheckConstraint("CK_ReconcileExposures_Severity", "\"Severity\" IN ('NONE', 'LIGHT', 'MEDIUM', 'RECOVERY')");
                    table.ForeignKey(
                        name: "FK_ReconcileExposures_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileExposures_FirstSeenAt",
                table: "ReconcileExposures",
                column: "FirstSeenAt");

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileExposures_UserId_LocalDate",
                table: "ReconcileExposures",
                columns: new[] { "UserId", "LocalDate" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReconcileExposures");
        }
    }
}
