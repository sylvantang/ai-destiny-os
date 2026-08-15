export declare const tools: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            year: {
                type: string;
                minimum: number;
                maximum: number;
            };
            month: {
                type: string;
                minimum: number;
                maximum: number;
            };
            day: {
                type: string;
                minimum: number;
                maximum: number;
            };
            hour: {
                type: string;
                minimum: number;
                maximum: number;
            };
            minute: {
                type: string;
                minimum: number;
                maximum: number;
                default: number;
            };
            gender: {
                type: string;
                enum: string[];
            };
            longitude: {
                type: string;
            };
            latitude: {
                type: string;
            };
            city: {
                type: string;
            };
            useTrueSolarTime: {
                type: string;
                default: boolean;
            };
            sect: {
                type: string;
                enum: number[];
                default: number;
            };
        };
        required: string[];
    };
    handler: (rawArgs: unknown) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
        structuredContent: import("shunshi-bazi-core").GetBaziChartOutput;
    }>;
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            year: {
                type: string;
                minimum: number;
                maximum: number;
            };
            month: {
                type: string;
                minimum: number;
                maximum: number;
            };
            day: {
                type: string;
                minimum: number;
                maximum: number;
            };
            hour?: undefined;
            minute?: undefined;
            gender?: undefined;
            longitude?: undefined;
            latitude?: undefined;
            city?: undefined;
            useTrueSolarTime?: undefined;
            sect?: undefined;
        };
        required?: undefined;
    };
    handler: (rawArgs: unknown) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
        structuredContent: import("shunshi-bazi-core").HuangliResult;
    }>;
})[];
