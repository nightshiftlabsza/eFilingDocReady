/**
 * wageRules.test.ts
 * 100% coverage — every branch, boundary, and legal edge case.
 */
import { describe, it, expect } from 'vitest';
import {
    calculateWage,
    getNMWRate,
    NMW_RATES,
} from './wageRules';

const OLD = NMW_RATES.beforeMarch2026; // 28.79
const NEW = NMW_RATES.fromMarch2026;   // 30.23
const JUN25 = new Date('2025-06-01');  // before March 2026
const MAR26 = new Date('2026-03-01');  // on the boundary
const APR26 = new Date('2026-04-15');  // after boundary

// ─── getNMWRate ───────────────────────────────────────────────────────────────

describe('getNMWRate', () => {
    it('returns old rate before March 2026', () => {
        expect(getNMWRate(JUN25)).toBe(OLD);
    });

    it('returns new rate exactly on March 1 2026', () => {
        expect(getNMWRate(MAR26)).toBe(NEW);
    });

    it('returns new rate after March 2026', () => {
        expect(getNMWRate(APR26)).toBe(NEW);
    });
});

// ─── Validation / Guards ─────────────────────────────────────────────────────

describe('input validation', () => {
    it('throws RangeError for negative hourlyRate', () => {
        expect(() => calculateWage({ hourlyRate: -1, hoursWorked: 4 }))
            .toThrow(RangeError);
    });

    it('throws RangeError for negative hoursWorked', () => {
        expect(() => calculateWage({ hourlyRate: OLD, hoursWorked: -1 }))
            .toThrow(RangeError);
    });

    it('throws RangeError for negative monthlyHoursPrior', () => {
        expect(() => calculateWage({ hourlyRate: OLD, hoursWorked: 4, monthlyHoursPrior: -1 }))
            .toThrow(RangeError);
    });

    it('throws RangeError for normalHoursPerDay <= 0', () => {
        expect(() => calculateWage({ hourlyRate: OLD, hoursWorked: 4, normalHoursPerDay: 0 }))
            .toThrow(RangeError);
    });
});

// ─── Zero hours ───────────────────────────────────────────────────────────────

describe('zero hours worked', () => {
    it('returns all-zero result when hoursWorked = 0', () => {
        const r = calculateWage({ hourlyRate: 50, hoursWorked: 0, sessionDate: JUN25 });
        expect(r.grossPay).toBe(0);
        expect(r.netPay).toBe(0);
        expect(r.employeeUIF).toBe(0);
        expect(r.fourHourRuleApplied).toBe(false);
        expect(r.uifApplicable).toBe(false);
        expect(r.regularHours).toBe(0);
        expect(r.overtimeHours).toBe(0);
    });
});

// ─── 4-Hour Rule ─────────────────────────────────────────────────────────────

describe('4-Hour Rule', () => {
    // Rule applies when hoursWorked < 4 and (hoursWorked × rate) < (4 × NMW)

    it('applies at NMW rate, 2h worked → pay = 4 × NMW', () => {
        const r = calculateWage({ hourlyRate: OLD, hoursWorked: 2, sessionDate: JUN25 });
        expect(r.fourHourRuleApplied).toBe(true);
        expect(r.grossPay).toBe(4 * OLD);          // 115.16
        expect(r.overtimePay).toBe(0);
    });

    it('applies at NMW rate, 3h worked → pay = 4 × NMW', () => {
        const r = calculateWage({ hourlyRate: OLD, hoursWorked: 3, sessionDate: JUN25 });
        expect(r.fourHourRuleApplied).toBe(true);
        expect(r.grossPay).toBe(4 * OLD);
    });

    it('applies at NMW rate, 1h worked → pay = 4 × NMW', () => {
        const r = calculateWage({ hourlyRate: OLD, hoursWorked: 1, sessionDate: JUN25 });
        expect(r.fourHourRuleApplied).toBe(true);
        expect(r.grossPay).toBe(4 * OLD);
    });

    it('applies at premium rate where 2h × rate < 4 × NMW (R35/h, 2h → R70 < R115.16)', () => {
        const r = calculateWage({ hourlyRate: 35, hoursWorked: 2, sessionDate: JUN25 });
        expect(r.fourHourRuleApplied).toBe(true);
        expect(r.grossPay).toBe(4 * OLD);          // 115.16 wins
    });

    it('does NOT apply when actual pay exceeds 4 × NMW (R60/h, 2h = R120 > R115.16)', () => {
        // R60 × 2 = R120; 4 × R28.79 = R115.16 → actual pay wins
        const r = calculateWage({ hourlyRate: 60, hoursWorked: 2, sessionDate: JUN25 });
        expect(r.fourHourRuleApplied).toBe(false);
        expect(r.grossPay).toBe(120);
    });

    it('does NOT apply when actual pay exceeds 4 × NMW (R50/h, 3h = R150 > R115.16)', () => {
        const r = calculateWage({ hourlyRate: 50, hoursWorked: 3, sessionDate: JUN25 });
        expect(r.fourHourRuleApplied).toBe(false);
        expect(r.grossPay).toBe(150);
    });

    it('does NOT apply at exactly 4h (boundary — rule is strictly < 4)', () => {
        const r = calculateWage({ hourlyRate: OLD, hoursWorked: 4, sessionDate: JUN25 });
        expect(r.fourHourRuleApplied).toBe(false);
        expect(r.grossPay).toBe(4 * OLD);          // same value, different path
        expect(r.regularHours).toBe(4);
    });

    it('uses new NMW rate for 4-hour minimum after March 2026', () => {
        const r = calculateWage({ hourlyRate: OLD, hoursWorked: 2, sessionDate: MAR26 });
        expect(r.nmwRate).toBe(NEW);
        expect(r.fourHourRuleApplied).toBe(true);
        expect(r.grossPay).toBe(4 * NEW);          // 120.92
    });

    it('does not split overtime within 4-hour rule even if normalHoursPerDay < hoursWorked', () => {
        // Edge: normalHoursPerDay=2, hoursWorked=3 → still in 4-hour rule territory
        const r = calculateWage({
            hourlyRate: OLD, hoursWorked: 3, normalHoursPerDay: 2, sessionDate: JUN25
        });
        expect(r.fourHourRuleApplied).toBe(true);
        expect(r.overtimeHours).toBe(0);
        expect(r.grossPay).toBe(4 * OLD);
    });
});

// ─── Regular pay (no overtime) ───────────────────────────────────────────────

describe('regular hours (no overtime)', () => {
    it('calculates 8h at NMW correctly, normalHours=9', () => {
        const r = calculateWage({ hourlyRate: OLD, hoursWorked: 8, sessionDate: JUN25 });
        expect(r.regularHours).toBe(8);
        expect(r.overtimeHours).toBe(0);
        expect(r.grossPay).toBe(8 * OLD);
        expect(r.fourHourRuleApplied).toBe(false);
    });

    it('calculates exactly normalHoursPerDay with no overflow', () => {
        const r = calculateWage({
            hourlyRate: 40, hoursWorked: 9, normalHoursPerDay: 9, sessionDate: JUN25
        });
        expect(r.regularHours).toBe(9);
        expect(r.overtimeHours).toBe(0);
        expect(r.grossPay).toBe(360);
    });
});

// ─── Overtime ────────────────────────────────────────────────────────────────

describe('overtime at 1.5× rate', () => {
    it('calculates 1h overtime correctly', () => {
        // 9h regular + 1h OT at R35 → (9 × 35) + (1 × 35 × 1.5) = 315 + 52.50 = 367.50
        const r = calculateWage({
            hourlyRate: 35, hoursWorked: 10, normalHoursPerDay: 9, sessionDate: JUN25
        });
        expect(r.regularHours).toBe(9);
        expect(r.overtimeHours).toBe(1);
        expect(r.regularPay).toBe(315);
        expect(r.overtimePay).toBe(52.5);
        expect(r.grossPay).toBe(367.5);
    });

    it('calculates 4h overtime correctly', () => {
        // normalHours=9, worked=13 → 9 reg + 4 OT at NMW
        const regPay = 9 * OLD;
        const otPay = 4 * OLD * 1.5;
        const r = calculateWage({
            hourlyRate: OLD, hoursWorked: 13, normalHoursPerDay: 9, sessionDate: JUN25
        });
        expect(r.overtimeHours).toBe(4);
        expect(r.regularPay).toBeCloseTo(regPay, 2);
        expect(r.overtimePay).toBeCloseTo(otPay, 2);
        expect(r.grossPay).toBeCloseTo(regPay + otPay, 2);
    });

    it('respects custom normalHoursPerDay of 6', () => {
        // 6h normal, 2h OT at R45
        const r = calculateWage({
            hourlyRate: 45, hoursWorked: 8, normalHoursPerDay: 6, sessionDate: JUN25
        });
        expect(r.regularHours).toBe(6);
        expect(r.overtimeHours).toBe(2);
        expect(r.regularPay).toBe(270);
        expect(r.overtimePay).toBe(135);
        expect(r.grossPay).toBe(405);
    });
});

// ─── UIF ─────────────────────────────────────────────────────────────────────

describe('UIF — threshold strictly > 24h/month', () => {
    it('does NOT apply when total hours = 24 exactly', () => {
        // 20h prior + 4h session = 24 — not > 24, no UIF
        const r = calculateWage({
            hourlyRate: OLD, hoursWorked: 4,
            monthlyHoursPrior: 20, sessionDate: JUN25
        });
        expect(r.uifApplicable).toBe(false);
        expect(r.employeeUIF).toBe(0);
        expect(r.employerUIF).toBe(0);
    });

    it('applies when total hours = 25 (1h over threshold)', () => {
        // 20h prior + 5h session = 25 > 24
        const r = calculateWage({
            hourlyRate: OLD, hoursWorked: 5,
            monthlyHoursPrior: 20, sessionDate: JUN25
        });
        expect(r.uifApplicable).toBe(true);
        expect(r.employeeUIF).toBeCloseTo(r.grossPay * 0.01, 2);
        expect(r.employerUIF).toBeCloseTo(r.grossPay * 0.01, 2);
    });

    it('does NOT apply when only session hours are considered and total ≤ 24', () => {
        const r = calculateWage({
            hourlyRate: 40, hoursWorked: 8, monthlyHoursPrior: 0, sessionDate: JUN25
        });
        expect(r.uifApplicable).toBe(false);
    });

    it('applies when first-session crosses threshold (0 prior + 25h session)', () => {
        const r = calculateWage({
            hourlyRate: OLD, hoursWorked: 25,
            monthlyHoursPrior: 0, sessionDate: JUN25
        });
        expect(r.uifApplicable).toBe(true);
    });

    it('deducts employee UIF from grossPay to give netPay', () => {
        const r = calculateWage({
            hourlyRate: 40, hoursWorked: 8,
            monthlyHoursPrior: 20, sessionDate: JUN25
        });
        // 20 + 8 = 28 > 24 → UIF applies
        expect(r.uifApplicable).toBe(true);
        expect(r.netPay).toBeCloseTo(r.grossPay - r.employeeUIF, 2);
    });

    it('employer UIF equals employee UIF (both 1%)', () => {
        const r = calculateWage({
            hourlyRate: 50, hoursWorked: 30,
            monthlyHoursPrior: 0, sessionDate: JUN25
        });
        expect(r.employeeUIF).toBe(r.employerUIF);
    });
});

// ─── Combined scenarios ───────────────────────────────────────────────────────

describe('combined: overtime + UIF', () => {
    it('applies 1.5× overtime AND UIF deductions together', () => {
        // 9h normal, 3h OT at R40; 30h prior → UIF applies
        const regPay = 9 * 40;           // 360
        const otPay = 3 * 40 * 1.5;    // 180
        const gross = 360 + 180;        // 540
        const uif = gross * 0.01;     // 5.40

        const r = calculateWage({
            hourlyRate: 40, hoursWorked: 12,
            normalHoursPerDay: 9, monthlyHoursPrior: 30, sessionDate: JUN25
        });
        expect(r.regularPay).toBe(regPay);
        expect(r.overtimePay).toBe(otPay);
        expect(r.grossPay).toBe(gross);
        expect(r.uifApplicable).toBe(true);
        expect(r.employeeUIF).toBeCloseTo(uif, 2);
        expect(r.netPay).toBeCloseTo(gross - uif, 2);
    });

    it('4-hour rule + UIF: minimum pay used as UIF base', () => {
        // 2h at NMW, 30h prior → rule applies; UIF base = 4 × NMW
        const gross = 4 * OLD;
        const uif = gross * 0.01;
        const r = calculateWage({
            hourlyRate: OLD, hoursWorked: 2,
            monthlyHoursPrior: 30, sessionDate: JUN25
        });
        expect(r.fourHourRuleApplied).toBe(true);
        expect(r.grossPay).toBeCloseTo(gross, 2);
        expect(r.uifApplicable).toBe(true);
        expect(r.employeeUIF).toBeCloseTo(uif, 2);
        expect(r.netPay).toBeCloseTo(gross - uif, 2);
    });
});

// ─── NMW rate switching ───────────────────────────────────────────────────────

describe('NMW rate switchover', () => {
    it('uses R28.79 on 28 Feb 2026', () => {
        const r = calculateWage({
            hourlyRate: OLD, hoursWorked: 8,
            sessionDate: new Date('2026-02-28')
        });
        expect(r.nmwRate).toBe(OLD);
    });

    it('uses R30.23 on 1 Mar 2026', () => {
        const r = calculateWage({
            hourlyRate: NEW, hoursWorked: 8,
            sessionDate: MAR26
        });
        expect(r.nmwRate).toBe(NEW);
        expect(r.grossPay).toBe(8 * NEW);
    });

    it('regular 8h day grossPay is correct with new rate', () => {
        const r = calculateWage({ hourlyRate: NEW, hoursWorked: 8, sessionDate: APR26 });
        expect(r.grossPay).toBeCloseTo(8 * NEW, 2);  // 241.84
    });
});
