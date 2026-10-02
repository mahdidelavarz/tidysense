using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step7CaptureReconcile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsProtected",
                table: "Tasks",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ProtectionReasonCode",
                table: "Tasks",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Captures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Source = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Captures", x => x.Id);
                    table.CheckConstraint("CK_Captures_Resolution", "(\"Status\" = 'UNRESOLVED' AND \"ResolvedAt\" IS NULL) OR (\"Status\" IN ('RESOLVED', 'DISCARDED') AND \"ResolvedAt\" IS NOT NULL)");
                    table.CheckConstraint("CK_Captures_Source", "\"Source\" IN ('MANUAL', 'SYSTEM_MIGRATED')");
                    table.CheckConstraint("CK_Captures_Status", "\"Status\" IN ('UNRESOLVED', 'RESOLVED', 'DISCARDED')");
                    table.CheckConstraint("CK_Captures_Version", "\"Version\" > 0");
                    table.ForeignKey(
                        name: "FK_Captures_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReconcilePrompts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    State = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReconcilePrompts", x => x.Id);
                    table.CheckConstraint("CK_ReconcilePrompts_State", "\"State\" IN ('DISMISSED', 'SKIPPED')");
                    table.CheckConstraint("CK_ReconcilePrompts_Version", "\"Version\" > 0");
                    table.ForeignKey(
                        name: "FK_ReconcilePrompts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReconcileSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    TriggerType = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    RulesCatalogVersion = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Timezone = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    FactSnapshotVersion = table.Column<int>(type: "integer", nullable: false),
                    DegradedMode = table.Column<bool>(type: "boolean", nullable: false),
                    Severity = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ActionableBacklogCount = table.Column<int>(type: "integer", nullable: false),
                    OldestUnresolvedAgeDays = table.Column<int>(type: "integer", nullable: true),
                    ReviewDueCount = table.Column<int>(type: "integer", nullable: false),
                    UnresolvedCaptureCount = table.Column<int>(type: "integer", nullable: false),
                    OpenedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Version = table.Column<long>(type: "bigint", nullable: false),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReconcileSessions", x => x.Id);
                    table.CheckConstraint("CK_ReconcileSessions_Completion", "(\"Status\" = 'OPEN' AND \"CompletedAt\" IS NULL) OR (\"Status\" <> 'OPEN' AND \"CompletedAt\" IS NOT NULL)");
                    table.CheckConstraint("CK_ReconcileSessions_Counts", "\"ActionableBacklogCount\" >= 0 AND \"ReviewDueCount\" >= 0 AND \"UnresolvedCaptureCount\" >= 0");
                    table.CheckConstraint("CK_ReconcileSessions_Severity", "\"Severity\" IN ('NONE', 'LIGHT', 'MEDIUM', 'RECOVERY')");
                    table.CheckConstraint("CK_ReconcileSessions_Status", "\"Status\" IN ('OPEN', 'COMPLETED', 'ABANDONED', 'EXPIRED')");
                    table.CheckConstraint("CK_ReconcileSessions_TriggerType", "\"TriggerType\" IN ('MANUAL', 'PROMPT')");
                    table.CheckConstraint("CK_ReconcileSessions_Version", "\"Version\" > 0");
                    table.ForeignKey(
                        name: "FK_ReconcileSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ActionConfirmations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReconcileSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActionType = table.Column<string>(type: "character varying(48)", maxLength: 48, nullable: false),
                    RequestJson = table.Column<string>(type: "jsonb", nullable: false),
                    PreviewJson = table.Column<string>(type: "jsonb", nullable: false),
                    PreviewHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActionConfirmations", x => x.Id);
                    table.CheckConstraint("CK_ActionConfirmations_Expiry", "\"ExpiresAt\" > \"CreatedAt\"");
                    table.CheckConstraint("CK_ActionConfirmations_Status", "\"Status\" IN ('CREATED', 'SUBMITTED', 'RESOLVED', 'EXPIRED', 'CANCELLED')");
                    table.ForeignKey(
                        name: "FK_ActionConfirmations_ReconcileSessions_ReconcileSessionId",
                        column: x => x.ReconcileSessionId,
                        principalTable: "ReconcileSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ActionConfirmations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReconcileFacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    FactType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: false),
                    ObservedMetrics = table.Column<string>(type: "jsonb", nullable: false),
                    ReasonCodes = table.Column<string[]>(type: "text[]", nullable: false),
                    EvidenceQuality = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    FactVersion = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReconcileFacts", x => x.Id);
                    table.CheckConstraint("CK_ReconcileFacts_MetricsObject", "jsonb_typeof(\"ObservedMetrics\") = 'object'");
                    table.ForeignKey(
                        name: "FK_ReconcileFacts_ReconcileSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ReconcileSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RuleMatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    RuleId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RuleVersion = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AffectedEntityIds = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    MatchedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    AllowedActionTypes = table.Column<string[]>(type: "text[]", nullable: false),
                    ConsequenceCodes = table.Column<string[]>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RuleMatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RuleMatches_ReconcileSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ReconcileSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Tasks_Protection",
                table: "Tasks",
                sql: "(\"IsProtected\" AND \"ProtectionReasonCode\" = 'USER') OR (NOT \"IsProtected\" AND \"ProtectionReasonCode\" IS NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_ActionConfirmations_ReconcileSessionId",
                table: "ActionConfirmations",
                column: "ReconcileSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_ActionConfirmations_Status_ExpiresAt",
                table: "ActionConfirmations",
                columns: new[] { "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ActionConfirmations_UserId_CreatedAt",
                table: "ActionConfirmations",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Captures_UserId_Status_CreatedAt_Id",
                table: "Captures",
                columns: new[] { "UserId", "Status", "CreatedAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileFacts_SessionId",
                table: "ReconcileFacts",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_ReconcilePrompts_UserId_LocalDate",
                table: "ReconcilePrompts",
                columns: new[] { "UserId", "LocalDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileSessions_OneOpenPerUser",
                table: "ReconcileSessions",
                column: "UserId",
                unique: true,
                filter: "\"Status\" = 'OPEN'");

            migrationBuilder.CreateIndex(
                name: "IX_ReconcileSessions_UserId_OpenedAt",
                table: "ReconcileSessions",
                columns: new[] { "UserId", "OpenedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_RuleMatches_SessionId",
                table: "RuleMatches",
                column: "SessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActionConfirmations");

            migrationBuilder.DropTable(
                name: "Captures");

            migrationBuilder.DropTable(
                name: "ReconcileFacts");

            migrationBuilder.DropTable(
                name: "ReconcilePrompts");

            migrationBuilder.DropTable(
                name: "RuleMatches");

            migrationBuilder.DropTable(
                name: "ReconcileSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Tasks_Protection",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "IsProtected",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "ProtectionReasonCode",
                table: "Tasks");
        }
    }
}
