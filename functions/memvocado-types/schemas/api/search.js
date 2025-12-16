"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSearchLogsResponseSchema = exports.SearchDecksResponseSchema = exports.GetSearchLogsRequestSchema = exports.SearchDecksRequestSchema = void 0;
const zod_1 = require("zod");
const index_1 = require("../index");
const search_1 = require("../search");
// ===========================
// Search request schemas
// ===========================
exports.SearchDecksRequestSchema = zod_1.z
    .object({
    searchText: zod_1.z.string().optional(),
    filters: search_1.SearchFiltersSchema.optional(),
    userId: zod_1.z.string().optional(),
    limit: zod_1.z.number().int().min(1).max(100).optional(),
})
    .strict();
exports.GetSearchLogsRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
})
    .strict();
// ===========================
// Search response schemas
// ===========================
exports.SearchDecksResponseSchema = zod_1.z.object({
    results: zod_1.z.array(index_1.DeckSchema),
    total: zod_1.z.number(),
});
exports.GetSearchLogsResponseSchema = zod_1.z.object({
    logs: zod_1.z.array(index_1.SearchLogSchema.extend({
        id: zod_1.z.string(),
    })),
});
