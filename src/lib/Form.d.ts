import {z} from "zod";
export type ValueTransformEvent = (e: CustomEvent<{
    setValue(newValue: any): void,
    inputValue: string | number | Date
}>) => void

export type ValidateValueEvent = (e: CustomEvent<{
    setValue(newValue: any): void,
    inputValue: string | number | Date
}>) => void

export type ValidateDataEvent<T extends z.ZodObject<z.ZodRawShape>> = (e: CustomEvent<{
    setError(error: z.ZodError): void,
    revalidate(data: z.infer<T>): void,
    data: z.infer<T>
    schema: T,
} & (
    {
        success: boolean
    } | {
        success: false,
        error: z.SafeParseError<T>
    }
)>) => void
export type FormError = {path: readonly (string | number)[], errors: string[]}
