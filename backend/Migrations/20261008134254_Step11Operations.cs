using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step11Operations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OperationsRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    Operator = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ReasonCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Outcome = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    DetailsJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationsRecords", x => x.Id);
                    table.CheckConstraint("CK_OperationsRecords_DetailsObject", "jsonb_typeof(\"DetailsJson\") = 'object'");
                    table.CheckConstraint("CK_OperationsRecords_Kind", "\"Kind\" IN ('MAINTENANCE_RUN', 'USER_ERASURE')");
                    table.CheckConstraint("CK_OperationsRecords_Outcome", "\"Outcome\" IN ('SUCCEEDED', 'FAILED')");
                });

            migrationBuilder.CreateIndex(
                name: "IX_OperationsRecords_Kind_CreatedAt",
                table: "OperationsRecords",
                columns: new[] { "Kind", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OperationsRecords");
        }
    }
}
