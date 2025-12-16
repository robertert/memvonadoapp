"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetFriendsStreaksResponseSchema = exports.SuccessResponseSchema = void 0;
const zod_1 = require("zod");
__exportStar(require("./api/auth"), exports);
__exportStar(require("./api/deck"), exports);
__exportStar(require("./api/league"), exports);
__exportStar(require("./api/placeholder"), exports);
__exportStar(require("./api/ranking"), exports);
__exportStar(require("./api/notification"), exports);
__exportStar(require("./api/search"), exports);
__exportStar(require("./api/user"), exports);
// ============================================================================
// Card Functions
// ============================================================================
exports.SuccessResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
});
// ============================================================================
// Social Functions
// ============================================================================
exports.GetFriendsStreaksResponseSchema = zod_1.z.object({
    friendsStreaks: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        name: zod_1.z.string(),
        streak: zod_1.z.number(),
    })),
});
