<script lang="ts">
	import type { ValidateDataEvent, ValidateValueEvent, ValueTransformEvent } from './Form';
    import type { ActionReturn } from "svelte/action";
    import J from "jquery"
	import { z, type ZodObject, type ZodRawShape, type ZodTypeAny } from 'zod';


    type T = $$Generic<ZodObject<ZodRawShape>>
    export let schema: T
    export let data: z.infer<T> = {}

    export let realTime: boolean = false


    let Jinputs: {[key: string]: JQuery<HTMLInputElement> | typeof Jinputs} = {}
    let errors: {path: string[], errors: string[]}[] = []

    let errorContainer = typeof document !== "undefined" ? J("<div></div>") : {}
    $: JerrorContainer = typeof document !== "undefined" ? J(errorContainer) : {} as JQuery<HTMLDivElement>


    function setDataPath(pathGiven: readonly string[], value: any) {
        const path = [...pathGiven]
        let currentObj = data
        const name = path.pop()

        for(let key of path) {
            if(currentObj[key] == null) (currentObj as any)[key] = {}
            currentObj = currentObj[key]
        }

        (currentObj as any)[name!] = value
        data = {...data}
    }
    function getDataPath(path: readonly string[]) {
        let currentObj = data

        for(let key of path) {
            currentObj = currentObj[key]
        }
        return currentObj
    }

    function setInputPath(pathGiven: readonly string[], value: any) {
        const path = [...pathGiven]
        let currentObj = Jinputs
        const name = path.pop()

        for(let key of path) {
            if(currentObj[key] == null) (currentObj as any)[key] = {}
            currentObj = currentObj[key] as any
        }

        currentObj[name!] = value
        Jinputs = {...Jinputs}
    }
    function getInputPath(path: readonly string[]) {
        let currentObj = Jinputs

        for(let key of path) {
            currentObj = currentObj[key] as any
        }
        return currentObj
    }


    $: (function inputUpdater(inputs: typeof Jinputs, path: readonly string[] = []) {
        for(let [key, Jinput] of Object.entries(inputs)) {
            if(typeof Jinput.val !== "function") {
                inputUpdater(getInputPath([...path, key]), [...path, key])
                continue
            }

            const value = getDataPath([...path, key])
            if(value instanceof Date) {
                (Jinput as JQuery<HTMLInputElement>)[0].valueAsDate = value
            } else {
                Jinput.val(value as any)
            }
        }
    })(Jinputs)


    function loopOverZodObject<T extends ZodObject<ZodRawShape>>(
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

    function validation(node: HTMLFormElement): ActionReturn<[], {
        "on:validate-data": ValidateDataEvent<T>
    }> {
        const Jnode = J(node)


        function restrictPath(path: readonly string[], name: string) {
            const newPath = path.reduce((selecetors, key) => {
                return [
                    ...selecetors.map(selector => `${selector}> [data-form-section=${key}] `),
                    ...selecetors.map(selector => `${selector}*:not([data-form-section]) [data-form-section=${key}] `)]
            }, [""])

            if(name.length < 1) return newPath.join(", ")
            return [
                ...newPath.map(key => `${key}> [name=${name}]`),
                ...newPath.map(key => `${key}*:not([data-form-section]) [name=${name}]`)
            ].join(", ")
        }


        function throwError(name: string, givenPath: string[], error: z.ZodError) {
            const truePath = name.length < 1 ? givenPath : [...givenPath, name]

            const Jelement = Jnode.find(restrictPath(givenPath, name)) as JQuery<HTMLInputElement>

            let Jparent = Jelement.parent("[data-form-section-container]")

            if(Jparent.length < 1) {
                Jparent = Jelement.wrap(`<div data-form-section-container></div>`).parent("[data-form-section-container]")
            }

            let errorIndex = errors.findIndex(
                error =>
                    truePath.length === error.path.length
                    && error.path.every((key, index) => truePath[index] === key)
            )

            if(errorIndex < 0) {
                errorIndex = errors.length
                errors = [
                    ...errors,
                    {
                        path: name.length < 1 ? truePath : [...truePath, name],
                        errors: []
                    }
                ]
            }
            errors[errorIndex].errors = error.issues.map(value => value.message)
            errors = [...errors]
            setTimeout(() => {
                if(Jparent.find("[data-form-error]").length < 1) {
                    Jparent.append(`<div data-form-error></div>`)
                }
                Jparent.find("[data-form-error]").html(JerrorContainer.find(`[data-form-error-path=${truePath.join("-")}]`).html())
            })
        }

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
                        const value = getDataPath(issue.path as string[])
                        let name = ""

                        if(value != null && typeof value !== 'object') {
                            name = issue.path.pop() as string
                        }

                        const issueIndex = issueSet.findIndex(
                            ({path, name: setName}) =>
                                setName === name
                                && path.length === issue.path.length
                                && path.every((key, index) => key === issue.path[index])
                        )

                        if(issueIndex < 0) return [{path: issue.path, issues: [issue], name}]
                        issueSet[issueIndex].issues.push(issue)
                        return issueSet
                    }),
                [] as {issues: z.ZodIssue[], path: (string | number)[], name: string}[])

                errorSet.forEach(({path, issues, name}) => {
                    throwError(name, path as string[], new z.ZodError(issues))
                })
                return
            }
        })

        loopOverZodObject(schema, (name, value, path) => {
            errors = [...errors, {path: [...path, name], errors: []}]

            const inputSelector = restrictPath(path, name)
            const input = Jnode.find(inputSelector) as JQuery<HTMLInputElement>

            if(input.length > 0) {
                setDataPath(
                    [...path, name],
                    input[0].valueAsNumber ?? input[0].valueAsDate ?? input[0].value
                )
                setInputPath([...path, name], input)
            }
            Jnode.on("input", inputSelector, e => {
                Jnode.find(inputSelector)
                    .parent("[data-form-section-container]")
                    .find("> [data-form-error], *:not([data-form-section]) [data-form-error]")
                    .empty()

                let inputValue = e.target.valueAsNumber ?? e.target.valueAsDate ?? e.target.value
                if(!(e.target as HTMLInputElement).dispatchEvent(
                    new CustomEvent(
                        "value-transform", {
                                detail: {
                                    setValue(newValue: any) {
                                    inputValue = newValue
                                },
                                inputValue
                            }
                        }
                    )
                )) e.preventDefault()

                setDataPath([...path, name], inputValue)
                const input = Jnode.find(inputSelector) as JQuery<HTMLInputElement>
                setInputPath([...path, name], input)



                if(realTime) {
                    let result = value.safeParse(getDataPath([...path, name]))

                    if(!result.success) {
                        result.error.issues = result
                            .error
                            .issues
                            .map(issue => ({...issue, path: [...path, name]}))
                    }
                    const doDefault = (e.target as HTMLInputElement).dispatchEvent(
                        new CustomEvent(
                            "validate-value",
                            {
                                detail: {
                                    setError(error: z.ZodError) {
                                        result.success = false
                                        if(!result.success) result.error = error
                                    },
                                    revalidate(data: z.infer<T>) {
                                        result = schema.safeParse(data)
                                    },
                                    value: getDataPath([...path, name]),
                                    schema: value,
                                    path,
                                    name,
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
                                const value = getDataPath(issue.path as string[])
                                let name = ""

                                if(value != null && typeof value !== 'object') {
                                    name = issue.path.pop() as string
                                }

                                const issueIndex = issueSet
                                    .findIndex(
                                        (({path, name: setName}) =>
                                            setName === name
                                            && path.length === issue.path.length
                                            && path.every((key, index) => key === issue.path[index])
                                        )
                                    )

                                if(issueIndex < 0)
                                    return [{path: issue.path, issues: [issue], name}]

                                issueSet[issueIndex].issues.push(issue)
                                return issueSet
                            }),
                        [] as {issues: z.ZodIssue[], path: (string | number)[], name: string}[])

                        errorSet.forEach(({path, issues, name}) => {
                            throwError(name, path as string[], new z.ZodError(issues))
                        })
                        return
                    }

                    const errorInTree = errors.filter(
                        error => error.path.every((key, index) => [...path, name][index] === key)
                    )
                    errorInTree.forEach(error => {
                        error.errors = []
                    })
                    errors = [...errors]

                    return
                }
            })
            Jnode.on("blur", inputSelector, e => {
                let result = value.safeParse(getDataPath([...path, name]))
                const input = Jnode.find(inputSelector) as JQuery<HTMLInputElement>

                setInputPath([...path, name], input)

                if(!result.success) result.error.issues = result
                    .error
                    .issues
                    .map(issue => ({...issue, path: [...path, name]}))
                const doDefault = (e.target as HTMLInputElement).dispatchEvent(
                    new CustomEvent(
                        "validate-value",
                        {
                            detail: {
                                setError(error: z.ZodError) {
                                    result.success = false
                                    if(!result.success) result.error = error
                                },
                                revalidate(data: z.infer<typeof value>) {
                                    result = schema.safeParse(data)
                                },
                                value: getDataPath([...path, name]),
                                schema: value,
                                path,
                                name,
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
                            const value = getDataPath(issue.path as string[])
                            let name = ""

                            if(value != null && typeof value !== 'object') {
                                name = issue.path.pop() as string
                            }

                            const issueIndex = issueSet
                                .findIndex(
                                    (({path, name: setName}) =>
                                        setName === name
                                        && path.length === issue.path.length
                                        && path.every((key, index) => key === issue.path[index])
                                    )
                                )

                            if(issueIndex < 0) return [{path: issue.path, issues: [issue], name}]

                            issueSet[issueIndex].issues.push(issue)
                            return issueSet
                        }),
                    [] as {issues: z.ZodIssue[], path: (string | number)[], name: string}[])

                    errorSet.forEach(({path, issues, name}) => {
                        throwError(name, path as string[], new z.ZodError(issues))
                    })
                    return
                }
            })
        })
        return {}
    }

    function formInput(node: HTMLInputElement): ActionReturn<[], {
        "on:value-transform": ValueTransformEvent,
        "on:validate-value": ValidateValueEvent,
    }> {
        return {}
    }
    function formSection(node: HTMLElement, {name}: {name?: string} = {}) {
        if(name) J(node).attr("data-form-section", name)
    }
    function formSectionContainer(node: HTMLElement) {
        J(node).attr("data-form-section-container", "")
    }
    function formError(node: HTMLElement) {
        J(node).attr("data-form-error", "")
    }
</script>

<slot {validation} {formInput} {formSection} {formSectionContainer} {formError} />
<div style:display="none" bind:this={errorContainer}>

    {#each errors as error (error.path.join("-"))}
        <div data-form-error-path={error.path.join("-")} data-form-error>
            <slot name="error" error={error}>
                <div>
                    {#each error.errors as message}
                        <p>{message}</p>
                    {/each}
                </div>
            </slot>
        </div>
    {/each}
</div>