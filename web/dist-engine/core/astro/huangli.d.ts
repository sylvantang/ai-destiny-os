export interface HuangliResult {
    公历: string;
    星期: string;
    农历: string | null;
    生肖: string;
    干支: {
        年: string;
        月: string;
        日: string;
    };
    节气: string | null;
    星座: string;
    宜: string[];
    忌: string[];
    彭祖百忌: string[];
    十二神: {
        建除: string;
        黄黑道: string;
    };
    二十八宿: string | null;
    九星: string | null;
    六曜: string | null;
    神煞: {
        吉神: string[];
        凶煞: string[];
    };
    胎神: string;
    月相: string | null;
    吉神方位: {
        喜神: string;
        财神: string;
        福神: string | null;
        阳贵: string;
        阴贵: string;
        太岁: string;
    };
    节令: {
        三伏: string | null;
        数九: string | null;
        梅雨: string | null;
        物候: string | null;
    };
    节日: string[];
    时辰宜忌: {
        时辰: string;
        干支: string;
        宜: string[];
        忌: string[];
    }[];
    /** v1 局限说明 */
    limitations: string[];
}
/**
 * 计算某公历日期（UTC+8）的老黄历。
 */
export declare function getHuangli(year: number, month: number, day: number): HuangliResult;
//# sourceMappingURL=huangli.d.ts.map