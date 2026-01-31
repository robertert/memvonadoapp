"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAvocadoConfigResponseSchema = exports.GetAvocadoConfigRequestSchema = exports.HarvestAvocadoResponseSchema = exports.HarvestAvocadoRequestSchema = exports.GetAvocadoStatusResponseSchema = exports.GetAvocadoStatusRequestSchema = exports.AvocadoConfigSchema = exports.AvocadoSkinConfigSchema = exports.AvocadoGrowthUpdateSchema = exports.AvocadoGrowthSchema = exports.AvocadoHarvestLogSchema = exports.AvocadoSkinSchema = exports.AvocadoSkinRarity = void 0;
const zod_1 = require("zod");
const base_1 = require("./base");
/**
 * Avocado Growth Gamification Schemas
 *
 * System 7-dniowego wzrostu awokado z nagrodami gacha
 */
// Rzadkość skórek awokado
exports.AvocadoSkinRarity = zod_1.z.enum(["common", "rare", "epic", "legendary"]);
// Skórka awokado posiadana przez użytkownika
exports.AvocadoSkinSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    rarity: exports.AvocadoSkinRarity,
    obtainedAt: base_1.TimestampSchema,
});
// Log pojedynczego zbioru
exports.AvocadoHarvestLogSchema = zod_1.z.object({
    skinId: zod_1.z.string(),
    harvestedAt: base_1.TimestampSchema,
});
// Główny schemat postępu wzrostu awokado
exports.AvocadoGrowthSchema = zod_1.z.object({
    currentPhase: zod_1.z.number().min(1).max(5).default(1),
    consecutiveDays: zod_1.z.number().min(0).default(0),
    lastGrowthDate: base_1.TimestampSchema.optional().nullable(),
    totalHarvests: zod_1.z.number().min(0).default(0),
    collectedSkins: zod_1.z.array(exports.AvocadoSkinSchema).default([]),
    harvestHistory: zod_1.z.array(exports.AvocadoHarvestLogSchema).default([]),
});
// Schemat częściowej aktualizacji (do update'ów)
exports.AvocadoGrowthUpdateSchema = exports.AvocadoGrowthSchema.partial();
// ============================================================================
// Konfiguracja skórek (z Firestore admin/avocadoConfig)
// ============================================================================
// Konfiguracja pojedynczej skórki w puli gacha
exports.AvocadoSkinConfigSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    rarity: exports.AvocadoSkinRarity,
    weight: zod_1.z.number(), // Waga losowania w systemie gacha
});
// Pełna konfiguracja systemu awokado
exports.AvocadoConfigSchema = zod_1.z.object({
    skins: zod_1.z.array(exports.AvocadoSkinConfigSchema),
    phaseDaysRequired: zod_1.z.number().default(1),
    totalPhases: zod_1.z.number().default(5),
});
// ============================================================================
// Schematy API Request/Response
// ============================================================================
// Get Avocado Status
exports.GetAvocadoStatusRequestSchema = zod_1.z.object({}).strict();
exports.GetAvocadoStatusResponseSchema = zod_1.z.object({
    currentPhase: zod_1.z.number(),
    consecutiveDays: zod_1.z.number(),
    lastGrowthDate: zod_1.z.string().nullable(),
    totalHarvests: zod_1.z.number(),
    collectedSkins: zod_1.z.array(exports.AvocadoSkinSchema.extend({
        obtainedAt: base_1.TimestampSchema,
    })),
    harvestHistory: zod_1.z.array(exports.AvocadoHarvestLogSchema.extend({
        harvestedAt: base_1.TimestampSchema,
    })),
    canHarvest: zod_1.z.boolean(),
    isWilted: zod_1.z.boolean(),
    goalMetToday: zod_1.z.boolean(),
}).strict();
// Harvest Avocado
exports.HarvestAvocadoRequestSchema = zod_1.z.object({}).strict();
exports.HarvestAvocadoResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    awardedSkin: exports.AvocadoSkinSchema.extend({
        obtainedAt: base_1.TimestampSchema,
    }),
    isNewSkin: zod_1.z.boolean(),
    totalHarvests: zod_1.z.number(),
}).strict();
// Get Avocado Config
exports.GetAvocadoConfigRequestSchema = zod_1.z.object({}).strict();
exports.GetAvocadoConfigResponseSchema = exports.AvocadoConfigSchema;
