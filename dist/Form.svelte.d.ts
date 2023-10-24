/// <reference types="jquery" />
/// <reference types="jquery" />
import { SvelteComponent } from "svelte";
import { z, type ZodObject, type ZodRawShape, type ZodTypeAny } from 'zod';
import type { ActionReturn } from "svelte/action";
import type { ValidateDataEvent, ValidateValueEvent, ValueTransformEvent, FormError } from './Form';
export declare const Value: unique symbol;
export declare const Errors: unique symbol;
export declare const Path: unique symbol;
export declare const All: unique symbol;
export declare const HasErrors: unique symbol;
export declare const HasErrorsWithin: unique symbol;
export type namesType<T> = {
    [key in keyof T]: (T[key] extends number | string | boolean ? {} : namesType<T[key]>) & {
        [Value]: string;
    };
};
export type errorsType<T> = (T extends number | string | boolean ? {} : {
    [key in keyof T]: errorsType<T[key]>;
}) & {
    [Path]: string[];
    [Errors]: Set<string>;
    [All]: FormError[];
    [HasErrors]: boolean;
    [HasErrorsWithin]: boolean;
};
export declare function restrictPath(path: readonly (string | number)[], name: string): string;
export declare function setPath(pathGiven: readonly string[], value: any, data: Record<string, any>): Record<string, any>;
export declare function getPath(path: readonly (string | number)[], data: Record<string, any>): any;
export declare function loopOverZodObject<T extends ZodObject<ZodRawShape>>(object: T, cb?: (name: string, value: Readonly<ZodTypeAny>, path: readonly string[]) => void, path?: string[]): void;
export declare function createNamesProxy<T extends ZodObject<ZodRawShape>>(name: string): namesType<z.infer<T>>;
export declare function createErrorProxy<T extends ZodObject<ZodRawShape>>(path: string, errors: FormError[]): errorsType<z.infer<T>>;
export declare function createValuesProxy<T extends Record<any, any>>(data: T, schema: z.ZodSchema): T;
export declare function throwError(name: string, givenPath: readonly (string | number)[], error: z.ZodError, Jnode: JQuery<HTMLFormElement>, allErrors: FormError[]): FormError[];
export declare function dispatchValidateValue(target: HTMLElement, result: {
    success: boolean;
    error?: z.ZodError;
    data?: any;
}, inputSchema: z.ZodSchema, data: unknown, details: {
    value: any;
    path: readonly string[];
    name: string;
}): boolean;
export declare function formInput(_: HTMLInputElement): ActionReturn<[], {
    "on:value-transform"?: ValueTransformEvent;
    "on:validate-value"?: ValidateValueEvent;
}>;
export type FileJson = {
    text: string;
    name: string;
    type: string;
};
export declare function isFileJson(file: unknown): file is FileJson;
import FormErrorComponent from "./FormError.svelte";
declare class __sveltets_Render<T extends ZodObject<ZodRawShape>> {
    props(): {
        schema: T;
        data?: z.TypeOf<T> | undefined;
        formData?: Partial<z.TypeOf<T>> | null | undefined;
        entry?: PropertyKey | null | undefined;
        realTime?: boolean | undefined;
        allErrors?: FormError[] | undefined;
    };
    events(): {} & {
        [evt: string]: CustomEvent<any>;
    };
    slots(): {
        default: {
            validation: (node: HTMLFormElement) => ActionReturn<[], {
                "on:validate-data"?: ValidateDataEvent<T> | undefined;
            }>;
            formInput: typeof formInput;
            names: namesType<z.TypeOf<T>>;
            errors: errorsType<z.TypeOf<T>>;
            FormError: typeof FormErrorComponent;
            values: z.TypeOf<T>;
        };
    };
}
export type FormProps<T extends ZodObject<ZodRawShape>> = ReturnType<__sveltets_Render<T>['props']>;
export type FormEvents<T extends ZodObject<ZodRawShape>> = ReturnType<__sveltets_Render<T>['events']>;
export type FormSlots<T extends ZodObject<ZodRawShape>> = ReturnType<__sveltets_Render<T>['slots']>;
export default class Form<T extends ZodObject<ZodRawShape>> extends SvelteComponent<FormProps<T>, FormEvents<T>, FormSlots<T>> {
}
export {};
