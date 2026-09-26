using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class HardenStep3EventContract : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CommandResults_IdempotencyRecords_IdempotencyRecordId",
                table: "CommandResults");

            migrationBuilder.RenameColumn(
                name: "CommandId",
                table: "DomainEvents",
                newName: "CommandResultId");

            migrationBuilder.RenameIndex(
                name: "IX_DomainEvents_CommandId",
                table: "DomainEvents",
                newName: "IX_DomainEvents_CommandResultId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DomainEvents_PayloadObject",
                table: "DomainEvents",
                sql: "jsonb_typeof(\"PayloadJson\") = 'object'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DomainEvents_PayloadSize",
                table: "DomainEvents",
                sql: "octet_length(\"PayloadJson\"::text) <= 4096");

            migrationBuilder.Sql("""
                UPDATE "DomainEvents" de
                SET "CommandResultId" = NULL
                WHERE de."CommandResultId" IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM "CommandResults" cr WHERE cr."Id" = de."CommandResultId")
                """);

            migrationBuilder.AddForeignKey(
                name: "FK_DomainEvents_CommandResults_CommandResultId",
                table: "DomainEvents",
                column: "CommandResultId",
                principalTable: "CommandResults",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DomainEvents_CommandResults_CommandResultId",
                table: "DomainEvents");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DomainEvents_PayloadObject",
                table: "DomainEvents");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DomainEvents_PayloadSize",
                table: "DomainEvents");

            migrationBuilder.RenameColumn(
                name: "CommandResultId",
                table: "DomainEvents",
                newName: "CommandId");

            migrationBuilder.RenameIndex(
                name: "IX_DomainEvents_CommandResultId",
                table: "DomainEvents",
                newName: "IX_DomainEvents_CommandId");

            migrationBuilder.Sql("""
                INSERT INTO "IdempotencyRecords"
                    ("Id", "UserId", "IdempotencyKey", "CommandType", "RequestHash", "Status",
                     "ResultId", "CreatedAt", "CompletedAt", "ExpiresAt", "RetentionClass")
                SELECT cr."IdempotencyRecordId", cr."UserId",
                       'rollback-' || cr."Id"::text, cr."CommandType", repeat('0', 64), cr."Status",
                       cr."Id", cr."CreatedAt", cr."CreatedAt", cr."CreatedAt", 'R4'
                FROM "CommandResults" cr
                WHERE NOT EXISTS (
                    SELECT 1 FROM "IdempotencyRecords" ir WHERE ir."Id" = cr."IdempotencyRecordId")
                """);

            migrationBuilder.AddForeignKey(
                name: "FK_CommandResults_IdempotencyRecords_IdempotencyRecordId",
                table: "CommandResults",
                column: "IdempotencyRecordId",
                principalTable: "IdempotencyRecords",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
