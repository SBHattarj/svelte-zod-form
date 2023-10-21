import { fail } from "@sveltejs/kit";
import { z } from "zod";
export { default } from "./Form.svelte";
export * from "./Form.svelte";
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
            if (entry != null)
                return {
                    [entry]: {
                        success: false,
                        ...fail(400, data),
                        errors
                    }
                };
            return {
                success: false,
                ...fail(400, data),
                errors
            };
        }
        let actionData = await action(args[0], result.data, formData);
        if (actionData != null && actionData.success != null && !actionData.success) {
            if (entry != null)
                return {
                    [entry]: actionData
                };
            return actionData;
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
function entriesToNestedObject(entries, schema) {
    const serialized = Object.fromEntries([...[...entries].reduce((acc, [key, value]) => {
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
                        value = value.map((ell) => {
                            let typeName = type._def.typeName.replace("Zod", "");
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
                        let typeName = type._def.typeName.replace("Zod", "");
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
                    let typeName = type._def.typeName.replace("Zod", "");
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
