<script context="module" lang="ts">
    import { z, type ZodObject, type ZodRawShape, type ZodTypeAny } from 'zod';
    import type { ActionReturn } from "svelte/action";
    import J from "jquery"


    import type { 
        ValidateDataEvent,
        ValidateValueEvent,
        ValueTransformEvent,
        FormError,
    } from './Form';



    export const Value = Symbol("Value")
    export const Errors = Symbol("Errors")
    export const Path = Symbol("Path")
    export const All = Symbol("All")
    export const HasErrors = Symbol("HasErrors")
    export const HasErrorsWithin = Symbol("HasErrorsWithin")

    export type namesType<T> = {
        [key in keyof T]: (T[key] extends number | string | boolean ? {} : namesType<T[key]>) & { [Value]: string }
    }

    export type errorsType<T> = (T extends number | string | boolean ? {} : {
        [key in keyof T]: errorsType<T[key]>
    }) & {
        [Path]: string[],
        [Errors]: Set<string>,
        [All]: FormError[],
        [HasErrors]: boolean,
        [HasErrorsWithin]: boolean
    }

    export function restrictPath(path: readonly (string | number)[], name: string) {
        const truePath = name.length < 1 ? path : [...path, name].join(".")
        return `[name="${truePath}"]`
    }

    export function setPath(pathGiven: readonly string[], value: any, data: Record<string, any>) {
        const path = [...pathGiven]
        let currentObj = data
        const name = path.pop()

        for(let key of path) {
            if(currentObj[key] == null) (currentObj as any)[key] = {}
            currentObj = currentObj[key]
        }

        (currentObj as any)[name!] = value
        return data
    }
    export function getPath(path: readonly (string | number)[], data: Record<string, any>): any {
        let currentObj = data

        for(let key of path) {
            currentObj = currentObj?.[key]
        }
        return currentObj
        
    }
    
    export function loopOverZodObject<T extends ZodObject<ZodRawShape>>(
        object: T,
        cb: (name: string, value: Readonly<ZodTypeAny>, path: readonly string[]) => void = () => {},
        path: string[] = []
    ) {
        const shape = object._def.shape()

        for(const [name, value] of Object.entries(shape)) {
            if(value._def?.shape) {
                loopOverZodObject(value as ZodObject<ZodRawShape>, cb, [...path, name])
                continue
            }
            cb(name, value, path)
        }
    }


    export function createNamesProxy<T extends ZodObject<ZodRawShape>>(name: string): namesType<z.infer<T>> {
        return new Proxy(
            new String(name),
            {
                get(target, key) {
                    if(key === Value) {
                        return target.toString()
                    }
                    if(target.toString() == "") {
                        if(typeof key === "string") return createNamesProxy(key)
                    }
                    if(typeof key === "string") return createNamesProxy(`${target}.${key}`)
                }
            }
        ) as any
    }
    export function createErrorProxy<T extends ZodObject<ZodRawShape>>(
        path: string,
        errors: FormError[]
    ): errorsType<z.infer<T>> {
        return new Proxy({path, errors}, {
            get(target, key) {
                if(key === Errors) {
                    return new Set(
                        target.errors.find(({path}) => path.join(".") === target.path)?.errors ?? []
                    )
                }
                if(key === Path) {
                    return target.path.split(".")
                }
                if(key === All) {
                    return target.errors.filter(
                        ({path, errors}) => path.join(".").startsWith(target.path) && errors.length > 0
                    )
                }
                if(key === HasErrors) {
                    const currentError = target.errors.find(({path}) => path.join(".") === target.path)
                    return currentError != null && currentError.errors.length > 0
                }
                if(key === HasErrorsWithin) {
                    return target.errors
                        .filter(
                            ({path, errors}) => path.join(".").startsWith(target.path) && errors.length > 0
                        ).length > 0
                }
                if(typeof key !== "string") return
                if(target.path === "") return createErrorProxy(key, target.errors)
                return createErrorProxy(`${target.path}.${key}`, target.errors)
            }
        }) as any
    }
    export function createValuesProxy<T extends Record<any, any>>(data: T, schema: z.ZodSchema): T {
        return new Proxy(data, {
            get(target, key: string) {
                if(schema instanceof z.ZodObject) {
                    if(schema._def.shape()[key] instanceof z.ZodObject) {
                        return target[key] ?? createValuesProxy(target, schema._def.shape()[key])
                    }
                }
                return target[key] ?? ""
            }
        }) as any
    }

    export function throwError(
        name: string,
        givenPath: readonly (string|number)[],
        error: z.ZodError,
        Jnode: JQuery<HTMLFormElement>,
        allErrors: FormError[]
    ) {
        const truePath = name.length < 1 ? givenPath : [...givenPath, name]
        const elementSelector = restrictPath(givenPath, name)
        const truePathStr = truePath.join(".")


        let Jelement = Jnode.find(elementSelector) as JQuery<HTMLInputElement>


        if(
            Jelement.length > 1 
            && Jelement.has("[type=checkbox], [type=radio]")
        ) {
            const JelementNew = Jelement.not("input")
            if(JelementNew.length > 0) {
                Jelement = JelementNew
            }
        }
        let errorIndex = allErrors.findIndex(
            error =>
                truePathStr === error.path.join(".")
        )

        if(errorIndex < 0) {
            errorIndex = allErrors.length
            allErrors.push({path: truePath, errors: []})
        }
        allErrors[errorIndex].errors = error.issues.map(value => value.message)
        return allErrors
    }



    export function dispatchValidateValue(
        target: HTMLElement,
        result: {success: boolean, error?: z.ZodError, data?: any},
        inputSchema: z.ZodSchema,
        data: unknown,
        details: {
            value: any,
            path: readonly string[],
            name: string
        }
    ) {
        return target.dispatchEvent(new CustomEvent("validate-value", {
            detail: {
                ...details,
                setError(error: z.ZodError) {
                    result.success = false
                    result.error = error
                },
                revalidate() {
                    const newResult = inputSchema.safeParse(data)
                    result.success = newResult.success
                    if(newResult.success) {
                        result.data = newResult.data
                    }
                    if(!newResult.success) {
                        result.error = newResult.error
                    }
                },
                schema: inputSchema,
                ...result
            }
        }))
    }


    export function formInput(_: HTMLInputElement): ActionReturn<[], {
        "on:value-transform"?: ValueTransformEvent,
        "on:validate-value"?: ValidateValueEvent,
    }> {
        return {}
    }

    export type FileJson = {
        text: string;
        name: string;
        type: string;
    }
    export function isFileJson(file: unknown): file is FileJson {
        return typeof file === "object"
            && file != null
            && "text" in file
            && "name" in file
            && "type" in file
            && typeof file.text === "string"
            && typeof file.name === "string"
            && typeof file.type === "string"
    }
</script>

<script lang="ts">

    import { page } from "$app/stores";
    import FormErrorComponent from "./FormError.svelte";



    type T = $$Generic<ZodObject<ZodRawShape>>


    let pageData = $page
    $: pageData = $page


    export let schema: T
    export let data: z.infer<T> = {}
    export let formData: Partial<z.infer<T>> | null = null
    export let entry: PropertyKey | null | undefined = null
    export let realTime: boolean = false
    export let allErrors: FormError[] = entry != null 
        ? pageData.form?.[entry]?.errors ?? [] 
        : pageData.form?.errors ?? []



    $: errors = createErrorProxy<T>("", allErrors)

    const names = createNamesProxy<T>("")
    $: values = createValuesProxy(data, schema)


    let Jinputs: {[key: string]: JQuery<HTMLInputElement> | typeof Jinputs} = {}


    function setAllErrors(errors: FormError[]) {
        allErrors = errors
    }
    function invalidateData(fomrData: Partial<z.infer<T>> | null, pageData: any | null) {
        if(fomrData != null) {
            data = {...fomrData, ...data}
            return
        }
        if(pageData == null) return
        if(entry == null) {
            if(pageData.data == null) return
            data = {...pageData.data, ...data}
            return
        }
        if(pageData[entry]?.data != null) {
            data = {...pageData[entry].data, ...data}
            return
        }
    }
    invalidateData(formData, pageData.form)
    function validation(node: HTMLFormElement): ActionReturn<[], {
        "on:validate-data"?: ValidateDataEvent<T>
    }> {
        const Jnode = J<HTMLFormElement>(node)
        invalidateData(formData, pageData.form)

        Jnode.on("submit", e => {
            let result = schema.safeParse(data)

            const doDefault = node.dispatchEvent(
                new CustomEvent(
                    "validate-data",
                    {
                        detail: {
                            setError(error: z.ZodError) {
                                result.success = false
                                if(!result.success) result.error = error
                            },
                            revalidate(data: z.infer<T>) {
                                result = schema.safeParse(data)
                            },
                            data,
                            schema,
                            ...result,
                        }
                    }
                )
            )

            if(!doDefault) e.preventDefault()

            if(!result.success) {
                e.preventDefault()

                const errorSet = result.error.issues.reduce(
                    ((issueSet, issue) => {
                         const issuePathStr = issue.path.join(".")
                        const value = getPath(issue.path, data)


                        let name = ""


                        if(value != null && typeof value !== 'object') {
                            name = issue.path.pop() as string
                        }
                        const issueIndex = issueSet.findIndex(
                            ({path, name: setName}) =>
                                setName === name
                                && path.join(".") === issuePathStr
                        )

                        if(issueIndex < 0) {
                            issueSet.push({path: issue.path, issues: [issue], name})
                            return issueSet
                        }
                        issueSet[issueIndex].issues.push(issue)
                        return issueSet
                    }),
                [] as {issues: z.ZodIssue[], path: (string | number)[], name: string}[])

                errorSet.forEach(({path, issues, name}) => {
                    allErrors = throwError(
                        name,
                        path,
                        new z.ZodError(issues),
                        Jnode,
                        allErrors
                    )
                })
                return
            }
        })

        const inputSelectors = new Set<string>()

        function getInputTrueValue(target: HTMLInputElement) {
            if(target.type === "checkbox") {
                return J<HTMLInputElement>(`input:checked[name="${target.name}"]`).map((_, input) => {
                    return input.value
                })
            }
            if(target.type === "radio") {
                const value = J<HTMLInputElement>(`input:checked[name="${target.name}"]`)[0].value
                J(`input[name="${target.name}"][value="${value}"]`).prop("checked", true)
                return value
            }
            if(target.type === "file") {
                const files = target.files ?? []
                J.each(Jnode.find<HTMLInputElement>(`input[name="${target.name}"]`), (_, input) => {
                    input.files = target.files
                })
                if(target.multiple) {
                    return [...files]
                }
                return files[0]
            }
            if(target.value === "") return undefined
            if(target.type === "number" && isNaN(target.valueAsNumber)) return undefined
            if(target.type === "number") return target.valueAsNumber
            if(target.type.startsWith("date") && isNaN(target.valueAsNumber)) return undefined
            if(target.type.startsWith("date")) {
                return target.valueAsDate ?? new Date(target.value)
            }
            return target.valueAsDate ?? target.value
        }
        function getInputValue(target: HTMLInputElement) {
            let inputValue = getInputTrueValue(target)
            const eventReturn = target.dispatchEvent(
                new CustomEvent("value-transform", {
                    detail: {
                        setValue(newValue: any) {
                            inputValue = newValue
                        },
                        inputValue
                    }
                })
            )
            return [inputValue, eventReturn]
        }

        loopOverZodObject(schema, (name, inputSchema, path) => {

            const inputSelector = restrictPath(path, name)
            const truePath = [...path, name]
            const truePathStr = truePath.join(".")
            const existingValue = getPath(truePath, data)
            inputSelectors.add(inputSelector)

            allErrors.push({path: truePath, errors: []})
            allErrors = allErrors

            const input = Jnode.find<HTMLInputElement>(inputSelector)
                .filter("input")
                .prop("required", false)

            Jnode.on("input", inputSelector, e => {
                const input = Jnode.find(inputSelector) as JQuery<HTMLInputElement>
                const [ inputValue, eventReturn ] = getInputValue(input[0])

                if(!eventReturn) e.preventDefault()

                setPath(truePath, inputValue, data)
                setPath(truePath, input, Jinputs)

                if(realTime) {
                    let result = inputSchema.safeParse(getPath(truePath, data))

                    if(!result.success) {
                        result.error.issues = result
                            .error
                            .issues
                            .map(issue => ({...issue, path: truePath}))
                    }
                    const doDefault = dispatchValidateValue(
                        e.target,
                        result,
                        inputSchema,
                        data,
                        {
                            value: getPath(truePath, data),
                            path,
                            name
                        }
                    )

                    if(!doDefault) e.preventDefault()

                    if(!result.success) {
                        e.preventDefault()

                        const errorSet = result.error.issues.reduce(
                            ((issueSet, issue) => {
                                const value = getPath(issue.path, data)
                                let name = ""

                                if(value != null && typeof value !== 'object') {
                                    name = issue.path.pop() as string
                                }
                                const issuePathStr = issue.path.join(".")

                                const issueIndex = issueSet
                                    .findIndex(
                                        (({path, name: setName}) =>
                                            setName === name
                                            && path.join(".") === issuePathStr
                                        )
                                    )

                                if(issueIndex < 0)
                                    return [{path: issue.path, issues: [issue], name}]

                                issueSet[issueIndex].issues.push(issue)
                                return issueSet
                            }),
                        [] as {issues: z.ZodIssue[], path: (string | number)[], name: string}[])

                        errorSet.forEach(({path, issues, name}) => {
                            allErrors = throwError(
                                name,
                                path,
                                new z.ZodError(issues),
                                Jnode,
                                allErrors
                            )
                        })
                        return
                    }

                    allErrors.forEach(error => {
                        if(error.path.join(".") === truePathStr) {
                            error.errors.length = 0
                        }
                    })
                    allErrors = allErrors
                }
                allErrors.forEach(error => {
                    error.errors.length = 0
                })
                allErrors = allErrors
            })

            Jnode.on("blur", inputSelector, (e) => {
                if(!e.target.isConnected) {
                    return
                }
                let result = inputSchema.safeParse(getPath(truePath, data))
                const input = Jnode.find<HTMLInputElement>(inputSelector)

                setPath(truePath, input, Jinputs)

                if(!result.success) {
                        result.error.issues = result
                        .error
                        .issues
                        .map(issue => ({...issue, path: truePath}))
                    } 

                const doDefault = dispatchValidateValue(
                    e.target,
                    result,
                    inputSchema,
                    data,
                    {
                        value: getPath(truePath, data),
                        path,
                        name
                    }
                )
                if(!doDefault) e.preventDefault()

                if(!result.success) {
                    e.preventDefault()

                    const errorSet = result.error.issues.reduce(
                        ((issueSet, issue) => {
                            const value = getPath(issue.path, data)
                            let name = ""

                            if(value != null && typeof value !== 'object') {
                                name = issue.path.pop() as string
                            }

                            const issuePathStr = issue.path.join(".")

                            const issueIndex = issueSet
                                .findIndex(
                                    (({path, name: setName}) =>
                                        setName === name
                                        && path.join(".") === issuePathStr
                                    )
                                )

                            if(issueIndex < 0) return [{path: issue.path, issues: [issue], name}]

                            issueSet[issueIndex].issues.push(issue)
                            return issueSet
                        }),
                    [] as {issues: z.ZodIssue[], path: (string | number)[], name: string}[])

                    errorSet.forEach(({path, issues, name}) => {
                        allErrors = throwError(
                            name,
                            path,
                            new z.ZodError(issues),
                            Jnode,
                            allErrors
                        )
                    })
                    return
                }
            })

            allErrors = allErrors.filter(error => error.errors.length > 0)

            setPath(truePath, input, Jinputs)

            if(input.attr("type") == "checkbox") {
                if(existingValue != null && Array.isArray(existingValue)) {
                    const existingValueSelector = existingValue.reduce((acc, value) => {
                        return `${acc}, [value="${value}"]`
                    }, "")
                    input.filter(existingValueSelector).prop("checked", true)
                    setPath(truePath, existingValue, data)
                    return
                } 
                const value = input.filter(":checked").map((_, checkbox) => {
                    return checkbox.value
                })
                setPath(truePath, value, data)
                return
            }
            if(input.attr("type") === "radio") {
                const value = existingValue ?? input.filter(":checked").val()
                setPath(truePath, value, data)
                return
            }
            if(input.attr("type") === "file") {
                let value = existingValue ?? Array.from(input[0].files ?? [])
                if(!Array.isArray(value)) {
                    value = [value]
                }
                const container = new DataTransfer()
                value = value.map((file: unknown) => {
                    if(file instanceof File) {
                        container.items.add(file)
                        return file
                    }
                    if(isFileJson(file)) {
                        const newFile = new File([file.text], file.name, {type: file.type})
                        container.items.add(newFile)
                        return newFile
                    }
                    return
                }).filter((file: unknown) => file != null)
                J.each(input, (_, i) => {
                    i.files = container.files
                })
                if(!input[0].multiple) {
                    setPath(truePath, value[0], data)
                    return
                }
                setPath(truePath, value, data)
                return
            }
            if(input.length > 0) {
                if(input.attr("type") === "number") {
                    const value = existingValue ?? input[0].valueAsNumber
                    if(isNaN(value)) {
                        setPath(truePath, undefined, data)
                        return
                    }
                    setPath(truePath, value, data)
                    return
                }
                if(input[0].value === "") {
                    if(existingValue != null) input.attr("value", existingValue)
                    setPath(truePath, existingValue, data)
                    return
                }
                if(input.attr("type")?.startsWith("date")) {
                    if(isNaN(input[0].valueAsNumber)) {
                        input.val(existingValue)
                        setPath(truePath, existingValue, data)
                    }
                    const value = existingValue ?? input[0].valueAsDate 
                        ?? new Date(input[0].value)
                    input.val(value)

                    setPath(truePath, value, data)
                    return
                }

                const value = existingValue ?? input[0].valueAsDate 
                    ?? input[0].value
                input.val(value)

                setPath(truePath, value, data)
                return
            }

        })

        return {
            destroy() {
                Jnode.off("submit")
                for(let selector of inputSelectors) {
                    Jnode.off("input", selector)
                    Jnode.off("blur", selector)
                }
            }
        }
    }


    $: {
        setAllErrors(entry != null
            ? pageData.form?.[entry]?.errors ?? []
            : pageData.form?.errors ?? [])
    }

    $: (function inputUpdater(inputs: typeof Jinputs, path: readonly string[] = []) {
        for(let [key, Jinput] of Object.entries(inputs)) {
            const truePath = [...path, key]
            if(typeof Jinput.val !== "function") {
                inputUpdater(getPath(truePath, Jinputs), truePath)
                continue
            }
            let JinputNew = Jinput as JQuery<HTMLInputElement>
            if(["checkbox", "radio"].includes(JinputNew.filter("input").attr("type") ?? "")) {
                const value = getPath(truePath, data)
                if(value != null && !Array.isArray(value))
                    JinputNew.filter(`[value="${value}"]`).prop("checked", true)
                if(Array.isArray(value)) value.forEach(v => JinputNew.filter(`[value="${v}"]`).prop("checked", true))
                return
            }
            if(JinputNew.filter("input").attr("type") === "file") {
                let value = getPath(truePath, data) as unknown[]
                if(value == null) return
                const container = new DataTransfer()
                if(!Array.isArray(value)) {
                    value = [value]
                }
                value.forEach((v: unknown) => {
                    if(v instanceof File) {
                        container.items.add(v)

                        return
                    }
                    if(isFileJson(v)) {
                        container.items.add(new File([v.text], v.name, { type: v.type}))
                    }
                    return null
                })
                JinputNew[0].files = container.files
                return
            }

            const value = getPath(truePath, data)
            if(value instanceof Date) {
                if(JinputNew[0].valueAsDate == null) {
                    JinputNew[0].value = value.toString()
                }
                (JinputNew as JQuery<HTMLInputElement>)[0].valueAsDate = value
            } else {
                JinputNew.val(value as any)
            }
        }
    })(Jinputs)

    $: invalidateData(formData, pageData.form)
</script>

<slot {validation} {formInput} {names} {errors} FormError={FormErrorComponent} {values} />
