"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchLogSchema = exports.SearchFiltersSchema = void 0;
const zod_1 = require("zod");
const base_1 = require("./base");
/**
 * Filtry wyszukiwania
 */
exports.SearchFiltersSchema = zod_1.z
    .object({
    category: zod_1.z.string().optional(),
    author: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
})
    .strict();
/**
 * Log wyszukiwania
 */
exports.SearchLogSchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    userId: zod_1.z.string().optional(),
    searchText: zod_1.z.string(),
    filters: exports.SearchFiltersSchema,
    resultsCount: zod_1.z.number().min(0),
    timestamp: base_1.TimestampSchema,
})
    .strict();
