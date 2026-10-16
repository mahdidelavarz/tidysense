using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TidySense.Common.Events;
using TidySense.Data;
using TidySense.DTOs.Feedback;
using TidySense.DTOs.Planning;
using TidySense.Models;
using TidySense.Services;

namespace TidySense.Backend.Tests;

/// <summary>
/// The satisfaction prompt after an AI response (Discussion 027 §4, §8, resolved 2026-10-14) and
/// the derived fields product insights read (§5): what was removed before accepting, and where
/// created work came from.
/// </summary>
public sealed class AiResponseFeedbackTests(PostgresWebApplicationFactory factory)
    : IClassFixture<PostgresWebApplicationFactory>
{
    private const string Intention = "می‌خواهم ورزش منظم را شروع کنم";
    private static readonly DateOnly Day = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(5);

    [Fact]
    public async Task An_ended_unapplied_draft_is_asked_once_a_day_and_an_applied_draft_only_gets_its_pilot_question()
    {
        PinLocal(Day);
        var owner = await CreateSessionAsync();
        var other = await CreateSessionAsync();
        using var client = Client(owner.Token);
        using var otherClient = Client(other.Token);

        // A draft still under review is not asked about.
        var first = await GenerateAsync(client, "first");
        Assert.Null((await AskAsync(client, first.Id)).PromptId);

        // Cancelled: the account's first ended draft is always asked, and a reload gets the same prompt.
        await CancelAsync(client, first, "cancel-first");
        var prompt = (await AskAsync(client, first.Id)).PromptId;
        Assert.NotNull(prompt);
        Assert.Equal(prompt, (await AskAsync(client, first.Id)).PromptId);
        Assert.Equal(HttpStatusCode.NotFound, (await AskResponseAsync(otherClient, first.Id)).StatusCode);

        // Replaced the same day: at most once per account and local day.
        var second = await GenerateAsync(client, "second");
        await GenerateAsync(client, "third", replaceActive: true);
        Assert.Equal("SUPERSEDED", (await DraftAsync(client, second.Id)).Status);
        Assert.Null((await AskAsync(client, second.Id)).PromptId);

        // Closing is a non-response: the prompt is gone and cannot be answered afterwards.
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, $"/api/v1/feedback/ai-responses/{prompt}/close", new { })).StatusCode);
        Assert.Null((await AskAsync(client, first.Id)).PromptId);
        Assert.Equal("FEEDBACK_ALREADY_GIVEN", await ProblemCodeAsync(await AnswerAsync(client, prompt!.Value, 4, null)));

        // The next day another ended draft is asked; a low rating may carry a reason.
        PinLocal(Day.AddDays(1));
        var fourth = await GenerateAsync(client, "fourth", replaceActive: true);
        await CancelAsync(client, fourth, "cancel-fourth");
        var next = (await AskAsync(client, fourth.Id)).PromptId!.Value;
        Assert.Equal("VALIDATION_FAILED", await ProblemCodeAsync(await AnswerAsync(client, next, 4, "دلیل برای امتیاز خوب")));
        Assert.Equal(HttpStatusCode.BadRequest, (await AnswerAsync(client, next, 6, null)).StatusCode);
        Assert.Equal("FEEDBACK_INSTRUMENT_CHANGED", await ProblemCodeAsync(
            await Post(client, $"/api/v1/feedback/ai-responses/{next}/answer", new { instrumentVersion = 2, rating = 2 })));
        Assert.Equal(HttpStatusCode.NotFound, (await AnswerAsync(otherClient, next, 2, null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await AnswerAsync(client, next, 2, "  کارها خیلی زیاد بودند  ")).StatusCode);
        Assert.Equal("FEEDBACK_ALREADY_GIVEN", await ProblemCodeAsync(await AnswerAsync(client, next, 1, null)));

        // Applied: never asked here; the H1 pilot question covers it, so no plan is asked about twice.
        PinLocal(Day.AddDays(2));
        var applied = await GenerateAsync(client, "applied");
        await ApplyAsync(client, applied, "apply");
        Assert.Null((await AskAsync(client, applied.Id)).PromptId);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, "/api/v1/pilot/feedback", new
        {
            instrument = PilotInstruments.PlanUsefulness, instrumentVersion = PilotInstruments.Version,
            subjectId = applied.Id, answer = 4
        })).StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var rows = await db.AiResponseFeedback.AsNoTracking().Where(x => x.UserId == owner.UserId)
            .OrderBy(x => x.ShownAt).ToListAsync();
        Assert.Equal(2, rows.Count);
        Assert.Equal((AiResponseFeedbackOutcomes.Closed, (int?)null, (string?)null), (rows[0].Outcome, rows[0].Rating, rows[0].Reason));
        Assert.Equal((AiResponseFeedbackOutcomes.Answered, (int?)2, "کارها خیلی زیاد بودند"), (rows[1].Outcome, rows[1].Rating, rows[1].Reason));
        Assert.All(rows, x =>
        {
            Assert.Equal(AiResponseFeedbackSurfaces.PlanningDraft, x.Surface);
            Assert.Equal(AiResponseFeedbackInstrument.Version, x.InstrumentVersion);
            Assert.Equal("R2", x.RetentionClass);
            Assert.NotNull(x.RespondedAt);
        });
        Assert.Equal([Day, Day.AddDays(1)], rows.Select(x => x.ShownOn));
        // Research evidence, not a product decision: nothing about it is written as an event.
        Assert.All(await db.DomainEvents.AsNoTracking().Where(x => x.UserId == owner.UserId)
            .Select(x => x.PayloadJson).ToListAsync(), x => Assert.DoesNotContain("کارها", x));
    }

    [Fact]
    public async Task After_the_pilot_the_first_ended_draft_is_still_asked_and_later_ones_follow_the_rate()
    {
        PinLocal(Day);
        foreach (var (rate, expected) in new[] { ("0", false), ("1", true) })
        {
            using var host = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, configuration) =>
                configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Pilot:AiResponseFeedback:CoverageFirst"] = "false",
                    ["Pilot:AiResponseFeedback:SampleRate"] = rate
                })));
            var session = await CreateSessionAsync();
            using var client = Client(session.Token, host);
            var first = await GenerateAsync(client, $"rate-{rate}-1");
            await CancelAsync(client, first, $"rate-{rate}-cancel-1");
            Assert.NotNull((await AskAsync(client, first.Id)).PromptId);
            // Without the pilot's daily limit a second draft the same day depends only on the rate.
            var second = await GenerateAsync(client, $"rate-{rate}-2");
            await CancelAsync(client, second, $"rate-{rate}-cancel-2");
            Assert.Equal(expected, (await AskAsync(client, second.Id)).PromptId is not null);
        }
    }

    [Fact]
    public async Task Applying_records_what_was_removed_by_type_and_where_the_created_work_came_from()
    {
        PinLocal(Day);
        var session = await CreateSessionAsync();
        using var client = Client(session.Token);
        var generated = await GenerateAsync(client, "provenance");
        var taskIds = generated.Proposals.Where(x => x.Proposal.EntityType == PlanningEntityTypes.Task)
            .Select(x => x.Proposal.DraftId).ToList();
        var removed = taskIds[^1];
        var draft = await ReadAsync<PlanningDraftDto>(await Post(client, $"/api/v1/planning/drafts/{generated.Id}/revisions",
            new RevisePlanningDraftRequest(generated.Revision,
                generated.Proposals.Select(x => x.Proposal.DraftId == removed ? x.Proposal with { Included = false } : x.Proposal).ToArray(),
                generated.Facts.Select(x => x.Fact).ToArray()), "provenance-revise"));
        var result = await ApplyAsync(client, draft, "provenance-apply");
        Assert.Equal(taskIds.Count - 1, result.TaskIds.Count);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var applied = await db.DomainEvents.AsNoTracking().SingleAsync(x =>
            x.AggregateId == draft.Id && x.EventType == PlanningEventTypes.DraftApplied);
        Assert.Equal(3, applied.EventVersion);
        using (var payload = JsonDocument.Parse(applied.PayloadJson))
        {
            Assert.Equal(1, payload.RootElement.GetProperty("excludedTaskCount").GetInt32());
            Assert.Equal(0, payload.RootElement.GetProperty("excludedGoalCount").GetInt32());
            Assert.Equal(0, payload.RootElement.GetProperty("excludedProjectCount").GetInt32());
            Assert.Equal(0, payload.RootElement.GetProperty("excludedRoutineCount").GetInt32());
            Assert.Equal(result.TaskIds.Count, payload.RootElement.GetProperty("taskCount").GetInt32());
            Assert.Equal(0, payload.RootElement.GetProperty("datedTaskCount").GetInt32());
        }

        // Origin is provenance, not a stored flag: every created Task and Routine shares the apply's
        // transaction, and the draft's creation event names the generator that proposed it.
        var created = await db.DomainEvents.AsNoTracking().Where(x => x.TransactionId == applied.TransactionId &&
            (x.EventType == TaskEventTypes.TaskCreated || x.EventType == RoutineEventTypes.RoutineCreated))
            .Select(x => x.AggregateId).ToListAsync();
        Assert.Equal(result.TaskIds.Concat(result.RoutineIds).Order(), created.Order());
        var draftCreated = await db.DomainEvents.AsNoTracking().SingleAsync(x =>
            x.AggregateId == draft.Id && x.EventType == PlanningEventTypes.DraftCreated);
        using var createdPayload = JsonDocument.Parse(draftCreated.PayloadJson);
        Assert.False(string.IsNullOrEmpty(createdPayload.RootElement.GetProperty("generator").GetString()));
        // A manual Task has no such transaction.
        var manual = await ReadAsync<JsonElement>(await Post(client, "/api/v1/tasks", new
        {
            title = "کار دستی", description = (string?)null, goalId = (Guid?)null, projectId = (Guid?)null,
            plannedDate = Day, deadline = (string?)null, sequenceId = (string?)null, sequenceOrder = (int?)null,
            isProtected = false
        }, "provenance-manual"));
        var manualEvent = await db.DomainEvents.AsNoTracking().SingleAsync(x =>
            x.AggregateId == manual.GetProperty("id").GetGuid() && x.EventType == TaskEventTypes.TaskCreated);
        Assert.False(await db.DomainEvents.AnyAsync(x => x.TransactionId == manualEvent.TransactionId &&
            x.EventType == PlanningEventTypes.DraftApplied));
    }

    private async Task<PlanningApplyResultDto> ApplyAsync(HttpClient client, PlanningDraftDto draft, string key)
    {
        var confirmation = await ReadAsync<PlanningConfirmationDto>(await Post(client,
            $"/api/v1/planning/drafts/{draft.Id}/previews", new { expectedRevision = draft.Revision }));
        return await ReadAsync<PlanningApplyResultDto>(await Post(client,
            $"/api/v1/planning/confirmations/{confirmation.Id}/submit", new { }, key));
    }

    private static Task CancelAsync(HttpClient client, PlanningDraftDto draft, string key) =>
        Post(client, $"/api/v1/planning/drafts/{draft.Id}/cancel", new { expectedRevision = draft.Revision }, key)
            .ContinueWith(x => x.Result.EnsureSuccessStatusCode());

    private static Task<HttpResponseMessage> AskResponseAsync(HttpClient client, Guid draftId) =>
        Post(client, "/api/v1/feedback/ai-responses", new { surface = "PLANNING_DRAFT", subjectId = draftId });

    private static async Task<AiResponseFeedbackPromptDto> AskAsync(HttpClient client, Guid draftId)
    {
        var prompt = await ReadAsync<AiResponseFeedbackPromptDto>(await AskResponseAsync(client, draftId));
        Assert.Equal(AiResponseFeedbackInstrument.Version, prompt.InstrumentVersion);
        return prompt;
    }

    private static Task<HttpResponseMessage> AnswerAsync(HttpClient client, Guid promptId, int rating, string? reason) =>
        Post(client, $"/api/v1/feedback/ai-responses/{promptId}/answer",
            new { instrumentVersion = AiResponseFeedbackInstrument.Version, rating, reason });

    private static async Task<PlanningDraftDto> GenerateAsync(HttpClient client, string id, bool replaceActive = false)
    {
        var started = await ReadAsync<PlanningAttemptDto>(await Post(client, "/api/v1/planning/attempts",
            new { clientAttemptId = $"attempt-{id}", intention = Intention, replaceActive }));
        for (var poll = 0; poll < 200; poll++)
        {
            var current = (await client.GetFromJsonAsync<PlanningAttemptDto>($"/api/v1/planning/attempts/{started.Id}"))!;
            if (current.Status is not ("QUEUED" or "RUNNING"))
            {
                Assert.Equal("SUCCEEDED", current.Status);
                return await DraftAsync(client, current.DraftId!.Value);
            }
            await Task.Delay(50);
        }
        throw new TimeoutException("The planning attempt did not finish.");
    }

    private static async Task<PlanningDraftDto> DraftAsync(HttpClient client, Guid id) =>
        (await client.GetFromJsonAsync<PlanningDraftDto>($"/api/v1/planning/drafts/{id}"))!;

    private void PinLocal(DateOnly date) =>
        factory.Clock.Pin(new DateTimeOffset(date.Year, date.Month, date.Day, 10, 0, 0, TimeSpan.FromMinutes(210)));

    private HttpClient Client(string token, WebApplicationFactory<Program>? host = null)
    {
        var client = (host ?? factory).CreateClient(new WebApplicationFactoryClientOptions
            { AllowAutoRedirect = false, BaseAddress = new Uri("http://localhost") });
        client.DefaultRequestHeaders.Add("Cookie", $"TidySense.Auth={token}");
        return client;
    }

    private async Task<Session> CreateSessionAsync()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            Id = Guid.NewGuid(), PhoneNumber = "+989" + Random.Shared.Next(100000000, 1000000000),
            IsActive = true, SetupComplete = true, CreatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return new Session(user.Id, scope.ServiceProvider.GetRequiredService<JwtTokenService>().Create(user));
    }

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    private static async Task<string?> ProblemCodeAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString();

    private static async Task<HttpResponseMessage> Post(HttpClient client, string path, object body,
        string? idempotencyKey = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Origin", "http://localhost");
        if (idempotencyKey is not null) request.Headers.Add("Idempotency-Key", idempotencyKey);
        return await client.SendAsync(request);
    }

    private sealed record Session(Guid UserId, string Token);
}
