import { SvelteComponent } from "svelte";
export declare const Value: unique symbol;
import { z, type ZodObject, type ZodRawShape } from 'zod';
import type { ActionReturn } from "svelte/action";
import type { ValidateDataEvent, ValidateValueEvent, ValueTransformEvent } from './Form';
declare class __sveltets_Render<T extends ZodObject<ZodRawShape>> {
    props(): {
        schema: T;
        data?: z.TypeOf<T> | undefined;
        formData?: Partial<z.TypeOf<T>> | null | undefined;
        entry?: PropertyKey | null | undefined;
        realTime?: boolean | undefined;
        errors?: {
            path: string[];
            errors: string[];
        }[] | undefined;
    };
    events(): {} & {
        [evt: string]: CustomEvent<any>;
    };
    slots(): {
        default: {
            validation: (node: HTMLFormElement) => ActionReturn<[], {
                "on:validate-data"?: ValidateDataEvent<T> | undefined;
            }>;
            formInput: (node: HTMLInputElement) => ActionReturn<[], {
                "on:value-transform"?: ValueTransformEvent | undefined;
                "on:validate-value"?: ValidateValueEvent | undefined;
            }>;
            formSection: (node: HTMLElement, name?: string | undefined) => void;
            formSectionContainer: (node: HTMLElement) => void;
            formError: (node: HTMLElement) => void;
            names: z.TypeOf<T> extends infer T_1 ? { [key in keyof T_1]: (z.TypeOf<T>[key] extends string | number | boolean ? {} : z.TypeOf<T>[key] extends infer T_2 ? { [key_1 in keyof T_2]: (z.TypeOf<T>[key][key_1] extends string | number | boolean ? {} : z.TypeOf<T>[key][key_1] extends infer T_3 ? { [key_2 in keyof T_3]: (z.TypeOf<T>[key][key_1][key_2] extends string | number | boolean ? {} : z.TypeOf<T>[key][key_1][key_2] extends infer T_4 ? { [key_3 in keyof T_4]: (z.TypeOf<T>[key][key_1][key_2][key_3] extends string | number | boolean ? {} : z.TypeOf<T>[key][key_1][key_2][key_3] extends infer T_5 ? { [key_4 in keyof T_5]: (z.TypeOf<T>[key][key_1][key_2][key_3][key_4] extends string | number | boolean ? {} : z.TypeOf<T>[key][key_1][key_2][key_3][key_4] extends infer T_6 ? { [key_5 in keyof T_6]: (z.TypeOf<T>[key][key_1][key_2][key_3][key_4][key_5] extends string | number | boolean ? {} : z.TypeOf<T>[key][key_1][key_2][key_3][key_4][key_5] extends infer T_7 ? { [key_6 in keyof T_7]: (z.TypeOf<T>[key][key_1][key_2][key_3][key_4][key_5][key_6] extends string | number | boolean ? {} : z.TypeOf<T>[key][key_1][key_2][key_3][key_4][key_5][key_6] extends infer T_8 ? { [key_7 in keyof T_8]: (z.TypeOf<T>[key][key_1][key_2][key_3][key_4][key_5][key_6][key_7] extends string | number | boolean ? {} : z.TypeOf<T>[key][key_1][key_2][key_3][key_4][key_5][key_6][key_7] extends infer T_9 ? { [key_8 in keyof T_9]: (z.TypeOf<T>[key][key_1][key_2][key_3][key_4][key_5][key_6][key_7][key_8] extends string | number | boolean ? {} : z.TypeOf<T>[key][key_1][key_2][key_3][key_4][key_5][key_6][key_7][key_8] extends infer T_10 ? { [key_9 in keyof T_10]: (z.TypeOf<T>[key][key_1][key_2][key_3][key_4][key_5][key_6][key_7][key_8][key_9] extends string | number | boolean ? {} : z.TypeOf<T>[key][key_1][key_2][key_3][key_4][key_5][key_6][key_7][key_8][key_9] extends infer T_11 ? { [key_10 in keyof T_11]: (z.TypeOf<T>[key][key_1][key_2][key_3][key_4][key_5][key_6][key_7][key_8][key_9][key_10] extends string | number | boolean ? {} : any) & {
                [Value]: string;
            }; } : never) & {
                [Value]: string;
            }; } : never) & {
                [Value]: string;
            }; } : never) & {
                [Value]: string;
            }; } : never) & {
                [Value]: string;
            }; } : never) & {
                [Value]: string;
            }; } : never) & {
                [Value]: string;
            }; } : never) & {
                [Value]: string;
            }; } : never) & {
                [Value]: string;
            }; } : never) & {
                [Value]: string;
            }; } : never) & {
                [Value]: string;
            }; } : never;
        };
        error: {
            error: {
                path: string[];
                errors: string[];
            };
        };
    };
}
export type FormProps<T extends ZodObject<ZodRawShape>> = ReturnType<__sveltets_Render<T>['props']>;
export type FormEvents<T extends ZodObject<ZodRawShape>> = ReturnType<__sveltets_Render<T>['events']>;
export type FormSlots<T extends ZodObject<ZodRawShape>> = ReturnType<__sveltets_Render<T>['slots']>;
export default class Form<T extends ZodObject<ZodRawShape>> extends SvelteComponent<FormProps<T>, FormEvents<T>, FormSlots<T>> {
}
export {};
