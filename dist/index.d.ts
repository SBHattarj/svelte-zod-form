import { type Action } from "@sveltejs/kit";
import { z } from "zod";
export { default } from "./Form.svelte";
export * from "./Form.svelte";
export type { ValidateDataEvent, ValidateValueEvent, ValueTransformEvent } from "./Form";
export declare function zodAction<T extends z.ZodSchema, ActionInput extends Record<string, any>, OutputData extends void | Record<string, any>>(schema: T, validate: (event: {
    data: z.infer<T>;
    throwError: (error: z.ZodError) => void;
    revalidate: () => void;
    success: boolean;
    error?: z.ZodError;
    schema: T;
}) => boolean, action: (event: Parameters<Action<ActionInput, OutputData>>[0], data: z.infer<T>) => ReturnType<Action<ActionInput, OutputData>>): Action<ActionInput, {
    success: boolean;
    data: z.infer<T>;
    actionData?: OutputData;
    errors?: {
        path: string[];
        errors: string[];
    }[];
    status?: number;
}>;
