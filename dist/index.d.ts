import { type Action } from "@sveltejs/kit";
import { z } from "zod";
export { default } from "./Form.svelte";
export { default as FormErrorComponent } from "./FormError.svelte";
export * from "./Form.svelte";
export type { ValidateDataEvent, ValidateValueEvent, ValueTransformEvent } from "./Form";
export declare const IntlDateTimeFormatter: Intl.DateTimeFormat;
export declare const DateTimeFormatRegex: RegExp;
export declare function date(date: string | Date): string;
export declare function datetime(date: string | Date): string;
export declare function dateFormat(date: string | Date, format: string): string;
export declare function zodAction<T extends z.ZodSchema, ActionInput extends Record<string, any>, OutputData extends void | {
    data?: {
        errors?: {
            path: string[];
            errors: string[];
        }[];
    };
} = void, Entry extends PropertyKey | undefined | null = null>({ schema, validate, action, entry }: {
    schema: T;
    validate?: (event: {
        data: z.infer<T>;
        throwError: (error: z.ZodError) => void;
        revalidate: () => void;
        success: boolean;
        error?: z.ZodError;
        schema: T;
    }) => boolean;
    action?: (event: Parameters<Action<ActionInput, OutputData>>[0], data: z.infer<T>, formData: FormData) => ReturnType<Action<ActionInput, OutputData>>;
    entry?: Entry;
}): Action<ActionInput, Entry extends PropertyKey ? {
    [H in Entry]: {
        success: boolean;
        data: z.infer<T>;
        actionData?: OutputData;
        errors?: {
            path: string[];
            errors: string[];
        }[];
        status?: number;
    };
} : {
    success: boolean;
    data: z.infer<T>;
    actionData?: OutputData;
    errors?: {
        path: string[];
        errors: string[];
    }[];
    status?: number;
}>;
