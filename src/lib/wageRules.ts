/**
 * wageRules.ts
 * SA Domestic Worker pay rules engine — pure functions, no side-effects.
 *
 * Legal references:
 *   - Sectoral Determination 7 (Domestic Workers), BCEA
 *   - NMW Act: R28.79/h until 28 Feb 2026; R30.23/h from 1 Mar 2026
 *   - 4-Hour Rule: BCEA s33(1) — minimum payment for any day worked is 4h × NMW
 *     (the NMW base, NOT the worker's premium rate, where worker rate > NMW)
 *   - UIF Act: 1% employee + 1% employer if worker exceeds 24h/month
 *   - Overtime: BCEA s16 — 1.5× regular rate beyond agreed daily normal hours
 */

// ── Constants ─────────────────────────────────────────────────────────────────

export const NMW_RATES = {
    beforeMarch2026: 28.79,
    fromMarch2026: 30.23,
} as const;

/** Effective date of the March 2026 NMW increase (midnight, start of day). */
const MARCH_2026 = new Date(2026, 2, 1);

const FOUR_HOUR_MIN = 4;
const OVERTIME_MULTIPLIER = 1.5;
const UIF_RATE = 0.01;                   // 1% each side
const UIF_MONTHLY_THRESHOLD = 24;        // hours/month — strictly greater than
export const DEFAULT_NORMAL_HOURS = 9;  // Domestic workers: 9h/day (5-day week)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WageInput {
    /** Worker's agreed hourly rate in ZAR. Must be >= 0. */
    hourlyRate: number;
    /** Hours worked in this session/day. Must be >= 0. */
    hoursWorked: number;
    /**
     * Hours per day before overtime applies.
     * Defaults to 9 (Sectoral Determination 7, 5-day week).
     */
    normalHoursPerDay?: number;
    /**
     * Hours already worked this calendar month BEFORE this session.
     * Used to determine UIF eligibility. Defaults to 0.
     */
    monthlyHoursPrior?: number;
    /**
     * Date of the work session. Determines which NMW rate applies.
     * Defaults to today.
     */
    sessionDate?: Date;
}

export interface WageResult {
    /** NMW rate used for this calculation. */
    nmwRate: number;
    /** Regular hours charged (excluding overtime). */
    regularHours: number;
    /** Hours worked beyond normalHoursPerDay. */
    overtimeHours: number;
    /** Pay for regular hours (post 4-hour rule adjustment if applicable). */
    regularPay: number;
    /** Pay for overtime hours at 1.5× rate. */
    overtimePay: number;
    /** regularPay + overtimePay. */
    grossPay: number;
    /**
     * True when the 4-hour minimum guarantee (4 × NMW) exceeded the worker's
     * actual pay (hoursWorked × hourlyRate) and the minimum was applied instead.
     */
    fourHourRuleApplied: boolean;
    /** True when total monthly hours (prior + session) exceed 24. */
    uifApplicable: boolean;
    /** Employee UIF deduction (1% of grossPay) — 0 when not applicable. */
    employeeUIF: number;
    /** Employer UIF contribution (1% of grossPay) — 0 when not applicable. */
    employerUIF: number;
    /** grossPay minus employeeUIF. */
    netPay: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Round to 2 decimal places (cent-accurate). */
function r2(n: number): number {
    return Math.round(n * 100) / 100;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the applicable NMW hourly rate for a given date.
 * Defaults to today if no date is supplied.
 */
export function getNMWRate(date: Date = new Date()): number {
    return date >= MARCH_2026
        ? NMW_RATES.fromMarch2026
        : NMW_RATES.beforeMarch2026;
}

/**
 * Calculates gross pay, overtime, UIF deductions and net pay for a single
 * work session, applying SA domestic worker legal rules.
 *
 * @throws {RangeError} if hourlyRate, hoursWorked, or monthlyHoursPrior < 0
 * @throws {RangeError} if normalHoursPerDay <= 0
 */
export function calculateWage(input: WageInput): WageResult {
    const {
        hourlyRate,
        hoursWorked,
        normalHoursPerDay = DEFAULT_NORMAL_HOURS,
        monthlyHoursPrior = 0,
        sessionDate = new Date(),
    } = input;

    // ── Validation ─────────────────────────────────────────────────────────────
    if (hourlyRate < 0) throw new RangeError('hourlyRate cannot be negative');
    if (hoursWorked < 0) throw new RangeError('hoursWorked cannot be negative');
    if (monthlyHoursPrior < 0) throw new RangeError('monthlyHoursPrior cannot be negative');
    if (normalHoursPerDay <= 0) throw new RangeError('normalHoursPerDay must be > 0');

    const nmwRate = getNMWRate(sessionDate);

    // ── Zero hours ─────────────────────────────────────────────────────────────
    if (hoursWorked === 0) {
        return {
            nmwRate,
            regularHours: 0,
            overtimeHours: 0,
            regularPay: 0,
            overtimePay: 0,
            grossPay: 0,
            fourHourRuleApplied: false,
            uifApplicable: false,
            employeeUIF: 0,
            employerUIF: 0,
            netPay: 0,
        };
    }

    // ── 4-Hour Rule ────────────────────────────────────────────────────────────
    // When hours worked > 0 and < 4 the worker is guaranteed at least 4 × NMW,
    // regardless of their agreed (premium) rate. No overtime arises from a
    // sub-4-hour session since the minimum guarantee already covers it.
    //
    // pay = max(hoursWorked × hourlyRate, 4 × NMW)
    //
    // Note: even if normalHoursPerDay < 4, overtime is NOT split out here;
    // the 4-hour guarantee supersedes for short sessions.

    let regularPay: number;
    let overtimePay = 0;
    let regularHours: number;
    let overtimeHours = 0;
    let fourHourRuleApplied = false;

    if (hoursWorked < FOUR_HOUR_MIN) {
        const actualPay = r2(hoursWorked * hourlyRate);
        const minimumPay = r2(FOUR_HOUR_MIN * nmwRate);
        fourHourRuleApplied = minimumPay > actualPay;
        regularPay = fourHourRuleApplied ? minimumPay : actualPay;
        regularHours = hoursWorked;
    } else {
        // ── Regular + Overtime split ──────────────────────────────────────────────
        regularHours = Math.min(hoursWorked, normalHoursPerDay);
        overtimeHours = Math.max(0, hoursWorked - normalHoursPerDay);
        regularPay = r2(regularHours * hourlyRate);
        overtimePay = r2(overtimeHours * hourlyRate * OVERTIME_MULTIPLIER);
    }

    const grossPay = r2(regularPay + overtimePay);

    // ── UIF ────────────────────────────────────────────────────────────────────
    // UIF applies when total hours worked this month EXCEED 24 (strictly > 24).
    // Both contributions are calculated on the current session's gross pay.
    const totalMonthlyHours = monthlyHoursPrior + hoursWorked;
    const uifApplicable = totalMonthlyHours > UIF_MONTHLY_THRESHOLD;
    const employeeUIF = uifApplicable ? r2(grossPay * UIF_RATE) : 0;
    const employerUIF = uifApplicable ? r2(grossPay * UIF_RATE) : 0;
    const netPay = r2(grossPay - employeeUIF);

    return {
        nmwRate,
        regularHours,
        overtimeHours,
        regularPay,
        overtimePay,
        grossPay,
        fourHourRuleApplied,
        uifApplicable,
        employeeUIF,
        employerUIF,
        netPay,
    };
}
