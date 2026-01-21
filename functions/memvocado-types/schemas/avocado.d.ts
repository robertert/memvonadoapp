import { z } from "zod";
/**
 * Avocado Growth Gamification Schemas
 *
 * System 7-dniowego wzrostu awokado z nagrodami gacha
 */
export declare const AvocadoSkinRarity: z.ZodEnum<["common", "rare", "epic"]>;
export type AvocadoSkinRarity = z.infer<typeof AvocadoSkinRarity>;
export declare const AvocadoSkinSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    rarity: z.ZodEnum<["common", "rare", "epic"]>;
    obtainedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    rarity: "common" | "rare" | "epic";
    obtainedAt: Date;
}, {
    id: string;
    name: string;
    rarity: "common" | "rare" | "epic";
    obtainedAt?: unknown;
}>;
export type AvocadoSkin = z.infer<typeof AvocadoSkinSchema>;
export declare const AvocadoHarvestLogSchema: z.ZodObject<{
    skinId: z.ZodString;
    harvestedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strip", z.ZodTypeAny, {
    skinId: string;
    harvestedAt: Date;
}, {
    skinId: string;
    harvestedAt?: unknown;
}>;
export type AvocadoHarvestLog = z.infer<typeof AvocadoHarvestLogSchema>;
export declare const AvocadoGrowthSchema: z.ZodObject<{
    currentPhase: z.ZodDefault<z.ZodNumber>;
    consecutiveDays: z.ZodDefault<z.ZodNumber>;
    lastGrowthDate: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>>;
    totalHarvests: z.ZodDefault<z.ZodNumber>;
    collectedSkins: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        rarity: z.ZodEnum<["common", "rare", "epic"]>;
        obtainedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt: Date;
    }, {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt?: unknown;
    }>, "many">>;
    harvestHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
        skinId: z.ZodString;
        harvestedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strip", z.ZodTypeAny, {
        skinId: string;
        harvestedAt: Date;
    }, {
        skinId: string;
        harvestedAt?: unknown;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    currentPhase: number;
    consecutiveDays: number;
    totalHarvests: number;
    collectedSkins: {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt: Date;
    }[];
    harvestHistory: {
        skinId: string;
        harvestedAt: Date;
    }[];
    lastGrowthDate?: Date | null | undefined;
}, {
    currentPhase?: number | undefined;
    consecutiveDays?: number | undefined;
    lastGrowthDate?: unknown;
    totalHarvests?: number | undefined;
    collectedSkins?: {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt?: unknown;
    }[] | undefined;
    harvestHistory?: {
        skinId: string;
        harvestedAt?: unknown;
    }[] | undefined;
}>;
export type AvocadoGrowth = z.infer<typeof AvocadoGrowthSchema>;
export declare const AvocadoGrowthUpdateSchema: z.ZodObject<{
    currentPhase: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    consecutiveDays: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    lastGrowthDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>>>;
    totalHarvests: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    collectedSkins: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        rarity: z.ZodEnum<["common", "rare", "epic"]>;
        obtainedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt: Date;
    }, {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt?: unknown;
    }>, "many">>>;
    harvestHistory: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        skinId: z.ZodString;
        harvestedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strip", z.ZodTypeAny, {
        skinId: string;
        harvestedAt: Date;
    }, {
        skinId: string;
        harvestedAt?: unknown;
    }>, "many">>>;
}, "strip", z.ZodTypeAny, {
    currentPhase?: number | undefined;
    consecutiveDays?: number | undefined;
    lastGrowthDate?: Date | null | undefined;
    totalHarvests?: number | undefined;
    collectedSkins?: {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt: Date;
    }[] | undefined;
    harvestHistory?: {
        skinId: string;
        harvestedAt: Date;
    }[] | undefined;
}, {
    currentPhase?: number | undefined;
    consecutiveDays?: number | undefined;
    lastGrowthDate?: unknown;
    totalHarvests?: number | undefined;
    collectedSkins?: {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt?: unknown;
    }[] | undefined;
    harvestHistory?: {
        skinId: string;
        harvestedAt?: unknown;
    }[] | undefined;
}>;
export type AvocadoGrowthUpdate = z.infer<typeof AvocadoGrowthUpdateSchema>;
export declare const AvocadoSkinConfigSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    rarity: z.ZodEnum<["common", "rare", "epic"]>;
    weight: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    rarity: "common" | "rare" | "epic";
    weight: number;
}, {
    id: string;
    name: string;
    rarity: "common" | "rare" | "epic";
    weight: number;
}>;
export type AvocadoSkinConfig = z.infer<typeof AvocadoSkinConfigSchema>;
export declare const AvocadoConfigSchema: z.ZodObject<{
    skins: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        rarity: z.ZodEnum<["common", "rare", "epic"]>;
        weight: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        weight: number;
    }, {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        weight: number;
    }>, "many">;
    phaseDaysRequired: z.ZodDefault<z.ZodNumber>;
    totalPhases: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    skins: {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        weight: number;
    }[];
    phaseDaysRequired: number;
    totalPhases: number;
}, {
    skins: {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        weight: number;
    }[];
    phaseDaysRequired?: number | undefined;
    totalPhases?: number | undefined;
}>;
export type AvocadoConfig = z.infer<typeof AvocadoConfigSchema>;
export declare const GetAvocadoStatusRequestSchema: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export type GetAvocadoStatusRequest = z.infer<typeof GetAvocadoStatusRequestSchema>;
export declare const GetAvocadoStatusResponseSchema: z.ZodObject<{
    currentPhase: z.ZodNumber;
    consecutiveDays: z.ZodNumber;
    lastGrowthDate: z.ZodNullable<z.ZodString>;
    totalHarvests: z.ZodNumber;
    collectedSkins: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        rarity: z.ZodEnum<["common", "rare", "epic"]>;
    } & {
        obtainedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt: Date;
    }, {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt?: unknown;
    }>, "many">;
    harvestHistory: z.ZodArray<z.ZodObject<{
        skinId: z.ZodString;
    } & {
        harvestedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strip", z.ZodTypeAny, {
        skinId: string;
        harvestedAt: Date;
    }, {
        skinId: string;
        harvestedAt?: unknown;
    }>, "many">;
    canHarvest: z.ZodBoolean;
    isWilted: z.ZodBoolean;
    goalMetToday: z.ZodBoolean;
}, "strict", z.ZodTypeAny, {
    currentPhase: number;
    consecutiveDays: number;
    lastGrowthDate: string | null;
    totalHarvests: number;
    collectedSkins: {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt: Date;
    }[];
    harvestHistory: {
        skinId: string;
        harvestedAt: Date;
    }[];
    canHarvest: boolean;
    isWilted: boolean;
    goalMetToday: boolean;
}, {
    currentPhase: number;
    consecutiveDays: number;
    lastGrowthDate: string | null;
    totalHarvests: number;
    collectedSkins: {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt?: unknown;
    }[];
    harvestHistory: {
        skinId: string;
        harvestedAt?: unknown;
    }[];
    canHarvest: boolean;
    isWilted: boolean;
    goalMetToday: boolean;
}>;
export type GetAvocadoStatusResponse = z.infer<typeof GetAvocadoStatusResponseSchema>;
export declare const HarvestAvocadoRequestSchema: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export type HarvestAvocadoRequest = z.infer<typeof HarvestAvocadoRequestSchema>;
export declare const HarvestAvocadoResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    awardedSkin: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        rarity: z.ZodEnum<["common", "rare", "epic"]>;
    } & {
        obtainedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt: Date;
    }, {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt?: unknown;
    }>;
    isNewSkin: z.ZodBoolean;
    totalHarvests: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    totalHarvests: number;
    success: boolean;
    awardedSkin: {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt: Date;
    };
    isNewSkin: boolean;
}, {
    totalHarvests: number;
    success: boolean;
    awardedSkin: {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        obtainedAt?: unknown;
    };
    isNewSkin: boolean;
}>;
export type HarvestAvocadoResponse = z.infer<typeof HarvestAvocadoResponseSchema>;
export declare const GetAvocadoConfigRequestSchema: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export type GetAvocadoConfigRequest = z.infer<typeof GetAvocadoConfigRequestSchema>;
export declare const GetAvocadoConfigResponseSchema: z.ZodObject<{
    skins: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        rarity: z.ZodEnum<["common", "rare", "epic"]>;
        weight: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        weight: number;
    }, {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        weight: number;
    }>, "many">;
    phaseDaysRequired: z.ZodDefault<z.ZodNumber>;
    totalPhases: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    skins: {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        weight: number;
    }[];
    phaseDaysRequired: number;
    totalPhases: number;
}, {
    skins: {
        id: string;
        name: string;
        rarity: "common" | "rare" | "epic";
        weight: number;
    }[];
    phaseDaysRequired?: number | undefined;
    totalPhases?: number | undefined;
}>;
export type GetAvocadoConfigResponse = z.infer<typeof GetAvocadoConfigResponseSchema>;
