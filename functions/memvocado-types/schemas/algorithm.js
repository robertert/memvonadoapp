"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperMemoResultSchema = void 0;
const zod_1 = require("zod");
/**
 * Wynik algorytmu SuperMemo2
 */
exports.SuperMemoResultSchema = zod_1.z
    .object({
    interval: zod_1.z.number().min(0),
    difficulty: zod_1.z.number().min(0).max(5),
})
    .strict();
