import { SvelteComponentTyped } from "svelte";
import type { ValidateDataEvent, ValidateValueEvent, ValueTransformEvent } from './Form';
import type { ActionReturn } from "svelte/action";
import { z, type ZodObject, type ZodRawShape } from 'zod';
declare class __sveltets_Render<T extends ZodObject<ZodRawShape>> {
    props(): {
        schema: T;
        data?: z.TypeOf<T> | undefined;
        realTime?: boolean | undefined;
    };
    events(): {} & {
        [evt: string]: CustomEvent<any>;
    };
    slots(): {
        default: {
            validation: (node: HTMLFormElement) => ActionReturn<[], {
                "on:validate-data": ValidateDataEvent<T>;
            }>;
            formInput: (node: HTMLInputElement) => ActionReturn<[], {
                "on:value-transform": ValueTransformEvent;
                "on:validate-value": ValidateValueEvent;
            }>;
            formSection: (node: HTMLElement, { name }?: {
                name?: string | undefined;
            }) => void;
            formSectionContainer: (node: HTMLElement) => void;
            formError: (node: HTMLElement) => void;
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
export default class Form<T extends ZodObject<ZodRawShape>> extends SvelteComponentTyped<FormProps<T>, FormEvents<T>, FormSlots<T>> {
}
export {};
