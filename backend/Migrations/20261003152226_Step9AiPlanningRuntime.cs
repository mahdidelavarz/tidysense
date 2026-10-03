using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step9AiPlanningRuntime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_PlanningAttempts_Outcome",
                table: "PlanningAttempts");

            migrationBuilder.AddColumn<string>(
                name: "AnswersJson",
                table: "PlanningAttempts",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClarificationJson",
                table: "PlanningAttempts",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ClarificationTurn",
                table: "PlanningAttempts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "DraftNow",
                table: "PlanningAttempts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Outcome",
                table: "PlanningAttempts",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PreviousAttemptId",
                table: "PlanningAttempts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AiInvocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanningAttemptId = table.Column<Guid>(type: "uuid", nullable: true),
                    Family = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ConfigurationKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ProviderKey = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Model = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    PromptVersion = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    SchemaVersion = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ContextBuilderVersion = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    RepairPolicyVersion = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Sequence = table.Column<int>(type: "integer", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LatencyMs = table.Column<int>(type: "integer", nullable: false),
                    EstimatedInputTokens = table.Column<int>(type: "integer", nullable: false),
                    MaxOutputTokens = table.Column<int>(type: "integer", nullable: false),
                    InputTokens = table.Column<int>(type: "integer", nullable: true),
                    OutputTokens = table.Column<int>(type: "integer", nullable: true),
                    EstimatedCostMicros = table.Column<long>(type: "bigint", nullable: false),
                    Outcome = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    FailureClass = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    Gate = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    RepairRulesJson = table.Column<string>(type: "jsonb", nullable: false),
                    RetryReason = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    ContextReduction = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiInvocations", x => x.Id);
                    table.CheckConstraint("CK_AiInvocations_Outcome", "\"Outcome\" IN ('SUCCEEDED', 'FAILED', 'REJECTED', 'BLOCKED', 'CANCELLED')");
                    table.CheckConstraint("CK_AiInvocations_RepairRulesArray", "jsonb_typeof(\"RepairRulesJson\") = 'array'");
                    table.CheckConstraint("CK_AiInvocations_Sequence", "\"Sequence\" BETWEEN 0 AND 2");
                    table.ForeignKey(
                        name: "FK_AiInvocations_PlanningAttempts_PlanningAttemptId",
                        column: x => x.PlanningAttemptId,
                        principalTable: "PlanningAttempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_AiInvocations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlanningAttempts_PreviousAttemptId",
                table: "PlanningAttempts",
                column: "PreviousAttemptId",
                unique: true,
                filter: "\"PreviousAttemptId\" IS NOT NULL");

            // Until now every succeeded attempt ended in a draft.
            migrationBuilder.Sql("UPDATE \"PlanningAttempts\" SET \"Outcome\" = 'DRAFT' WHERE \"Status\" = 'SUCCEEDED';");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PlanningAttempts_ClarificationTurn",
                table: "PlanningAttempts",
                sql: "\"ClarificationTurn\" BETWEEN 0 AND 3 AND (\"ClarificationTurn\" > 0) = (\"PreviousAttemptId\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PlanningAttempts_Outcome",
                table: "PlanningAttempts",
                sql: "(\"Status\" = 'SUCCEEDED') = (\"Outcome\" IS NOT NULL) AND (COALESCE(\"Outcome\", '') = 'DRAFT') = (\"DraftId\" IS NOT NULL) AND (COALESCE(\"Outcome\", '') IN ('CLARIFICATION', 'INPUT_BLOCKED')) = (\"ClarificationJson\" IS NOT NULL) AND (\"Status\" = 'FAILED') = (\"FailureCode\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PlanningAttempts_OutcomeValue",
                table: "PlanningAttempts",
                sql: "\"Outcome\" IS NULL OR \"Outcome\" IN ('DRAFT', 'CLARIFICATION', 'INPUT_BLOCKED')");

            migrationBuilder.CreateIndex(
                name: "IX_AiInvocations_Family_StartedAt",
                table: "AiInvocations",
                columns: new[] { "Family", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AiInvocations_PlanningAttemptId",
                table: "AiInvocations",
                column: "PlanningAttemptId");

            migrationBuilder.CreateIndex(
                name: "IX_AiInvocations_UserId",
                table: "AiInvocations",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_PlanningAttempts_PlanningAttempts_PreviousAttemptId",
                table: "PlanningAttempts",
                column: "PreviousAttemptId",
                principalTable: "PlanningAttempts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PlanningAttempts_PlanningAttempts_PreviousAttemptId",
                table: "PlanningAttempts");

            migrationBuilder.DropTable(
                name: "AiInvocations");

            migrationBuilder.DropIndex(
                name: "IX_PlanningAttempts_PreviousAttemptId",
                table: "PlanningAttempts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PlanningAttempts_ClarificationTurn",
                table: "PlanningAttempts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PlanningAttempts_Outcome",
                table: "PlanningAttempts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PlanningAttempts_OutcomeValue",
                table: "PlanningAttempts");

            // The earlier schema knows a succeeded attempt only with a draft; clarification turns cannot be represented.
            migrationBuilder.Sql("DELETE FROM \"PlanningAttempts\" WHERE \"Status\" = 'SUCCEEDED' AND \"DraftId\" IS NULL;");

            migrationBuilder.DropColumn(
                name: "AnswersJson",
                table: "PlanningAttempts");

            migrationBuilder.DropColumn(
                name: "ClarificationJson",
                table: "PlanningAttempts");

            migrationBuilder.DropColumn(
                name: "ClarificationTurn",
                table: "PlanningAttempts");

            migrationBuilder.DropColumn(
                name: "DraftNow",
                table: "PlanningAttempts");

            migrationBuilder.DropColumn(
                name: "Outcome",
                table: "PlanningAttempts");

            migrationBuilder.DropColumn(
                name: "PreviousAttemptId",
                table: "PlanningAttempts");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PlanningAttempts_Outcome",
                table: "PlanningAttempts",
                sql: "(\"Status\" = 'SUCCEEDED') = (\"DraftId\" IS NOT NULL) AND (\"Status\" = 'FAILED') = (\"FailureCode\" IS NOT NULL)");
        }
    }
}
