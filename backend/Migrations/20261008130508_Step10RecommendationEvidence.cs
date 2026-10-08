using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step10RecommendationEvidence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_ReconcileRecommendations_Disposition",
                table: "ReconcileRecommendations");

            migrationBuilder.AlterColumn<string>(
                name: "Disposition",
                table: "ReconcileRecommendations",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(16)",
                oldMaxLength: 16);

            migrationBuilder.AddColumn<string>(
                name: "EvidenceJson",
                table: "ReconcileRecommendations",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<Guid>(
                name: "ResultingCommandResultId",
                table: "ReconcileRecommendations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileRecommendations_ResultingCommandResultId",
                table: "ReconcileRecommendations",
                column: "ResultingCommandResultId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReconcileRecommendations_Disposition",
                table: "ReconcileRecommendations",
                sql: "\"Disposition\" IN ('PENDING', 'ACCEPTED', 'ACCEPTED_EDITED', 'REJECTED', 'CANCELLED', 'EXPIRED_WITHOUT_DECISION')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReconcileRecommendations_EvidenceArray",
                table: "ReconcileRecommendations",
                sql: "jsonb_typeof(\"EvidenceJson\") = 'array'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The earlier schema has no outcome for a recommendation nobody answered: it was simply still pending.
            migrationBuilder.Sql("UPDATE \"ReconcileRecommendations\" SET \"Disposition\" = 'PENDING', \"DisposedAt\" = NULL WHERE \"Disposition\" IN ('CANCELLED', 'EXPIRED_WITHOUT_DECISION');");

            migrationBuilder.DropIndex(
                name: "IX_ReconcileRecommendations_ResultingCommandResultId",
                table: "ReconcileRecommendations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ReconcileRecommendations_Disposition",
                table: "ReconcileRecommendations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ReconcileRecommendations_EvidenceArray",
                table: "ReconcileRecommendations");

            migrationBuilder.DropColumn(
                name: "EvidenceJson",
                table: "ReconcileRecommendations");

            migrationBuilder.DropColumn(
                name: "ResultingCommandResultId",
                table: "ReconcileRecommendations");

            migrationBuilder.AlterColumn<string>(
                name: "Disposition",
                table: "ReconcileRecommendations",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32);

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReconcileRecommendations_Disposition",
                table: "ReconcileRecommendations",
                sql: "\"Disposition\" IN ('PENDING', 'ACCEPTED', 'ACCEPTED_EDITED', 'REJECTED')");
        }
    }
}
