using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step8PlanningFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "ReconcileSessionId",
                table: "ActionConfirmations",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "PlanningDraftId",
                table: "ActionConfirmations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PlanningDraftRevision",
                table: "ActionConfirmations",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PlanningAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientAttemptId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    RequestHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Intention = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ContextGoalId = table.Column<Guid>(type: "uuid", nullable: true),
                    ContextProjectId = table.Column<Guid>(type: "uuid", nullable: true),
                    GeneratorKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ContextBuilderVersion = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ContextFingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ContextManifestJson = table.Column<string>(type: "jsonb", nullable: false),
                    FailureCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    DraftId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanningAttempts", x => x.Id);
                    table.CheckConstraint("CK_PlanningAttempts_Completion", "(\"Status\" IN ('QUEUED', 'RUNNING')) = (\"CompletedAt\" IS NULL)");
                    table.CheckConstraint("CK_PlanningAttempts_ContextExclusive", "NOT (\"ContextGoalId\" IS NOT NULL AND \"ContextProjectId\" IS NOT NULL)");
                    table.CheckConstraint("CK_PlanningAttempts_ManifestObject", "jsonb_typeof(\"ContextManifestJson\") = 'object'");
                    table.CheckConstraint("CK_PlanningAttempts_Outcome", "(\"Status\" = 'SUCCEEDED') = (\"DraftId\" IS NOT NULL) AND (\"Status\" = 'FAILED') = (\"FailureCode\" IS NOT NULL)");
                    table.CheckConstraint("CK_PlanningAttempts_Status", "\"Status\" IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED')");
                    table.ForeignKey(
                        name: "FK_PlanningAttempts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PlanningFacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GoalId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: true),
                    FactType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Strength = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ValueJson = table.Column<string>(type: "jsonb", nullable: false),
                    Source = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    SourcePlanningAttemptId = table.Column<Guid>(type: "uuid", nullable: true),
                    CapturedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastConfirmedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RemovedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Version = table.Column<long>(type: "bigint", nullable: false),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanningFacts", x => x.Id);
                    table.CheckConstraint("CK_PlanningFacts_FactType", "\"FactType\" IN ('UNAVAILABLE_WEEKDAY', 'UNAVAILABLE_DATE', 'UNAVAILABLE_DATE_RANGE', 'AVAILABLE_DEVICE', 'CURRENT_LEVEL', 'LEARNING_FOCUS', 'EXCLUDED_PATH')");
                    table.CheckConstraint("CK_PlanningFacts_Lifecycle", "(\"Status\" = 'REMOVED') = (\"RemovedAt\" IS NOT NULL) AND (\"Status\" = 'EXPIRED') = (\"ExpiredAt\" IS NOT NULL)");
                    table.CheckConstraint("CK_PlanningFacts_OneScope", "(\"GoalId\" IS NOT NULL) <> (\"ProjectId\" IS NOT NULL)");
                    table.CheckConstraint("CK_PlanningFacts_Source", "\"Source\" IN ('USER_EXPLICIT', 'USER_CONFIRMED_AI_EXTRACTION')");
                    table.CheckConstraint("CK_PlanningFacts_Status", "\"Status\" IN ('ACTIVE', 'EXPIRED', 'REMOVED')");
                    table.CheckConstraint("CK_PlanningFacts_Strength", "\"Strength\" IN ('SOFT', 'INFORMATIONAL') OR (\"Strength\" = 'HARD' AND \"FactType\" IN ('UNAVAILABLE_WEEKDAY', 'UNAVAILABLE_DATE', 'UNAVAILABLE_DATE_RANGE'))");
                    table.CheckConstraint("CK_PlanningFacts_ValueObject", "jsonb_typeof(\"ValueJson\") = 'object'");
                    table.CheckConstraint("CK_PlanningFacts_Version", "\"Version\" > 0");
                    table.ForeignKey(
                        name: "FK_PlanningFacts_Goals_GoalId_UserId",
                        columns: x => new { x.GoalId, x.UserId },
                        principalTable: "Goals",
                        principalColumns: new[] { "Id", "UserId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlanningFacts_Projects_ProjectId_UserId",
                        columns: x => new { x.ProjectId, x.UserId },
                        principalTable: "Projects",
                        principalColumns: new[] { "Id", "UserId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlanningFacts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PlanningDrafts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttemptId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CurrentRevision = table.Column<int>(type: "integer", nullable: false),
                    ContextGoalId = table.Column<Guid>(type: "uuid", nullable: true),
                    ContextProjectId = table.Column<Guid>(type: "uuid", nullable: true),
                    SchemaVersion = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ContextFingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    LinkedConfirmationId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanningDrafts", x => x.Id);
                    table.CheckConstraint("CK_PlanningDrafts_ContextExclusive", "NOT (\"ContextGoalId\" IS NOT NULL AND \"ContextProjectId\" IS NOT NULL)");
                    table.CheckConstraint("CK_PlanningDrafts_Expiry", "\"ExpiresAt\" > \"CreatedAt\"");
                    table.CheckConstraint("CK_PlanningDrafts_Revision", "\"CurrentRevision\" > 0");
                    table.CheckConstraint("CK_PlanningDrafts_Status", "\"Status\" IN ('REVIEWABLE', 'SUPERSEDED', 'EXPIRED', 'CANCELLED')");
                    table.CheckConstraint("CK_PlanningDrafts_Version", "\"Version\" > 0");
                    table.ForeignKey(
                        name: "FK_PlanningDrafts_PlanningAttempts_AttemptId",
                        column: x => x.AttemptId,
                        principalTable: "PlanningAttempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlanningDrafts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PlanningDraftRevisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DraftId = table.Column<Guid>(type: "uuid", nullable: false),
                    Revision = table.Column<int>(type: "integer", nullable: false),
                    Origin = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ContentJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanningDraftRevisions", x => x.Id);
                    table.CheckConstraint("CK_PlanningDraftRevisions_ContentObject", "jsonb_typeof(\"ContentJson\") = 'object'");
                    table.CheckConstraint("CK_PlanningDraftRevisions_Origin", "\"Origin\" IN ('GENERATED', 'USER_EDIT')");
                    table.CheckConstraint("CK_PlanningDraftRevisions_Revision", "\"Revision\" > 0");
                    table.ForeignKey(
                        name: "FK_PlanningDraftRevisions_PlanningDrafts_DraftId",
                        column: x => x.DraftId,
                        principalTable: "PlanningDrafts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActionConfirmations_PlanningDraftId",
                table: "ActionConfirmations",
                column: "PlanningDraftId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ActionConfirmations_Subject",
                table: "ActionConfirmations",
                sql: "(\"ReconcileSessionId\" IS NOT NULL AND \"PlanningDraftId\" IS NULL AND \"PlanningDraftRevision\" IS NULL) OR (\"ReconcileSessionId\" IS NULL AND \"PlanningDraftId\" IS NOT NULL AND \"PlanningDraftRevision\" IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_PlanningAttempts_OneInFlightPerUser",
                table: "PlanningAttempts",
                column: "UserId",
                unique: true,
                filter: "\"Status\" IN ('QUEUED', 'RUNNING')");

            migrationBuilder.CreateIndex(
                name: "IX_PlanningAttempts_UserId_ClientAttemptId",
                table: "PlanningAttempts",
                columns: new[] { "UserId", "ClientAttemptId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlanningAttempts_UserId_CreatedAt",
                table: "PlanningAttempts",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanningDraftRevisions_DraftId_Revision",
                table: "PlanningDraftRevisions",
                columns: new[] { "DraftId", "Revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlanningDrafts_AttemptId",
                table: "PlanningDrafts",
                column: "AttemptId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlanningDrafts_OneReviewablePerUser",
                table: "PlanningDrafts",
                column: "UserId",
                unique: true,
                filter: "\"Status\" = 'REVIEWABLE'");

            migrationBuilder.CreateIndex(
                name: "IX_PlanningDrafts_Status_ExpiresAt",
                table: "PlanningDrafts",
                columns: new[] { "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanningFacts_GoalId_UserId",
                table: "PlanningFacts",
                columns: new[] { "GoalId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanningFacts_ProjectId_UserId",
                table: "PlanningFacts",
                columns: new[] { "ProjectId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanningFacts_UserId_GoalId_Status",
                table: "PlanningFacts",
                columns: new[] { "UserId", "GoalId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanningFacts_UserId_ProjectId_Status",
                table: "PlanningFacts",
                columns: new[] { "UserId", "ProjectId", "Status" });

            migrationBuilder.AddForeignKey(
                name: "FK_ActionConfirmations_PlanningDrafts_PlanningDraftId",
                table: "ActionConfirmations",
                column: "PlanningDraftId",
                principalTable: "PlanningDrafts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Planning confirmations have no Reconcile session and cannot exist in the Step 7 schema.
            // Their drafts are dropped below; durable events of applied drafts are kept.
            migrationBuilder.Sql("DELETE FROM \"ActionConfirmations\" WHERE \"ReconcileSessionId\" IS NULL;");

            migrationBuilder.DropForeignKey(
                name: "FK_ActionConfirmations_PlanningDrafts_PlanningDraftId",
                table: "ActionConfirmations");

            migrationBuilder.DropTable(
                name: "PlanningDraftRevisions");

            migrationBuilder.DropTable(
                name: "PlanningFacts");

            migrationBuilder.DropTable(
                name: "PlanningDrafts");

            migrationBuilder.DropTable(
                name: "PlanningAttempts");

            migrationBuilder.DropIndex(
                name: "IX_ActionConfirmations_PlanningDraftId",
                table: "ActionConfirmations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ActionConfirmations_Subject",
                table: "ActionConfirmations");

            migrationBuilder.DropColumn(
                name: "PlanningDraftId",
                table: "ActionConfirmations");

            migrationBuilder.DropColumn(
                name: "PlanningDraftRevision",
                table: "ActionConfirmations");

            migrationBuilder.AlterColumn<Guid>(
                name: "ReconcileSessionId",
                table: "ActionConfirmations",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
