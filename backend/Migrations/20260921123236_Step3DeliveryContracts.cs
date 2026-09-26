using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TidySense.Migrations
{
    /// <inheritdoc />
    public partial class Step3DeliveryContracts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DomainEvents",
                columns: table => new
                {
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    EventVersion = table.Column<int>(type: "integer", nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Actor = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    AggregateType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AggregateId = table.Column<Guid>(type: "uuid", nullable: false),
                    AggregateVersion = table.Column<long>(type: "bigint", nullable: false),
                    TransactionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CausationId = table.Column<Guid>(type: "uuid", nullable: true),
                    CommandId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProposalId = table.Column<Guid>(type: "uuid", nullable: true),
                    ConfirmationId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReconcileSessionId = table.Column<Guid>(type: "uuid", nullable: true),
                    RuleId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    RuleVersion = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PayloadJson = table.Column<string>(type: "jsonb", nullable: false),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DomainEvents", x => x.EventId);
                    table.CheckConstraint("CK_DomainEvents_Actor", "\"Actor\" IN ('USER', 'SYSTEM_DETERMINISTIC')");
                    table.CheckConstraint("CK_DomainEvents_AggregateVersion", "\"AggregateVersion\" > 0");
                    table.CheckConstraint("CK_DomainEvents_EventVersion", "\"EventVersion\" > 0");
                });

            migrationBuilder.CreateTable(
                name: "IdempotencyRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IdempotencyKey = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CommandType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RequestHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    ResultId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IdempotencyRecords", x => x.Id);
                    table.CheckConstraint("CK_IdempotencyRecords_Status", "\"Status\" IN ('IN_PROGRESS', 'SUCCEEDED', 'CONFLICTED', 'FAILED_FINAL', 'FAILED_RETRYABLE')");
                    table.ForeignKey(
                        name: "FK_IdempotencyRecords_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OutboxMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    AttemptCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NextAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeliveredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMessages", x => x.Id);
                    table.CheckConstraint("CK_OutboxMessages_AttemptCount", "\"AttemptCount\" >= 0");
                    table.ForeignKey(
                        name: "FK_OutboxMessages_DomainEvents_EventId",
                        column: x => x.EventId,
                        principalTable: "DomainEvents",
                        principalColumn: "EventId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CommandResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IdempotencyRecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    CommandType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    AggregateType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AggregateId = table.Column<Guid>(type: "uuid", nullable: true),
                    AggregateVersion = table.Column<long>(type: "bigint", nullable: true),
                    ExpectedVersion = table.Column<long>(type: "bigint", nullable: true),
                    ErrorCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RetentionClass = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommandResults", x => x.Id);
                    table.CheckConstraint("CK_CommandResults_Status", "\"Status\" IN ('SUCCEEDED', 'CONFLICTED', 'FAILED_FINAL', 'FAILED_RETRYABLE')");
                    table.ForeignKey(
                        name: "FK_CommandResults_IdempotencyRecords_IdempotencyRecordId",
                        column: x => x.IdempotencyRecordId,
                        principalTable: "IdempotencyRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommandResults_IdempotencyRecordId",
                table: "CommandResults",
                column: "IdempotencyRecordId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CommandResults_UserId_CreatedAt",
                table: "CommandResults",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_DomainEvents_AggregateType_AggregateId_OccurredAt",
                table: "DomainEvents",
                columns: new[] { "AggregateType", "AggregateId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_DomainEvents_CommandId",
                table: "DomainEvents",
                column: "CommandId");

            migrationBuilder.CreateIndex(
                name: "IX_DomainEvents_CorrelationId",
                table: "DomainEvents",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_DomainEvents_TransactionId",
                table: "DomainEvents",
                column: "TransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_DomainEvents_UserId_OccurredAt",
                table: "DomainEvents",
                columns: new[] { "UserId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_IdempotencyRecords_Status_ExpiresAt",
                table: "IdempotencyRecords",
                columns: new[] { "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_IdempotencyRecords_UserId_IdempotencyKey",
                table: "IdempotencyRecords",
                columns: new[] { "UserId", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_EventId",
                table: "OutboxMessages",
                column: "EventId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_Status_NextAttemptAt",
                table: "OutboxMessages",
                columns: new[] { "Status", "NextAttemptAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CommandResults");

            migrationBuilder.DropTable(
                name: "OutboxMessages");

            migrationBuilder.DropTable(
                name: "IdempotencyRecords");

            migrationBuilder.DropTable(
                name: "DomainEvents");
        }
    }
}
