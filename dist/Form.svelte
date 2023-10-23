<script context="module">import { z } from "zod";
import J from "jquery";
export const Value = Symbol("Value");
export const Errors = Symbol("Errors");
export const Path = Symbol("Path");
export const All = Symbol("All");
export const HasErrors = Symbol("HasErrors");
export const HasErrorsWithin = Symbol("HasErrorsWithin");
export function restrictPath(path, name) {
    const truePath = name.length < 1 ? path : [...path, name].join(".");
    return `[name="${truePath}"]`;
}
export function setPath(pathGiven, value, data) {
    const path = [...pathGiven];
    let currentObj = data;
    const name = path.pop();
    for (let key of path) {
        if (currentObj[key] == null)
            currentObj[key] = {};
        currentObj = currentObj[key];
    }
    currentObj[name] = value;
    return data;
}
export function getPath(path, data) {
    let currentObj = data;
    for (let key of path) {
        currentObj = currentObj?.[key];
    }
    return currentObj;
}
export function loopOverZodObject(object, cb = () => {
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
export function createNamesProxy(name) {
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
export function createErrorProxy(path, errors) {
    return new Proxy({ path, errors }, {
        get(target, key) {
            if (key === Errors) {
                return new Set(target.errors.find(({ path: path2 }) => path2.join(".") === target.path)?.errors ?? []);
            }
            if (key === Path) {
                return target.path.split(".");
            }
            if (key === All) {
                return target.errors.filter(({ path: path2, errors: errors2 }) => path2.join(".").startsWith(target.path) && errors2.length > 0);
            }
            if (key === HasErrors) {
                const currentError = target.errors.find(({ path: path2 }) => path2.join(".") === target.path);
                return currentError != null && currentError.errors.length > 0;
            }
            if (key === HasErrorsWithin) {
                return target.errors.filter(({ path: path2, errors: errors2 }) => path2.join(".").startsWith(target.path) && errors2.length > 0).length > 0;
            }
            if (typeof key !== "string")
                return;
            if (target.path === "")
                return createErrorProxy(key, target.errors);
            return createErrorProxy(`${target.path}.${key}`, target.errors);
        }
    });
}
export function createValuesProxy(data, schema) {
    return new Proxy(data, {
        get(target, key) {
            if (schema instanceof z.ZodObject) {
                if (schema._def.shape()[key] instanceof z.ZodObject) {
                    return target[key] ?? createValuesProxy(target, schema._def.shape()[key]);
                }
            }
            return target[key] ?? "";
        }
    });
}
export function throwError(name, givenPath, error, Jnode, allErrors) {
    const truePath = name.length < 1 ? givenPath : [...givenPath, name];
    const elementSelector = restrictPath(givenPath, name);
    const truePathStr = truePath.join(".");
    let Jelement = Jnode.find(elementSelector);
    if (Jelement.length > 1 && Jelement.has("[type=checkbox], [type=radio]")) {
        const JelementNew = Jelement.not("input");
        if (JelementNew.length > 0) {
            Jelement = JelementNew;
        }
    }
    let errorIndex = allErrors.findIndex((error2) => truePathStr === error2.path.join("."));
    if (errorIndex < 0) {
        errorIndex = allErrors.length;
        allErrors.push({ path: truePath, errors: [] });
    }
    allErrors[errorIndex].errors = error.issues.map((value) => value.message);
    return allErrors;
}
export function dispatchValidateValue(target, result, inputSchema, data, details) {
    return target.dispatchEvent(new CustomEvent("validate-value", {
        detail: {
            ...details,
            setError(error) {
                result.success = false;
                result.error = error;
            },
            revalidate() {
                const newResult = inputSchema.safeParse(data);
                result.success = newResult.success;
                if (newResult.success) {
                    result.data = newResult.data;
                }
                if (!newResult.success) {
                    result.error = newResult.error;
                }
            },
            schema: inputSchema,
            ...result
        }
    }));
}
export function formInput(_) {
    return {};
}
</script>

<script>import { page } from "$app/stores";
import FormErrorComponent from "./FormError.svelte";
export let schema;
export let data = {};
export let formData = null;
export let entry = null;
export let realTime = false;
export let allErrors = entry != null ? $page.form?.[entry]?.errors ?? [] : $page.form?.errors ?? [];
$: errors = createErrorProxy("", allErrors);
const names = createNamesProxy("");
$: values = createValuesProxy(data, schema);
let Jinputs = {};
function setAllErrors(errors2) {
    allErrors = errors2;
}
function invalidateData(fomrData, pageData) {
    if (fomrData != null) {
        data = { ...fomrData, ...data };
        return;
    }
    if (pageData == null)
        return;
    if (entry == null) {
        if (pageData.data == null)
            return;
        data = { ...pageData.data, ...data };
        return;
    }
    if (pageData[entry]?.data != null) {
        data = { ...pageData[entry].data, ...data };
        return;
    }
}
invalidateData(formData, $page.form);
function validation(node) {
    const Jnode = J(node);
    invalidateData(formData, $page.form);
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
                const issuePathStr = issue.path.join(".");
                const value = getPath(issue.path, data);
                let name = "";
                if (value != null && typeof value !== "object") {
                    name = issue.path.pop();
                }
                const issueIndex = issueSet.findIndex(({ path, name: setName }) => setName === name && path.join(".") === issuePathStr);
                if (issueIndex < 0) {
                    issueSet.push({ path: issue.path, issues: [issue], name });
                    return issueSet;
                }
                issueSet[issueIndex].issues.push(issue);
                return issueSet;
            }, []);
            errorSet.forEach(({ path, issues, name }) => {
                allErrors = throwError(name, path, new z.ZodError(issues), Jnode, allErrors);
            });
            return;
        }
    });
    const inputSelectors = /* @__PURE__ */ new Set();
    function getInputTrueValue(target) {
        if (target.type === "checkbox") {
            return J(`input:checked[name="${target.name}"]`).map((_, input) => {
                return input.value;
            });
        }
        if (target.type === "radio") {
            const value = J(`input:checked[name="${target.name}"]`)[0].value;
            J(`input[name="${target.name}"][value="${value}"]`).prop("checked", true);
            return value;
        }
        if (target.value === "")
            return void 0;
        if (target.type === "number" && isNaN(target.valueAsNumber))
            return void 0;
        if (target.type === "number")
            return target.valueAsNumber;
        return target.valueAsDate ?? target.value;
    }
    function getInputValue(target) {
        let inputValue = getInputTrueValue(target);
        const eventReturn = target.dispatchEvent(new CustomEvent("value-transform", {
            detail: {
                setValue(newValue) {
                    inputValue = newValue;
                },
                inputValue
            }
        }));
        return [inputValue, eventReturn];
    }
    loopOverZodObject(schema, (name, inputSchema, path) => {
        const inputSelector = restrictPath(path, name);
        const truePath = [...path, name];
        const truePathStr = truePath.join(".");
        const existingValue = getPath(truePath, data);
        inputSelectors.add(inputSelector);
        allErrors.push({ path: truePath, errors: [] });
        allErrors = allErrors;
        const input = Jnode.find(inputSelector).filter("input").prop("required", false);
        Jnode.on("input", inputSelector, (e) => {
            const input2 = Jnode.find(inputSelector);
            const [inputValue, eventReturn] = getInputValue(input2[0]);
            if (!eventReturn)
                e.preventDefault();
            setPath(truePath, inputValue, data);
            setPath(truePath, input2, Jinputs);
            if (realTime) {
                let result = inputSchema.safeParse(getPath(truePath, data));
                if (!result.success) {
                    result.error.issues = result.error.issues.map((issue) => ({ ...issue, path: truePath }));
                }
                const doDefault = dispatchValidateValue(e.target, result, inputSchema, data, {
                    value: getPath(truePath, data),
                    path,
                    name
                });
                if (!doDefault)
                    e.preventDefault();
                if (!result.success) {
                    e.preventDefault();
                    const errorSet = result.error.issues.reduce((issueSet, issue) => {
                        const value = getPath(issue.path, data);
                        let name2 = "";
                        if (value != null && typeof value !== "object") {
                            name2 = issue.path.pop();
                        }
                        const issuePathStr = issue.path.join(".");
                        const issueIndex = issueSet.findIndex(({ path: path2, name: setName }) => setName === name2 && path2.join(".") === issuePathStr);
                        if (issueIndex < 0)
                            return [{ path: issue.path, issues: [issue], name: name2 }];
                        issueSet[issueIndex].issues.push(issue);
                        return issueSet;
                    }, []);
                    errorSet.forEach(({ path: path2, issues, name: name2 }) => {
                        allErrors = throwError(name2, path2, new z.ZodError(issues), Jnode, allErrors);
                    });
                    return;
                }
                allErrors.forEach((error) => {
                    if (error.path.join(".") === truePathStr) {
                        error.errors.length = 0;
                    }
                });
                allErrors = allErrors;
            }
            allErrors.forEach((error) => {
                error.errors.length = 0;
            });
            allErrors = allErrors;
        });
        Jnode.on("blur", inputSelector, (e) => {
            if (!e.target.isConnected) {
                return;
            }
            let result = inputSchema.safeParse(getPath(truePath, data));
            const input2 = Jnode.find(inputSelector);
            setPath(truePath, input2, Jinputs);
            if (!result.success) {
                result.error.issues = result.error.issues.map((issue) => ({ ...issue, path: truePath }));
            }
            const doDefault = dispatchValidateValue(e.target, result, inputSchema, data, {
                value: getPath(truePath, data),
                path,
                name
            });
            if (!doDefault)
                e.preventDefault();
            if (!result.success) {
                e.preventDefault();
                const errorSet = result.error.issues.reduce((issueSet, issue) => {
                    const value = getPath(issue.path, data);
                    let name2 = "";
                    if (value != null && typeof value !== "object") {
                        name2 = issue.path.pop();
                    }
                    const issuePathStr = issue.path.join(".");
                    const issueIndex = issueSet.findIndex(({ path: path2, name: setName }) => setName === name2 && path2.join(".") === issuePathStr);
                    if (issueIndex < 0)
                        return [{ path: issue.path, issues: [issue], name: name2 }];
                    issueSet[issueIndex].issues.push(issue);
                    return issueSet;
                }, []);
                errorSet.forEach(({ path: path2, issues, name: name2 }) => {
                    allErrors = throwError(name2, path2, new z.ZodError(issues), Jnode, allErrors);
                });
                return;
            }
        });
        allErrors = allErrors.filter((error) => error.errors.length > 0);
        setPath(truePath, input, Jinputs);
        if (input.attr("type") == "checkbox") {
            if (existingValue != null && Array.isArray(existingValue)) {
                const existingValueSelector = existingValue.reduce((acc, value2) => {
                    return `${acc}, [value="${value2}"]`;
                }, "");
                input.filter(existingValueSelector).prop("checked", true);
                setPath(truePath, existingValue, data);
                return;
            }
            const value = input.filter(":checked").map((_, checkbox) => {
                return checkbox.value;
            });
            setPath(truePath, value, data);
            return;
        }
        if (input.attr("type") === "radio") {
            const value = existingValue ?? input.filter(":checked").val();
            setPath(truePath, value, data);
            return;
        }
        if (input.length > 0) {
            if (existingValue != null) {
                input.val(existingValue);
                setPath(truePath, existingValue, data);
                return;
            }
            if (input.attr("type") === "number") {
                const value2 = existingValue ?? input[0].valueAsNumber;
                if (isNaN(value2)) {
                    setPath(truePath, void 0, data);
                    return;
                }
                setPath(truePath, value2, data);
            }
            const value = existingValue ?? input[0].valueAsDate ?? input[0].value;
            setPath(truePath, value, data);
            return;
        }
    });
    return {
        destroy() {
            Jnode.off("submit");
            for (let selector of inputSelectors) {
                Jnode.off("input", selector);
                Jnode.off("blur", selector);
            }
        }
    };
}
$: {
    setAllErrors(entry != null ? $page.form?.[entry]?.errors ?? [] : $page.form?.errors ?? []);
}
$: (function inputUpdater(inputs, path = []) {
    for (let [key, Jinput] of Object.entries(inputs)) {
        const truePath = [...path, key];
        if (typeof Jinput.val !== "function") {
            inputUpdater(getPath(truePath, Jinputs), truePath);
            continue;
        }
        let JinputNew = Jinput;
        if (["checkbox", "radio"].includes(JinputNew.filter("input").attr("type") ?? "")) {
            const value2 = getPath(truePath, data);
            if (value2 != null)
                JinputNew.filter(`[value="${value2}"]`).prop("checked", true);
            return;
        }
        const value = getPath(truePath, data);
        if (value instanceof Date) {
            JinputNew[0].valueAsDate = value;
        }
        else {
            JinputNew.val(value);
        }
    }
})(Jinputs);
$: invalidateData(formData, $page.form);
</script>

<slot {validation} {formInput} {names} {errors} FormError={FormErrorComponent} {values} />
