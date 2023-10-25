import { fail, type Action, type ActionFailure as ActionFailureType } from "@sveltejs/kit"
import { z } from "zod"

export {default} from "./Form.svelte"
export {default as FormErrorComponent} from "./FormError.svelte"
export * from "./Form.svelte"

export type {ValidateDataEvent, ValidateValueEvent, ValueTransformEvent} from "./Form"

const ActionFailure = fail(Infinity).constructor as typeof ActionFailureType

const primitives = [
    "Number",
    "Array",
    "Boolean",
    "String",
    "BigInt"
] as const
const objectToBe = Symbol("objectToBe")

function getDataPath(data: any, path: readonly string[]) {
    let currentObj = data

    for(let key of path) {
        currentObj = currentObj[key]
    }
    return currentObj
}

function throwError(
    name: string,
    givenPath: string[],
    error: z.ZodError,
    errors: {path: string[], errors: string[]}[]
) {
    const truePath = name.length < 1 ? givenPath : [...givenPath, name]

    let errorIndex = errors.findIndex(
        error =>
            truePath.length === error.path.length
            && error.path.every((key, index) => truePath[index] === key)
    )

    if(errorIndex < 0) {
        errorIndex = errors.length
        errors.push({
            path: truePath,
            errors: []
        })
    }
    errors[errorIndex].errors = error.issues.map(value => value.message)
    return errors
}


async function sanitizeData(data: any) {
    if(data == null) return data
    if(typeof data === "bigint") return data.toString()
    if(typeof data !== "object") return data
    const prevObjects: any[] = []
    const prevIndecies = []
    let currentObject = data;
    while(currentObject != null) {
        if(prevIndecies.length <= prevObjects.length) {
            prevIndecies.push(0)
        }
        let lastElement = prevIndecies.length - 1
        if(Array.isArray(currentObject)) {
            if(prevIndecies[lastElement] >= currentObject.length) {
                currentObject = prevObjects.pop()
                prevIndecies.pop()
                continue
            }
            let currIndex = prevIndecies[lastElement]++
            let newCurrentObject = currentObject[currIndex]
            if(newCurrentObject instanceof File) {
                const fr = new FileReader()
                const url = await new Promise(resolve => {
                    fr.onload = () => resolve(fr.result)
                    fr.readAsDataURL(newCurrentObject)
                })
                currentObject[currIndex] = {
                    url,
                    name: newCurrentObject.name,
                    type: newCurrentObject.type,
                }
                continue
            }
            if(typeof newCurrentObject == "bigint") {
                currentObject[currIndex] = newCurrentObject.toString()
                continue
            }
            if(newCurrentObject == null) {
                delete currentObject[currIndex]
            }
            if(typeof newCurrentObject === "object") {
                prevObjects.push(currentObject)
                prevIndecies.push(0)
                currentObject = newCurrentObject
                continue
            }
            continue
        }
        let currentKeys = Object.keys(currentObject)
        if(prevIndecies[lastElement] >= currentKeys.length) {
            currentObject = prevObjects.pop()
            prevIndecies.pop()
            continue
        }
        let currentKey = currentKeys[prevIndecies[lastElement]++]
        let newCurrentObject = currentObject[currentKey]
        if(newCurrentObject instanceof File) {
            currentObject[currentKey] = {
                text: await newCurrentObject.text(),
                name: newCurrentObject.name,
                type: newCurrentObject.type,
            }
            continue
        }
        if(typeof newCurrentObject == "bigint") {
            currentObject[currentKey] = newCurrentObject.toString()
            continue
        }
        if(newCurrentObject == null) {
            delete currentObject[currentKey]
        }
        if(typeof newCurrentObject === "object") {
            prevObjects.push(currentObject)
            prevIndecies.push(0)
            currentObject = newCurrentObject
            continue
        }
    }
}


function entriesToNestedObject(entries: Iterable<[any, any]>, schema?: z.ZodSchema): any {
    const serialized = Object.fromEntries([...[...entries].reduce((acc, [key, value]) => {
        if(value == null || value === "") return acc
        if(key.includes(".")) {
            const [head, ...tail] = key.split(".")
            if(!acc.has(head)) {
                acc.set(head, {
                    main: [],
                    [objectToBe]: true
                })
            }
            acc.get(head)?.main?.push([tail, value])
            return acc
        }
        if(acc.has(key) && !Array.isArray(acc.get(key))) {
            value = [value]
            value.push(acc.get(key))
            acc.set(key, value)
            if(schema instanceof z.ZodArray) {
                let type = schema._def.type
                if(type instanceof z.ZodType) {
                    value = value.map((ell: any) => {
                        let typeName: 
                            typeof primitives[number]
                            | "Map"
                            | "Set"
                            | "Date" = type._def.typeName.replace("Zod", "")

                        try {
                            if(typeName == "Map") {
                                value = new Map(value)
                            }
                            else if(typeName == "Set") {
                                value = new Set(value)
                            } 
                            else if(typeName == "Date") {
                                value = new Date(value)
                            }
                            else if(primitives.includes(typeName)) {
                                value = globalThis[typeName]?.(value)
                            }
                        } catch {
                        } finally {
                            return ell
                        }
                    })
                }
            }
            return acc
        }
        if(acc.has(key)) {
            if(schema instanceof z.ZodArray) {
                let type = schema._def.type
                if(type instanceof z.ZodType) {
                    let typeName: 
                        typeof primitives[number]
                        | "Map"
                        | "Set"
                        | "Date" = type._def.typeName.replace("Zod", "")
                    try {
                        if(typeName == "Map") {
                            value = new Map(value)
                        }
                        else if(typeName == "Set") {
                            value = new Set(value)
                        } 
                        else if(typeName == "Date") {
                            value = new Date(value)
                        }
                        else if(primitives.includes(typeName)) {
                            value = globalThis[typeName]?.(value)
                        }
                    } catch {
                    }
                }
            }
            acc.get(key)?.push(value)
            return acc
        }
        if(schema instanceof z.ZodObject) {
            let type: unknown = schema?._def.shape()?.[key]
            if(type instanceof z.ZodType) {
                let typeName: 
                    typeof primitives[number]
                    | "Map"
                    | "Set"
                    | "Date" = type._def.typeName.replace("Zod", "")
                try {
                    if(typeName == "Map") {
                        value = new Map(value)
                    }
                    else if(typeName == "Set") {
                        value = new Set(value)
                    } 
                    else if(typeName == "Date") {
                        value = new Date(value)
                    }
                    else if(primitives.includes(typeName)) {
                        value = globalThis[typeName]?.(value)
                    }
                } catch {
                }
            }
        }
        acc.set(key, value)
        return acc
    }, new Map())].map(([key, value]) => {
        if(value[objectToBe]) {
            const integerKey = parseInt(key)
            if(integerKey.toString().length === key.length && !isNaN(integerKey)) {
                return [integerKey, value.main]
            }
            if(schema instanceof z.ZodObject) {
                let shape: unknown = schema._def.shape()[key]
                if(shape instanceof z.ZodType) {
                    return [key, entriesToNestedObject(value.main, shape)]
                }
                if(shape == null) {
                    return [key, entriesToNestedObject(value.main, schema)]
                }
                return [key, value.main]
            }
        }
        return [key, value]
    }))
    if(Object.keys(serialized).every(key => typeof key === "number")) {
        return Object.values(serialized)
    }
    return serialized
}




export const IntlDateTimeFormatter = Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h24",
})
export const DateTimeFormatRegex = /([0-9]+)\/([0-9]+)\/([0=9]+),\s([0-9]+):([0-9]+)/



export function date(date: string | Date) {
    if(date !== "") {
        return IntlDateTimeFormatter.format(new Date(date)).replace(DateTimeFormatRegex, "$3-$1-$2")
    }
    return ""
}
export function datetime(date: string | Date) {
    if(date !== "") {
        return IntlDateTimeFormatter.format(new Date(date)).replace(DateTimeFormatRegex, "$3-$1-$2T$4:$5")
    }
    return ""
}

const formatterMap = {
    $Y: "$3",
    $M: "$1",
    $D: "$2",
    $H: "$4",
    $m: "$5",
}
const formatMapEntries = Object.entries(formatterMap)

export function dateFormat(date: string | Date, format: string) {
    format = formatMapEntries.reduce(
        (format, [replacer, replaced]) => format.replace(new RegExp(replacer, "g"), replaced),
        format
    )
    if(date !== "") {
        return IntlDateTimeFormatter.format(new Date(date)).replace(DateTimeFormatRegex, format)
    }
    return ""
}


export function zodAction<
    T extends z.ZodSchema,
    ActionInput extends Record<string, any>,
    OutputData extends void | {data?: {errors?: {path: string[], errors: string[]}[]}} = void,
    Entry extends PropertyKey | undefined | null = null
>(
    {
        schema,
        validate = () => true,
        action = () => ({} as OutputData),
        entry
    }: {
        schema: T,
        validate?: (event: {
            data: z.infer<T>,
            throwError: (error: z.ZodError) => void,
            revalidate: () => void,
            success: boolean,
            error?: z.ZodError,
            schema: T
        }) => boolean, 
        action?: (
                event: Parameters<Action<ActionInput, OutputData>>[0],
                data: z.infer<T>,
                formData: FormData
        ) => ReturnType<Action<ActionInput, OutputData>>,
        entry?: Entry
    }
): Action<ActionInput, Entry extends PropertyKey ? {
    [H in Entry]: {
        success: boolean,
        data: z.infer<T>,
        actionData?: OutputData,
        errors?: {path: string[], errors: string[]}[],
        status?: number,
    }
} : {
        success: boolean,
        data: z.infer<T>,
        actionData?: OutputData,
        errors?: {path: string[], errors: string[]}[],
        status?: number,
}> {
    return async function (...args: Parameters<Action<z.infer<T>, OutputData>>): Promise<any> {
        const formData = await args[0].request.formData()

        const data = entriesToNestedObject(formData, schema)
        let result = schema.safeParse(data)
        let isValid = validate({
            data,
            ...result,
            revalidate() {
                result = schema.safeParse(data)
            },
            throwError(error) {
                result.success = false
                if(!result.success) result.error = error
            },
            schema
        })
        result.success = isValid && result.success
        if(!result.success) {
            let errors: {path: string[], errors: string[]}[] = []
            
            const errorSet = result.error.issues.reduce(
                ((issueSet, issue) => {
                    const value = getDataPath(data, issue.path as string[])
                    let name = ""

                    if(value != null && typeof value !== 'object') {
                        name = issue.path.pop() as string
                    }

                    const issueIndex = issueSet.findIndex(
                        ({path, name: setName}) =>
                            setName === name
                            && path.length === issue.path.length
                            && path.every(
                                (key, index) => key === issue.path[index]
                            )
                    )

                    if(issueIndex < 0) return [{path: issue.path, issues: [issue], name}]
                    issueSet[issueIndex].issues.push(issue)
                    return issueSet
                }),
            [] as {issues: z.ZodIssue[], path: (string | number)[], name: string}[])

            errorSet.forEach(({path, issues, name}) => {
                throwError(name, path as string[], new z.ZodError(issues), errors)
            })
            await sanitizeData(data)
            if(entry != null) return fail(400, {
                [entry]: {
                    success: false,
                    errors,
                    data
                }
            })
            return fail(400, {
                success: false,
                errors,
                data
            })
        }
        let actionData = await action(args[0], result.data, formData)
        await sanitizeData(actionData)
        await sanitizeData(result.data)
        if(actionData instanceof ActionFailure) {
            if(entry != null) return fail(actionData.status ?? 400, {
                [entry]: {
                    actionData: actionData.data,
                    success: false,
                    errors: actionData.data.errors,
                    data: result.data
                }
            })
            return fail(actionData.status ?? 400, {
                actionData: actionData.data,
                success: false,
                errors: actionData.data.errors,
                data: result.data
            })
        }
        if(entry != null) return {
            [entry]: {
                success: true,
                data: result.data,
                actionData
            }
        }
        return {
            data: result.data,
            actionData,
            success: true
        }
    }
}




