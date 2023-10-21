import { type Action } from "@sveltejs/kit";
import { z } from "zod";
export { default } from "./Form.svelte";
export * from "./Form.svelte";
export type { ValidateDataEvent, ValidateValueEvent, ValueTransformEvent } from "./Form";
export declare function zodAction<T extends z.ZodSchema, ActionInput extends Record<string, any>, OutputData extends void | Record<string, any> = void, Entry extends PropertyKey | undefined | null = null>({ schema, validate, action, entry }: {
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
