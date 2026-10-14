import type { components } from '../../../shared/api/generated'

export type OperationsMetricsDto = components['schemas']['OperationsMetricsDto']
export type MetricResultDto = components['schemas']['MetricResultDto']
export type OperationsAiDto = components['schemas']['OperationsAiDto']
export type OperationsHealthDto = components['schemas']['OperationsHealthDto']
export type OperationsAlertDto = components['schemas']['OperationsAlertDto']
export type OperationsInsightsDto = components['schemas']['OperationsInsightsDto']
export type LowRatingReasonDto = components['schemas']['LowRatingReasonDto']

/** The windows the operator page offers, in days. */
export type OperationsRange = '7' | '28' | '90'

/** The two views of the operator page. */
export type OperationsView = 'health' | 'insights'
