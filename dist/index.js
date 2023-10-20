import { fail } from "@sveltejs/kit";
import { z } from "zod";
// Reexport your entry components here
export { default } from "./Form.svelte";
export * from "./Form.svelte";
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
export function zodAction(schema, validate, action) {
    return async function (...args) {
        const data = entriesToNestedObject(await args[0].request.formData(), schema);
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
            return {
                success: false,
                ...fail(400, data),
                errors
            };
        }
        return {
            data: result.data,
            actionData: await action(args[0], result.data),
            success: true
        };
    };
}
const objectToBe = Symbol("objectToBe");
function entriesToNestedObject(entries, schema) {
    const serialized = Object.fromEntries([...[...entries].reduce((acc, [key, value]) => {
            if (key.includes(".")) {
                const [head, ...tail] = key.split(".");
                if (!acc.has(head))
                    acc.set(head, {
                        main: [],
                        [objectToBe]: true
                    });
                acc.get(head)?.main?.push([tail, value]);
                return acc;
            }
            try {
                // @ts-ignore
                value = globalThis[schema?._def?.shape?.()?.[key]?._def.typeName?.replace("Zod", "")](value);
            }
            catch {
            }
            acc.set(key, value);
            return acc;
        }, new Map())].map(([key, value]) => {
        if (value[objectToBe]) {
            const integerKey = parseInt(key);
            if (integerKey.toString().length === key.length && !isNaN(integerKey)) {
                return [integerKey, value.main];
            }
            // @ts-ignore
            return [key, entriesToNestedObject(value.main, schema?._def?.shape?.()?.[key])];
        }
        return [key, value];
    }));
    if (Object.keys(serialized).every(key => typeof key === "number")) {
        return Object.values(serialized);
    }
    return serialized;
}
