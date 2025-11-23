import { z } from "zod";
/**
 * Zmiana karty (z typem)
 */
export declare const CardChangeWithTypeSchema: z.ZodObject<{
    cardId: z.ZodString;
    type: z.ZodEnum<["modified", "deleted", "new"]>;
    changes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        oldValue: z.ZodAny;
        newValue: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        field: string;
        oldValue?: any;
        newValue?: any;
    }, {
        field: string;
        oldValue?: any;
        newValue?: any;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    type: "modified" | "deleted" | "new";
    cardId: string;
    changes?: {
        field: string;
        oldValue?: any;
        newValue?: any;
    }[] | undefined;
}, {
    type: "modified" | "deleted" | "new";
    cardId: string;
    changes?: {
        field: string;
        oldValue?: any;
        newValue?: any;
    }[] | undefined;
}>;
export type CardChangeWithType = z.infer<typeof CardChangeWithTypeSchema>;
