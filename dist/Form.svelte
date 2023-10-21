<script context="module">
    export const Value = Symbol("Value")
</script>

<script>import { z } from "zod";
import { page } from "$app/stores";
import { tick } from "svelte";
import J from "jquery";
export let schema;
export let data = {};
export let formData = null;
export let entry = null;
export let realTime = false;
export let errors = entry != null ? $page.form?.[entry]?.errors ?? [] : $page.form?.errors ?? [];
function createNamesProxy(name) {
    return new Proxy(new String(name), {
        get(target, key) {
            if (key === Value) {
                return target.toString();
            }
            if (target.toString() == "") {
                if (typeof key === "string")
                    return createNamesProxy(key);
            }
            if (typeof key === "string")
                return createNamesProxy(`${target}.${key}`);
        }
    });
}
const names = createNamesProxy("");
let errorContainer = typeof document !== "undefined" ? J("<div></div>") : {};
$: JerrorContainer = typeof document !== "undefined" ? J(errorContainer) : {};
let Jinputs = {};
function setDataPath(pathGiven, value) {
    const path = [...pathGiven];
    let currentObj = data;
    const name = path.pop();
    for (let key of path) {
        if (currentObj[key] == null)
            currentObj[key] = {};
        currentObj = currentObj[key];
    }
    currentObj[name] = value;
    data = { ...data };
}
function getDataPath(path) {
    let currentObj = data;
    for (let key of path) {
        currentObj = currentObj?.[key];
    }
    return currentObj;
}
function setInputPath(pathGiven, value) {
    const path = [...pathGiven];
    let currentObj = Jinputs;
    const name = path.pop();
    for (let key of path) {
        if (currentObj[key] == null)
            currentObj[key] = {};
        currentObj = currentObj[key];
    }
    currentObj[name] = value;
    Jinputs = { ...Jinputs };
}
function getInputPath(path) {
    let currentObj = Jinputs;
    for (let key of path) {
        currentObj = currentObj[key];
    }
    return currentObj;
}
function loopOverZodObject(object, cb = () => {
}, path = []) {
    const shape = object._def.shape();
    for (const [name, value] of Object.entries(shape)) {
        if (value._def?.shape) {
            loopOverZodObject(value, cb, [...path, name]);
            continue;
        }
        cb(name, value, path);
    }
}
function validation(node) {
    const Jnode = J(node);
    function restrictPath(path, name) {
        const path_local = [...path];
        if (name.length < 1) {
            name = path_local.pop();
        }
        const truePath = [...path_local, name].join(".");
        return `[data-form-section="${truePath}"], [name="${truePath}"]`;
    }
    function throwError(name, givenPath, error) {
        const truePath = name.length < 1 ? givenPath : [...givenPath, name];
        const elementSelector = restrictPath(givenPath, name);
        let Jelement = Jnode.find(elementSelector);
        if (Jelement.length > 1 && Jelement.has("[type=checkbox], [type=radio]")) {
            const JelementNew = Jelement.not("input");
            if (JelementNew.length > 0) {
                Jelement = JelementNew;
            }
        }
        let Jparent = Jelement.parent("[data-form-section-container]");
        if (Jparent.length < 1) {
            Jparent = Jelement.wrap(`<div data-form-section-container></div>`).parent("[data-form-section-container]");
        }
        let errorIndex = errors.findIndex((error2) => truePath.length === error2.path.length && error2.path.every((key, index) => truePath[index] === key));
        if (errorIndex < 0) {
            errorIndex = errors.length;
            errors = [
                ...errors,
                {
                    path: truePath,
                    errors: []
                }
            ];
        }
        errors[errorIndex].errors = error.issues.map((value) => value.message);
        errors = [...errors];
        tick().then(() => {
            if (Jparent.find("[data-form-error]").length < 1) {
                Jparent.append(`<div data-form-error></div>`);
            }
            Jparent.find("[data-form-error]").html(JerrorContainer.find(`[data-form-error-path=${truePath.join("-")}]`).html());
        });
    }
    Jnode.on("submit", (e) => {
        let result = schema.safeParse(data);
        const doDefault = node.dispatchEvent(new CustomEvent("validate-data", {
            detail: {
                setError(error) {
                    result.success = false;
                    if (!result.success)
                        result.error = error;
                },
                revalidate(data2) {
                    result = schema.safeParse(data2);
                },
                data,
                schema,
                ...result
            }
        }));
        if (!doDefault)
            e.preventDefault();
        if (!result.success) {
            e.preventDefault();
            const errorSet = result.error.issues.reduce((issueSet, issue) => {
                const value = getDataPath(issue.path);
                let name = "";
                if (value != null && typeof value !== "object") {
                    name = issue.path.pop();
                }
                const issueIndex = issueSet.findIndex(({ path, name: setName }) => setName === name && path.length === issue.path.length && path.every((key, index) => key === issue.path[index]));
                if (issueIndex < 0)
                    return [{ path: issue.path, issues: [issue], name }];
                issueSet[issueIndex].issues.push(issue);
                return issueSet;
            }, []);
            errorSet.forEach(({ path, issues, name }) => {
                throwError(name, path, new z.ZodError(issues));
            });
            return;
        }
    });
    loopOverZodObject(schema, (name, inputSchema, path) => {
        errors = [...errors, { path: [...path, name], errors: [] }];
        const inputSelector = restrictPath(path, name);
        const truePath = [...path, name];
        let input = Jnode.find(inputSelector);
        const existingValue = getDataPath([...path, name]);
        let prevSection = input;
        let currentSection = input.parents(`[data-form-section="${path.join(".")}"]`);
        for (let i = 0; i < path.length; i++) {
            if (currentSection.length < 1) {
                prevSection.wrap(`<div data-form-section="${truePath.slice(0, i + 1).join(".")}"></div>`);
                currentSection = prevSection.parents(`[data-form-section="${truePath.slice(0, i + 1).join(".")}"]`);
            }
            prevSection = currentSection;
            currentSection = currentSection.parent(`[data-form-section="${truePath.slice(0, i).join(".")}"]`);
        }
        const JparentSectionContainer = input.parent("[data-form-section-container]");
        if (JparentSectionContainer.length < 1) {
            input.wrap(`<div data-form-section-container></div>`);
        }
        input = input.filter("input").prop("required", false);
        if (input.attr("type") == "checkbox") {
            const value = [];
            if (existingValue != null) {
                J.each(input, (index, checkbox) => {
                    checkbox.checked = existingValue.includes(checkbox.value);
                });
                value.push(...Array.isArray(existingValue) ? existingValue : []);
            }
            else {
                J.each(input, (index, checkbox) => {
                    if (checkbox.checked) {
                        value.push(checkbox.value);
                    }
                });
            }
            setDataPath([...path, name], value);
            setInputPath([...path, name], input);
        }
        else if (input.attr("type") === "radio") {
            const value = existingValue ?? input.filter(":checked").val();
            setDataPath([...path, name], value);
            setInputPath([...path, name], input);
        }
        else if (input.length > 0) {
            let value = existingValue ?? input[0].valueAsNumber ?? input[0].valueAsDate ?? input[0].value;
            if (isNaN(value ?? NaN)) {
                value = void 0;
            }
            if (typeof value === "string" && value == "") {
                value = void 0;
            }
            setDataPath([...path, name], value);
            setInputPath([...path, name], input);
        }
        Jnode.on("input", inputSelector, (e) => {
            Jnode.find(inputSelector).parent("[data-form-section-container]").find("> [data-form-error], *:not([data-form-section]) [data-form-error]").empty();
            let inputValue = e.target.valueAsNumber ?? e.target.valueAsDate ?? e.target.value;
            if (e.target.value == "" || isNaN(e.target.value))
                inputValue = void 0;
            if (e.target.type == "checkbox") {
                inputValue = [];
                J(`[name="${e.target.name}"]`).each((_, checkbox) => {
                    if (checkbox instanceof HTMLInputElement) {
                        if (checkbox.checked) {
                            inputValue.push(checkbox.value);
                        }
                    }
                });
            }
            if (e.target.type == "radio") {
                J(`[name="${e.target.name}"]`).each((_, radio) => {
                    if (radio instanceof HTMLInputElement) {
                        if (radio.checked) {
                            inputValue = radio.value;
                        }
                    }
                });
            }
            if (!e.target.dispatchEvent(new CustomEvent("value-transform", {
                detail: {
                    setValue(newValue) {
                        inputValue = newValue;
                    },
                    inputValue
                }
            })))
                e.preventDefault();
            setDataPath([...path, name], inputValue);
            const input2 = Jnode.find(inputSelector);
            setInputPath([...path, name], input2);
            if (realTime) {
                let result = inputSchema.safeParse(getDataPath([...path, name]));
                if (!result.success) {
                    result.error.issues = result.error.issues.map((issue) => ({ ...issue, path: [...path, name] }));
                }
                const doDefault = e.target.dispatchEvent(new CustomEvent("validate-value", {
                    detail: {
                        setError(error) {
                            result.success = false;
                            if (!result.success)
                                result.error = error;
                        },
                        revalidate(data2) {
                            result = inputSchema.safeParse(data2);
                        },
                        value: getDataPath([...path, name]),
                        schema: inputSchema,
                        path,
                        name,
                        ...result
                    }
                }));
                if (!doDefault)
                    e.preventDefault();
                if (!result.success) {
                    e.preventDefault();
                    const errorSet = result.error.issues.reduce((issueSet, issue) => {
                        const value = getDataPath(issue.path);
                        let name2 = "";
                        if (value != null && typeof value !== "object") {
                            name2 = issue.path.pop();
                        }
                        const issueIndex = issueSet.findIndex(({ path: path2, name: setName }) => setName === name2 && path2.length === issue.path.length && path2.every((key, index) => key === issue.path[index]));
                        if (issueIndex < 0)
                            return [{ path: issue.path, issues: [issue], name: name2 }];
                        issueSet[issueIndex].issues.push(issue);
                        return issueSet;
                    }, []);
                    errorSet.forEach(({ path: path2, issues, name: name2 }) => {
                        throwError(name2, path2, new z.ZodError(issues));
                    });
                    return;
                }
                const errorInTree = errors.filter((error) => error.path.every((key, index) => [...path, name][index] === key));
                errorInTree.forEach((error) => {
                    error.errors = [];
                });
                errors = [...errors];
                return;
            }
        });
        Jnode.on("blur", inputSelector, (e) => {
            if (!e.target.isConnected) {
                return;
            }
            let result = inputSchema.safeParse(getDataPath([...path, name]));
            const input2 = Jnode.find(inputSelector);
            setInputPath([...path, name], input2);
            if (!result.success)
                result.error.issues = result.error.issues.map((issue) => ({ ...issue, path: [...path, name] }));
            const doDefault = e.target.dispatchEvent(new CustomEvent("validate-value", {
                detail: {
                    setError(error) {
                        result.success = false;
                        if (!result.success)
                            result.error = error;
                    },
                    revalidate(data2) {
                        result = inputSchema.safeParse(data2);
                    },
                    value: getDataPath([...path, name]),
                    schema: inputSchema,
                    path,
                    name,
                    ...result
                }
            }));
            if (!doDefault)
                e.preventDefault();
            if (!result.success) {
                e.preventDefault();
                const errorSet = result.error.issues.reduce((issueSet, issue) => {
                    const value = getDataPath(issue.path);
                    let name2 = "";
                    if (value != null && typeof value !== "object") {
                        name2 = issue.path.pop();
                    }
                    const issueIndex = issueSet.findIndex(({ path: path2, name: setName }) => setName === name2 && path2.length === issue.path.length && path2.every((key, index) => key === issue.path[index]));
                    if (issueIndex < 0)
                        return [{ path: issue.path, issues: [issue], name: name2 }];
                    issueSet[issueIndex].issues.push(issue);
                    return issueSet;
                }, []);
                errorSet.forEach(({ path: path2, issues, name: name2 }) => {
                    throwError(name2, path2, new z.ZodError(issues));
                });
                return;
            }
        });
        errors = errors.filter((error) => error.errors.length > 0);
    });
    tick().then(() => {
        errors.forEach(({ path }) => {
            let name = path.pop();
            const Jelement = Jnode.find(restrictPath(path, name ?? ""));
            path.push(name);
            let Jparent = Jelement.parent("[data-form-section-container]");
            if (Jparent.length < 1) {
                Jparent = Jelement.wrap(`<div data-form-section-container></div>`).parent("[data-form-section-container]");
            }
            if (Jparent.find("[data-form-error]").length < 1) {
                Jparent.append(`<div data-form-error></div>`);
            }
            Jparent.find("[data-form-error]").html(JerrorContainer.find(`[data-form-error-path=${path.join("-")}]`).html());
        });
    });
    return {
        destroy() {
            Jnode.off("input");
            Jnode.off("blur");
        }
    };
}
function formInput(node) {
    return {};
}
function formSection(node, name) {
    if (name)
        J(node).attr("data-form-section", name);
}
function formSectionContainer(node) {
    J(node).attr("data-form-section-container", "");
}
function formError(node) {
    J(node).attr("data-form-error", "");
}
$: {
    errors = entry != null ? $page.form?.[entry]?.errors ?? [] : $page.form?.errors ?? [];
}
$: (function inputUpdater(inputs, path = []) {
    for (let [key, Jinput] of Object.entries(inputs)) {
        if (typeof Jinput.val !== "function") {
            inputUpdater(getInputPath([...path, key]), [...path, key]);
            continue;
        }
        let JinputNew = Jinput;
        if (["checkbox", "radio"].includes(JinputNew.filter("input").attr("type") ?? "")) {
            const value2 = getDataPath([...path, key]);
            if (value2 != null)
                JinputNew.filter(`[value="${value2}"]`).prop("checked", true);
            return;
        }
        const value = getDataPath([...path, key]);
        if (value instanceof Date) {
            JinputNew[0].valueAsDate = value;
        }
        else {
            JinputNew.val(value);
        }
    }
})(Jinputs);
$: {
    if (formData != null) {
        data = { ...formData, ...data };
    }
    else if (entry != null) {
        if ($page.form?.data?.[entry] != null) {
            data = { ...$page.form[entry], ...data };
        }
    }
    else if ($page.form?.data != null) {
        data = { ...$page.form.data, ...data };
    }
}
</script>

<slot {validation} {formInput} {formSection} {formSectionContainer} {formError} {names} />
<div style:display="none" bind:this={errorContainer}>

    {#each errors as error}
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
