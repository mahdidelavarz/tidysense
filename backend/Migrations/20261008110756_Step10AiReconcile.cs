using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step10AiReconcile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReconcileExplanationId",
                table: "AiInvocations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReconcileRecommendationId",
                table: "ActionConfirmations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ReconcileExplanations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ExplainerKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ContextBuilderVersion = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ContextFingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ContextManifestJson = table.Column<string>(type: "jsonb", nullable: false),
                    Summary = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: true),
                    FailureCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReconcileExplanations", x => x.Id);
                    table.CheckConstraint("CK_ReconcileExplanations_ManifestObject", "jsonb_typeof(\"ContextManifestJson\") = 'object'");
                    table.CheckConstraint("CK_ReconcileExplanations_Outcome", "(\"Status\" = 'RUNNING') = (\"CompletedAt\" IS NULL) AND (\"Status\" = 'READY') = (\"Summary\" IS NOT NULL) AND (\"Status\" = 'FAILED') = (\"FailureCode\" IS NOT NULL)");
                    table.CheckConstraint("CK_ReconcileExplanations_Status", "\"Status\" IN ('RUNNING', 'READY', 'FAILED', 'CANCELLED')");
                    table.ForeignKey(
                        name: "FK_ReconcileExplanations_ReconcileSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ReconcileSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReconcileExplanations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReconcileRecommendations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExplanationId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Ordinal = table.Column<int>(type: "integer", nullable: false),
                    RuleId = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    RuleVersion = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ActionType = table.Column<string>(type: "character varying(48)", maxLength: 48, nullable: false),
                    SequenceId = table.Column<Guid>(type: "uuid", nullable: true),
                    TaskIds = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    EvidenceFingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Explanation = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Disposition = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    DisposedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReconcileRecommendations", x => x.Id);
                    table.CheckConstraint("CK_ReconcileRecommendations_Disposed", "(\"Disposition\" = 'PENDING') = (\"DisposedAt\" IS NULL)");
                    table.CheckConstraint("CK_ReconcileRecommendations_Disposition", "\"Disposition\" IN ('PENDING', 'ACCEPTED', 'ACCEPTED_EDITED', 'REJECTED')");
                    table.CheckConstraint("CK_ReconcileRecommendations_Target", "cardinality(\"TaskIds\") > 0 AND \"Ordinal\" > 0");
                    table.ForeignKey(
                        name: "FK_ReconcileRecommendations_ReconcileExplanations_ExplanationId",
                        column: x => x.ExplanationId,
                        principalTable: "ReconcileExplanations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReconcileRecommendations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiInvocations_ReconcileExplanationId",
                table: "AiInvocations",
                column: "ReconcileExplanationId");

            migrationBuilder.CreateIndex(
                name: "IX_ActionConfirmations_ReconcileRecommendationId",
                table: "ActionConfirmations",
                column: "ReconcileRecommendationId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ActionConfirmations_Recommendation",
                table: "ActionConfirmations",
                sql: "\"ReconcileRecommendationId\" IS NULL OR \"ReconcileSessionId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileExplanations_OneRunningPerSession",
                table: "ReconcileExplanations",
                column: "SessionId",
                unique: true,
                filter: "\"Status\" = 'RUNNING'");

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileExplanations_SessionId_CreatedAt",
                table: "ReconcileExplanations",
                columns: new[] { "SessionId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileExplanations_UserId_CreatedAt",
                table: "ReconcileExplanations",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileRecommendations_ExplanationId_Ordinal",
                table: "ReconcileRecommendations",
                columns: new[] { "ExplanationId", "Ordinal" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileRecommendations_UserId",
                table: "ReconcileRecommendations",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ActionConfirmations_ReconcileRecommendations_ReconcileRecom~",
                table: "ActionConfirmations",
                column: "ReconcileRecommendationId",
                principalTable: "ReconcileRecommendations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_AiInvocations_ReconcileExplanations_ReconcileExplanationId",
                table: "AiInvocations",
                column: "ReconcileExplanationId",
                principalTable: "ReconcileExplanations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ActionConfirmations_ReconcileRecommendations_ReconcileRecom~",
                table: "ActionConfirmations");

            migrationBuilder.DropForeignKey(
                name: "FK_AiInvocations_ReconcileExplanations_ReconcileExplanationId",
                table: "AiInvocations");

            migrationBuilder.DropTable(
                name: "ReconcileRecommendations");

            migrationBuilder.DropTable(
                name: "ReconcileExplanations");

            migrationBuilder.DropIndex(
                name: "IX_AiInvocations_ReconcileExplanationId",
                table: "AiInvocations");

            migrationBuilder.DropIndex(
                name: "IX_ActionConfirmations_ReconcileRecommendationId",
                table: "ActionConfirmations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ActionConfirmations_Recommendation",
                table: "ActionConfirmations");

            migrationBuilder.DropColumn(
                name: "ReconcileExplanationId",
                table: "AiInvocations");

            migrationBuilder.DropColumn(
                name: "ReconcileRecommendationId",
                table: "ActionConfirmations");
        }
    }
}
