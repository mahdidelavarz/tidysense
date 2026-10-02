using TidySense.DTOs.Routines;
using TidySense.DTOs.Tasks;

namespace TidySense.DTOs.Today;

public sealed record TodayDto(
    DateOnly LocalDate,
    IReadOnlyList<TaskDto> Tasks,
    IReadOnlyList<RoutineOccurrenceDto> RoutineOccurrences);
