using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step14AiResponseFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AiResponseFeedback",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Surface = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    SubjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstrumentVersion = table.Column<int>(type: "integer", nullable: false),
                    Outcome = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: true),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ShownOn = table.Column<DateOnly>(type: "date", nullable: false),
                    ShownAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RespondedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiResponseFeedback", x => x.Id);
                    table.CheckConstraint("CK_AiResponseFeedback_InstrumentVersion", "\"InstrumentVersion\" > 0");
                    table.CheckConstraint("CK_AiResponseFeedback_Outcome", "\"Outcome\" IN ('SHOWN', 'ANSWERED', 'CLOSED')");
                    table.CheckConstraint("CK_AiResponseFeedback_Rating", "(\"Outcome\" = 'ANSWERED') = (\"Rating\" IS NOT NULL) AND (\"Rating\" IS NULL OR \"Rating\" BETWEEN 1 AND 5)");
                    table.CheckConstraint("CK_AiResponseFeedback_Reason", "\"Reason\" IS NULL OR \"Rating\" <= 2");
                    table.CheckConstraint("CK_AiResponseFeedback_Responded", "(\"Outcome\" = 'SHOWN') = (\"RespondedAt\" IS NULL)");
                    table.CheckConstraint("CK_AiResponseFeedback_Surface", "\"Surface\" IN ('PLANNING_DRAFT')");
                    table.ForeignKey(
                        name: "FK_AiResponseFeedback_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiResponseFeedback_ShownAt",
                table: "AiResponseFeedback",
                column: "ShownAt");

            migrationBuilder.CreateIndex(
                name: "IX_AiResponseFeedback_UserId_Surface_ShownOn",
                table: "AiResponseFeedback",
                columns: new[] { "UserId", "Surface", "ShownOn" });

            migrationBuilder.CreateIndex(
                name: "IX_AiResponseFeedback_UserId_Surface_SubjectId",
                table: "AiResponseFeedback",
                columns: new[] { "UserId", "Surface", "SubjectId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiResponseFeedback");
        }
    }
}
