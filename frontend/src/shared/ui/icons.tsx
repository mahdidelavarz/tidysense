import type { ComponentType, SVGProps } from 'react'
import SolarAddLinear from '~icons/solar/add-linear'
import SolarAltArrowDownLinear from '~icons/solar/alt-arrow-down-linear'
import SolarAltArrowLeftLinear from '~icons/solar/alt-arrow-left-linear'
import SolarAltArrowRightLinear from '~icons/solar/alt-arrow-right-linear'
import SolarArrowLeftLinear from '~icons/solar/arrow-left-linear'
import SolarArrowRightLinear from '~icons/solar/arrow-right-linear'
import SolarCalendarLinear from '~icons/solar/calendar-linear'
import SolarCalendarMarkLinear from '~icons/solar/calendar-mark-linear'
import SolarCheckCircleLinear from '~icons/solar/check-circle-linear'
import SolarCheckLinear from '~icons/solar/check-linear'
import SolarChecklistMinimalisticLinear from '~icons/solar/checklist-minimalistic-linear'
import SolarClipboardClockLinear from '~icons/solar/clipboard-clock-linear'
import SolarClockCircleLinear from '~icons/solar/clock-circle-linear'
import SolarCloseLinear from '~icons/solar/close-linear'
import SolarCloudLinear from '~icons/solar/cloud-linear'
import SolarCompassLinear from '~icons/solar/compass-linear'
import SolarDangerCircleLinear from '~icons/solar/danger-circle-linear'
import SolarDatabaseLinear from '~icons/solar/database-linear'
import SolarEyeLinear from '~icons/solar/eye-linear'
import SolarFilterLinear from '~icons/solar/filter-linear'
import SolarFlagLinear from '~icons/solar/flag-linear'
import SolarForbiddenCircleLinear from '~icons/solar/forbidden-circle-linear'
import SolarHistoryLinear from '~icons/solar/history-linear'
import SolarHourglassLinear from '~icons/solar/hourglass-linear'
import SolarLayersMinimalisticLinear from '~icons/solar/layers-minimalistic-linear'
import SolarLeafLinear from '~icons/solar/leaf-linear'
import SolarLinkLinear from '~icons/solar/link-linear'
import SolarListArrowDownMinimalisticLinear from '~icons/solar/list-arrow-down-minimalistic-linear'
import SolarLockKeyholeMinimalisticLinear from '~icons/solar/lock-keyhole-minimalistic-linear'
import SolarLogout2Linear from '~icons/solar/logout-2-linear'
import SolarMagicStick3Linear from '~icons/solar/magic-stick-3-linear'
import SolarMagniferLinear from '~icons/solar/magnifer-linear'
import SolarMenuDotsLinear from '~icons/solar/menu-dots-linear'
import SolarMoonLinear from '~icons/solar/moon-linear'
import SolarNotesLinear from '~icons/solar/notes-linear'
import SolarPauseLinear from '~icons/solar/pause-linear'
import SolarPenLinear from '~icons/solar/pen-linear'
import SolarPlanetLinear from '~icons/solar/planet-linear'
import SolarPlayLinear from '~icons/solar/play-linear'
import SolarPulseLinear from '~icons/solar/pulse-linear'
import SolarRecordCircleLinear from '~icons/solar/record-circle-linear'
import SolarRefreshLinear from '~icons/solar/refresh-linear'
import SolarRestartLinear from '~icons/solar/restart-linear'
import SolarShieldCheckLinear from '~icons/solar/shield-check-linear'
import SolarStopCircleLinear from '~icons/solar/stop-circle-linear'
import SolarStopLinear from '~icons/solar/stop-linear'
import SolarSun2Linear from '~icons/solar/sun-2-linear'
import SolarSunriseLinear from '~icons/solar/sunrise-linear'
import SolarTargetLinear from '~icons/solar/target-linear'
import SolarTranslationLinear from '~icons/solar/translation-linear'
import SolarTrashBinMinimalisticLinear from '~icons/solar/trash-bin-minimalistic-linear'
import SolarTuning2Linear from '~icons/solar/tuning-2-linear'
import SolarUndoLeftLinear from '~icons/solar/undo-left-linear'
import SolarUserRoundedLinear from '~icons/solar/user-rounded-linear'
import SolarWiFiOffLinear from '~icons/solar/wi-fi-off-linear'

/**
 * The application's icons: Solar (linear) by 480 Design, CC BY 4.0, compiled
 * into the bundle at build time by unplugin-icons, so no icon is ever fetched
 * from a third-party host. Feature code imports from here, never from
 * `~icons/*` directly; the meaning of each icon is listed in
 * devmap/frontend/design-system.md.
 */
export type IconProps = SVGProps<SVGSVGElement> & { size?: number | string }
export type AppIcon = ComponentType<IconProps>

function sized(Svg: ComponentType<SVGProps<SVGSVGElement>>): AppIcon {
  return function Icon({ size = 24, ...props }: IconProps) {
    const labelled = props['aria-label'] !== undefined || props['aria-labelledby'] !== undefined
    return <Svg width={size} height={size} focusable="false" aria-hidden={labelled ? undefined : true} {...props} />
  }
}

// Entities and destinations
export const Today = sized(SolarSunriseLinear)
export const Sun = sized(SolarSun2Linear)
export const Moon = sized(SolarMoonLinear)
export const ListChecks = sized(SolarChecklistMinimalisticLinear)
export const FolderKanban = sized(SolarLayersMinimalisticLinear)
export const Target = sized(SolarTargetLinear)
export const Repeat = sized(SolarPlanetLinear)
export const Compass = sized(SolarCompassLinear)
export const RefreshCcw = sized(SolarRestartLinear)
export const Activity = sized(SolarPulseLinear)

// Actions
export const Plus = sized(SolarAddLinear)
export const Pencil = sized(SolarPenLinear)
export const Trash2 = sized(SolarTrashBinMinimalisticLinear)
export const Leaf = sized(SolarLeafLinear)
export const Cloud = sized(SolarCloudLinear)
export const RotateCcw = sized(SolarUndoLeftLinear)
export const RefreshCw = sized(SolarRefreshLinear)
export const Play = sized(SolarPlayLinear)
export const Pause = sized(SolarPauseLinear)
export const Search = sized(SolarMagniferLinear)
export const Filter = sized(SolarFilterLinear)
export const X = sized(SolarCloseLinear)
export const Ellipsis = sized(SolarMenuDotsLinear)
export const LogOut = sized(SolarLogout2Linear)
export const Sparkles = sized(SolarMagicStick3Linear)

// Status
export const Check = sized(SolarCheckLinear)
export const CircleCheck = sized(SolarCheckCircleLinear)
export const CircleCheckBig = sized(SolarCheckCircleLinear)
export const CircleSlash = sized(SolarForbiddenCircleLinear)
export const CircleStop = sized(SolarStopCircleLinear)
export const CircleDashed = sized(SolarRecordCircleLinear)
export const CircleAlert = sized(SolarDangerCircleLinear)
export const Square = sized(SolarStopLinear)
export const Lock = sized(SolarLockKeyholeMinimalisticLinear)
export const ShieldCheck = sized(SolarShieldCheckLinear)
export const Hourglass = sized(SolarHourglassLinear)
export const WifiOff = sized(SolarWiFiOffLinear)

// Dates and facts
export const CalendarDays = sized(SolarCalendarLinear)
export const CalendarClock = sized(SolarCalendarMarkLinear)
export const CalendarOff = sized(SolarCloudLinear)
export const Clock = sized(SolarClockCircleLinear)
export const FileClock = sized(SolarClipboardClockLinear)
export const History = sized(SolarHistoryLinear)
export const Flag = sized(SolarFlagLinear)
export const StickyNote = sized(SolarNotesLinear)
export const Link2 = sized(SolarLinkLinear)
export const Eye = sized(SolarEyeLinear)
export const ListOrdered = sized(SolarListArrowDownMinimalisticLinear)
export const Languages = sized(SolarTranslationLinear)
export const Database = sized(SolarDatabaseLinear)
export const SlidersHorizontal = sized(SolarTuning2Linear)
export const UserRound = sized(SolarUserRoundedLinear)

// Direction (RTL: back points right, forward points left)
export const ChevronLeft = sized(SolarAltArrowLeftLinear)
export const ChevronRight = sized(SolarAltArrowRightLinear)
export const ChevronDown = sized(SolarAltArrowDownLinear)
export const ArrowLeft = sized(SolarArrowLeftLinear)
export const ArrowRight = sized(SolarArrowRightLinear)

/** Solar has no spinner; this arc turns with `animate-spin`. */
export function LoaderCircle({ size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" focusable="false" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  )
}
