/**
 * Compute the Equation of Time (in minutes) for a given date.
 * Equation of Time = apparent solar time − mean solar time.
 * Positive means the sundial is ahead of the clock.
 *
 * Uses a simplified but accurate (within ~30 seconds) formula.
 */
export declare function equationOfTime(date: Date): number;
/**
 * Convert standard clock time to true solar time.
 *
 * @param date - Local clock time
 * @param longitude - Observer's longitude in degrees (east positive)
 * @param standardMeridian - Timezone's standard meridian (default 120°E for China)
 * @returns True solar time as a Date object
 */
export declare function toTrueSolarTime(date: Date, longitude: number, standardMeridian?: number): Date;
/**
 * Get the earthly branch index for an hour based on true solar time.
 *
 * Hour → Branch mapping (true solar time):
 *  子时: 23:00–00:59  (branch 0)
 *  丑时: 01:00–02:59  (branch 1)
 *  寅时: 03:00–04:59  (branch 2)
 *  卯时: 05:00–06:59  (branch 3)
 *  辰时: 07:00–08:59  (branch 4)
 *  巳时: 09:00–10:59  (branch 5)
 *  午时: 11:00–12:59  (branch 6)
 *  未时: 13:00–14:59  (branch 7)
 *  申时: 15:00–16:59  (branch 8)
 *  酉时: 17:00–18:59  (branch 9)
 *  戌时: 19:00–20:59  (branch 10)
 *  亥时: 21:00–22:59  (branch 11)
 */
export declare function getHourBranch(date: Date, longitude: number, isDST: boolean): number;
/**
 * Get the true solar time as decimal hours (local time).
 */
export declare function getSolarHours(date: Date, longitude: number, isDST: boolean): number;
//# sourceMappingURL=solarTime.d.ts.map