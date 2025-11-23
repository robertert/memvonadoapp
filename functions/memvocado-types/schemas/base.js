"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimestampSchema = void 0;
const zod_1 = require("zod");
/**
 * Helper schema: konwertuje Firebase Timestamp na Date
 */
exports.TimestampSchema = zod_1.z.preprocess((value) => {
    if (value instanceof Date) {
        return value;
    }
    if (value && typeof value === "object") {
        const maybeTimestamp = value;
        if (typeof maybeTimestamp.toDate === "function") {
            return maybeTimestamp.toDate();
        }
    }
    return value;
}, zod_1.z.date());
