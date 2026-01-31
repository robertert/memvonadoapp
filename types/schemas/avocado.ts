import { z } from "zod";
import { TimestampSchema } from "./base";

/**
 * Avocado Growth Gamification Schemas
 *
 * System 7-dniowego wzrostu awokado z nagrodami gacha
 */

// Rzadkość skórek awokado
export const AvocadoSkinRarity = z.enum(["common", "rare", "epic", "legendary"]);
export type AvocadoSkinRarity = z.infer<typeof AvocadoSkinRarity>;

// Skórka awokado posiadana przez użytkownika
export const AvocadoSkinSchema = z.object({
  id: z.string(),
  name: z.string(),
  rarity: AvocadoSkinRarity,
  obtainedAt: TimestampSchema,
});
export type AvocadoSkin = z.infer<typeof AvocadoSkinSchema>;

// Log pojedynczego zbioru
export const AvocadoHarvestLogSchema = z.object({
  skinId: z.string(),
  harvestedAt: TimestampSchema,
});
export type AvocadoHarvestLog = z.infer<typeof AvocadoHarvestLogSchema>;

// Główny schemat postępu wzrostu awokado
export const AvocadoGrowthSchema = z.object({
  currentPhase: z.number().min(1).max(5).default(1),
  consecutiveDays: z.number().min(0).default(0),
  lastGrowthDate: TimestampSchema.optional().nullable(),
  totalHarvests: z.number().min(0).default(0),
  collectedSkins: z.array(AvocadoSkinSchema).default([]),
  harvestHistory: z.array(AvocadoHarvestLogSchema).default([]),
});
export type AvocadoGrowth = z.infer<typeof AvocadoGrowthSchema>;

// Schemat częściowej aktualizacji (do update'ów)
export const AvocadoGrowthUpdateSchema = AvocadoGrowthSchema.partial();
export type AvocadoGrowthUpdate = z.infer<typeof AvocadoGrowthUpdateSchema>;

// ============================================================================
// Konfiguracja skórek (z Firestore admin/avocadoConfig)
// ============================================================================

// Konfiguracja pojedynczej skórki w puli gacha
export const AvocadoSkinConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  rarity: AvocadoSkinRarity,
  weight: z.number(),  // Waga losowania w systemie gacha
});
export type AvocadoSkinConfig = z.infer<typeof AvocadoSkinConfigSchema>;

// Pełna konfiguracja systemu awokado
export const AvocadoConfigSchema = z.object({
  skins: z.array(AvocadoSkinConfigSchema),
  phaseDaysRequired: z.number().default(1),
  totalPhases: z.number().default(5),
});
export type AvocadoConfig = z.infer<typeof AvocadoConfigSchema>;

// ============================================================================
// Schematy API Request/Response
// ============================================================================

// Get Avocado Status
export const GetAvocadoStatusRequestSchema = z.object({}).strict();
export type GetAvocadoStatusRequest = z.infer<typeof GetAvocadoStatusRequestSchema>;

export const GetAvocadoStatusResponseSchema = z.object({
  currentPhase: z.number(),
  consecutiveDays: z.number(),
  lastGrowthDate: z.string().nullable(),
  totalHarvests: z.number(),
  collectedSkins: z.array(AvocadoSkinSchema.extend({
    obtainedAt: TimestampSchema,
  })),
  harvestHistory: z.array(AvocadoHarvestLogSchema.extend({
    harvestedAt: TimestampSchema,
  })),
  canHarvest: z.boolean(),
  isWilted: z.boolean(),
  goalMetToday: z.boolean(),
}).strict();
export type GetAvocadoStatusResponse = z.infer<typeof GetAvocadoStatusResponseSchema>;

// Harvest Avocado
export const HarvestAvocadoRequestSchema = z.object({}).strict();
export type HarvestAvocadoRequest = z.infer<typeof HarvestAvocadoRequestSchema>;

export const HarvestAvocadoResponseSchema = z.object({
  success: z.boolean(),
  awardedSkin: AvocadoSkinSchema.extend({
    obtainedAt: TimestampSchema,
  }),
  isNewSkin: z.boolean(),
  totalHarvests: z.number(),
}).strict();
export type HarvestAvocadoResponse = z.infer<typeof HarvestAvocadoResponseSchema>;

// Get Avocado Config
export const GetAvocadoConfigRequestSchema = z.object({}).strict();
export type GetAvocadoConfigRequest = z.infer<typeof GetAvocadoConfigRequestSchema>;

export const GetAvocadoConfigResponseSchema = AvocadoConfigSchema;
export type GetAvocadoConfigResponse = z.infer<typeof GetAvocadoConfigResponseSchema>;
