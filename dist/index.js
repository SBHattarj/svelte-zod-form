import { fail } from "@sveltejs/kit";
import { z } from "zod";
export { default } from "./Form.svelte";
export { default as FormErrorComponent } from "./FormError.svelte";
export * from "./Form.svelte";
const ActionFailure = fail(Infinity).constructor;
const primitives = [
    "Number",
    "Array",
    "Boolean",
    "String",
    "BigInt"
];
const objectToBe = Symbol("objectToBe");
function getDataPath(data, path) {
    let currentObj = data;
    for (let key of path) {
        currentObj = currentObj[key];
    }
    return currentObj;
}
function throwError(name, givenPath, error, errors) {
    const truePath = name.length < 1 ? givenPath : [...givenPath, name];
    let errorIndex = errors.findIndex(error => truePath.length === error.path.length
        && error.path.every((key, index) => truePath[index] === key));
    if (errorIndex < 0) {
        errorIndex = errors.length;
        errors.push({
            path: truePath,
            errors: []
        });
    }
    errors[errorIndex].errors = error.issues.map(value => value.message);
    return errors;
}
async function sanitizeData(data) {
    if (data == null)
        return data;
    if (typeof data === "bigint")
        return data.toString();
    if (typeof data !== "object")
        return data;
    const prevObjects = [];
    const prevIndecies = [];
    let currentObject = data;
    while (currentObject != null) {
        if (prevIndecies.length <= prevObjects.length) {
            prevIndecies.push(0);
        }
        let lastElement = prevIndecies.length - 1;
        if (Array.isArray(currentObject)) {
            if (prevIndecies[lastElement] >= currentObject.length) {
                currentObject = prevObjects.pop();
                prevIndecies.pop();
                continue;
            }
            let currIndex = prevIndecies[lastElement]++;
            let newCurrentObject = currentObject[currIndex];
            if (newCurrentObject instanceof File) {
                const fr = new FileReader();
                const url = await new Promise(resolve => {
                    fr.onload = () => resolve(fr.result);
                    fr.readAsDataURL(newCurrentObject);
                });
                currentObject[currIndex] = {
                    url,
                    name: newCurrentObject.name,
                    type: newCurrentObject.type,
                };
                continue;
            }
            if (typeof newCurrentObject == "bigint") {
                currentObject[currIndex] = newCurrentObject.toString();
                continue;
            }
            if (newCurrentObject == null) {
                delete currentObject[currIndex];
            }
            if (typeof newCurrentObject === "object") {
                prevObjects.push(currentObject);
                prevIndecies.push(0);
                currentObject = newCurrentObject;
                continue;
            }
            continue;
        }
        let currentKeys = Object.keys(currentObject);
        if (prevIndecies[lastElement] >= currentKeys.length) {
            currentObject = prevObjects.pop();
            prevIndecies.pop();
            continue;
        }
        let currentKey = currentKeys[prevIndecies[lastElement]++];
        let newCurrentObject = currentObject[currentKey];
        if (newCurrentObject instanceof File) {
            currentObject[currentKey] = {
                text: await newCurrentObject.text(),
                name: newCurrentObject.name,
                type: newCurrentObject.type,
            };
            continue;
        }
        if (typeof newCurrentObject == "bigint") {
            currentObject[currentKey] = newCurrentObject.toString();
            continue;
        }
        if (newCurrentObject == null) {
            delete currentObject[currentKey];
        }
        if (typeof newCurrentObject === "object") {
            prevObjects.push(currentObject);
            prevIndecies.push(0);
            currentObject = newCurrentObject;
            continue;
        }
    }
}
function getTypeName(type) {
    if ("innerType" in type._def.innerType) {
        return type._def.innerType._def.typeName;
    }
    return type._def.typeName;
}
function entriesToNestedObject(entries, schema) {
    const serialized = Object.fromEntries([...[...entries].reduce((acc, [key, value]) => {
            if (value == null || value === "")
                return acc;
            if (key.includes(".")) {
                const [head, ...tail] = key.split(".");
                if (!acc.has(head)) {
                    acc.set(head, {
                        main: [],
                        [objectToBe]: true
                    });
                }
                acc.get(head)?.main?.push([tail, value]);
                return acc;
            }
            if (acc.has(key) && !Array.isArray(acc.get(key))) {
                value = [value];
                value.push(acc.get(key));
                acc.set(key, value);
                if (schema instanceof z.ZodArray) {
                    let type = schema._def.type;
                    if (type instanceof z.ZodType) {
                        let a;
                        value = value.map((ell) => {
                            let typeName = getTypeName(type).replace("Zod", "");
                            try {
                                if (typeName == "Map") {
                                    value = new Map(value);
                                }
                                else if (typeName == "Set") {
                                    value = new Set(value);
                                }
                                else if (typeName == "Date") {
                                    value = new Date(value);
                                }
                                else if (primitives.includes(typeName)) {
                                    value = globalThis[typeName]?.(value);
                                }
                            }
                            catch {
                            }
                            finally {
                                return ell;
                            }
                        });
                    }
                }
                return acc;
            }
            if (acc.has(key)) {
                if (schema instanceof z.ZodArray) {
                    let type = schema._def.type;
                    if (type instanceof z.ZodType) {
                        let typeName = getTypeName(type).replace("Zod", "");
                        try {
                            if (typeName == "Map") {
                                value = new Map(value);
                            }
                            else if (typeName == "Set") {
                                value = new Set(value);
                            }
                            else if (typeName == "Date") {
                                value = new Date(value);
                            }
                            else if (primitives.includes(typeName)) {
                                value = globalThis[typeName]?.(value);
                            }
                        }
                        catch {
                        }
                    }
                }
                acc.get(key)?.push(value);
                return acc;
            }
            if (schema instanceof z.ZodObject) {
                let type = schema?._def.shape()?.[key];
                if (type instanceof z.ZodType) {
                    let typeName = getTypeName(type).replace("Zod", "");
                    try {
                        if (typeName == "Map") {
                            value = new Map(value);
                        }
                        else if (typeName == "Set") {
                            value = new Set(value);
                        }
                        else if (typeName == "Date") {
                            value = new Date(value);
                        }
                        else if (primitives.includes(typeName)) {
                            value = globalThis[typeName]?.(value);
                        }
                    }
                    catch {
                    }
                }
            }
            acc.set(key, value);
            return acc;
        }, new Map())].map(([key, value]) => {
        if (value[objectToBe]) {
            const integerKey = parseInt(key);
            if (integerKey.toString().length === key.length && !isNaN(integerKey)) {
                return [integerKey, value.main];
            }
            if (schema instanceof z.ZodObject) {
                let shape = schema._def.shape()[key];
                if (shape instanceof z.ZodType) {
                    return [key, entriesToNestedObject(value.main, shape)];
                }
                if (shape == null) {
                    return [key, entriesToNestedObject(value.main, schema)];
                }
                return [key, value.main];
            }
        }
        return [key, value];
    }));
    if (Object.keys(serialized).every(key => typeof key === "number")) {
        return Object.values(serialized);
    }
    return serialized;
}
export const IntlDateTimeFormatter = Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h24",
});
export const DateTimeFormatRegex = /([0-9]+)\/([0-9]+)\/([0-9]+),\s([0-9]+):([0-9]+)/;
export function date(date) {
    if (date !== "") {
        return IntlDateTimeFormatter.format(new Date(date)).replace(DateTimeFormatRegex, "$3-$1-$2");
    }
    return "";
}
export function datetime(date) {
    if (date !== "") {
        return IntlDateTimeFormatter.format(new Date(date)).replace(DateTimeFormatRegex, "$3-$1-$2T$4:$5");
    }
    return "";
}
const formatterMap = {
    $Y: "$3",
    $M: "$1",
    $D: "$2",
    $H: "$4",
    $m: "$5",
};
const formatMapEntries = Object.entries(formatterMap);
export function dateFormat(date, format) {
    format = formatMapEntries.reduce((format, [replacer, replaced]) => format.replace(new RegExp(replacer, "g"), replaced), format);
    if (date !== "") {
        return IntlDateTimeFormatter.format(new Date(date)).replace(DateTimeFormatRegex, format);
    }
    return "";
}
export function zodAction({ schema, validate = () => true, action = () => ({}), entry }) {
    return async function (...args) {
        const formData = await args[0].request.formData();
        const data = entriesToNestedObject(formData, schema);
        let result = schema.safeParse(data);
        let isValid = validate({
            data,
            ...result,
            revalidate() {
                result = schema.safeParse(data);
            },
            throwError(error) {
                result.success = false;
                if (!result.success)
                    result.error = error;
            },
            schema
        });
        result.success = isValid && result.success;
        if (!result.success) {
            let errors = [];
            const errorSet = result.error.issues.reduce(((issueSet, issue) => {
                const value = getDataPath(data, issue.path);
                let name = "";
                if (value != null && typeof value !== 'object') {
                    name = issue.path.pop();
                }
                const issueIndex = issueSet.findIndex(({ path, name: setName }) => setName === name
                    && path.length === issue.path.length
                    && path.every((key, index) => key === issue.path[index]));
                if (issueIndex < 0)
                    return [{ path: issue.path, issues: [issue], name }];
                issueSet[issueIndex].issues.push(issue);
                return issueSet;
            }), []);
            errorSet.forEach(({ path, issues, name }) => {
                throwError(name, path, new z.ZodError(issues), errors);
            });
            await sanitizeData(data);
            if (entry != null)
                return fail(400, {
                    [entry]: {
                        success: false,
                        errors,
                        data
                    }
                });
            return fail(400, {
                success: false,
                errors,
                data
            });
        }
        let actionData = await action(args[0], result.data, formData);
        await sanitizeData(actionData);
        await sanitizeData(result.data);
        if (actionData instanceof ActionFailure) {
            if (entry != null)
                return fail(actionData.status ?? 400, {
                    [entry]: {
                        actionData: actionData.data,
                        success: false,
                        errors: actionData.data.errors,
                        data: result.data
                    }
                });
            return fail(actionData.status ?? 400, {
                actionData: actionData.data,
                success: false,
                errors: actionData.data.errors,
                data: result.data
            });
        }
        if (entry != null)
            return {
                [entry]: {
                    success: true,
                    data: result.data,
                    actionData
                }
            };
        return {
            data: result.data,
            actionData,
            success: true
        };
    };
}
