<script context="module">
    export const Value = Symbol("Value")
</script>
<script>import { tick } from "svelte";
import J from "jquery";
import { z } from "zod";
export let schema;
export let data = {};
export let realTime = false;
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
let Jinputs = {};
export let errors = [];
let errorContainer = typeof document !== "undefined" ? J("<div></div>") : {};
$: JerrorContainer = typeof document !== "undefined" ? J(errorContainer) : {};
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
        currentObj = currentObj[key];
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
$: (function inputUpdater(inputs, path = []) {
    for (let [key, Jinput] of Object.entries(inputs)) {
        if (typeof Jinput.val !== "function") {
            inputUpdater(getInputPath([...path, key]), [...path, key]);
            continue;
        }
        const value = getDataPath([...path, key]);
        if (value instanceof Date) {
            Jinput[0].valueAsDate = value;
        }
        else {
            Jinput.val(value);
        }
    }
})(Jinputs);
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
    function restrictPath(path, name) {
        const path_local = [...path];
        if (name.length < 1) {
            name = path_local.pop();
        }
        const newPath = path_local.reduce((selecetors, key) => {
            return [
                ...selecetors.map((selector) => `${selector}> [data-form-section=${key}] `),
                ...selecetors.map((selector) => `${selector}*:not([data-form-section]) [data-form-section=${key}] `)
            ];
        }, [""]);
        if (name.length < 1)
            return newPath.join(", ");
        return [
            ...newPath.map((key) => `${key} [data-name=${name}]`),
            ...newPath.map((key) => `${key}*:not([data-form-section]) [data-name=${name}]`)
        ].join(", ");
    }
    function throwError(name, givenPath, error) {
        const truePath = name.length < 1 ? givenPath : [...givenPath, name];
        const elementSelector = restrictPath(givenPath, name);
        const Jelement = Jnode.find(elementSelector);
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
    loopOverZodObject(schema, (name, value, path) => {
        errors = [...errors, { path: [...path, name], errors: [] }];
        const inputSelector = restrictPath(path, name);
        const input = Jnode.find(inputSelector);
        if (input.length > 0) {
            let value2 = input[0].valueAsNumber ?? input[0].valueAsDate ?? input[0].value;
            if (isNaN(value2 ?? NaN)) {
                value2 = null;
            }
            if (typeof value2 === "string" && value2 == "") {
                value2 = null;
            }
            setDataPath([...path, name], value2);
            setInputPath([...path, name], input);
        }
        Jnode.on("input", inputSelector, (e) => {
            Jnode.find(inputSelector).parent("[data-form-section-container]").find("> [data-form-error], *:not([data-form-section]) [data-form-error]").empty();
            let inputValue = e.target.valueAsNumber ?? e.target.valueAsDate ?? e.target.value;
            if (e.target.value == "")
                inputValue = null;
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
                let result = value.safeParse(getDataPath([...path, name]));
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
                            result = schema.safeParse(data2);
                        },
                        value: getDataPath([...path, name]),
                        schema: value,
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
                        const value2 = getDataPath(issue.path);
                        let name2 = "";
                        if (value2 != null && typeof value2 !== "object") {
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
            let result = value.safeParse(getDataPath([...path, name]));
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
                        result = schema.safeParse(data2);
                    },
                    value: getDataPath([...path, name]),
                    schema: value,
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
                    const value2 = getDataPath(issue.path);
                    let name2 = "";
                    if (value2 != null && typeof value2 !== "object") {
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
    return {
        destroy() {
            Jnode.off("input");
            Jnode.off("blur");
        }
    };
}
function formInput(node, name) {
    if (name != null)
        J(node).attr("data-name", name);
    return {};
}
function formSection(node, { name } = {}) {
    if (name)
        J(node).attr("data-form-section", name?.split(".").at(-1));
}
function formSectionContainer(node) {
    J(node).attr("data-form-section-container", "");
}
function formError(node) {
    J(node).attr("data-form-error", "");
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
