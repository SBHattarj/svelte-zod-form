# svelte-zod-form

A Zod based type safe form for sveltekit. It works with progresive enhancements, and gives you full control over your own form. This works by making a proper structure reflecting that of the actual data structure to be used. It uses data properties under the hood to achieve this. And the Form ellements handles all the data management. It also takes the form data automatically from the page store automatically. If needed it also gives the option to manually handle the same.

This can be installed as follows

```sh
npm install svelte-zod-form
```

It exports one Form component and one zodAction function. The form components uses the slot arguments to give neccesarry data and actions to allow a good developer experience. You can choose to not use these, but that will mean you wont get the full ts support that this library aims to provide.

The API is as follows:

## Exports

|-------------------------|------------------------------------------------|-------------------------------------------|
| name                    | type                                           | description                               |
|-------------------------|------------------------------------------------|-------------------------------------------|
| form                    | Form                                    | The form wrapper element. It has the logic to handle the form data, validate the form data and even renedering the errors. This provides named slots for customising how the error should look. It is to be noted that errors show up along side the input elements, and if you don't explicitly wrap the input in the proper wrapper they are automatically wraped.  |
| zodAction               | `function zodAction<T extends z.ZodSchema, ActionInput extends Record<string, any>, OutputData extends void | Record<string, any> = void, Entry extends PropertyKey | undefined | null = null>(options: { schema: T, validate?: (event: { data: z.infer<T>, throwError: (error: z.ZodError) => void, revalidate: () => void, success: boolean, error?: z.ZodError, schema: T }) => boolean, action?: (event: Parameters<Action<ActionInput, OutputData>>[0], data: z.infer<T>, formData: FormData ) => ReturnType<Action<ActionInput, OutputData>>, entry?: Entry }): Action<ActionInput, Entry extends PropertyKey ? { [H in Entry]: { success: boolean, data: z.infer<T>, actionData?: OutputData, errors?: {path: string[], errors: string[]}[], status?: number}} : {success: boolean, data: z.infer<T>, actionData?: OutputData, errors?: {path: string[], errors: string[]}[], status?: number, }>` | As could be seen it's type is fairly complicated. But worry not it is very easy to use, and this types helps you a lot when it comes to debugging. The serial argument is the main reason for the complexity, as if it is not defined, I can assume that there will be only one form. But when it exists there maybe different forms to be handled. And so I had to take this approach so as to give a very intuitive type to the developer using this library. It will be explained further later |
| Value                   | `Symbol`                            | Symbol to access the string value of `names` |
| Errors                  | `Symbol`                | Symbol to access the array of error message strings from `errors` |
| Path                    | `Symbol`         | Symbol to access the path of the error as array of strings from `errors` |
| HasErrors               | `Symbol`     | Symbol to check if there exists some errors in the current field of `errors` |
| HasErrorsWithin | `Symbol` | Symbol to check if there exists some errors in the current field or fields under the current field |
| All      | `Symbol`     | Symbol to access all errors under a field, as array of `{path: string[], errors: string[]}` |

## Form
## properties

|==============================|----------------------------------------------|-----------------------------------------|
| name                         | type                                         | description                             |
|------------------------------|----------------------------------------------|-----------------------------------------|
| schema                       | `T: z.ZodSchema`             | The schema to be used for the validation of the form.      |
| data                         | `z.infer<T>`                                 | The data stored in the form. This will be object that has the same signature as you zod schema. It should be bound to a variable if something is to be done with it's value |
| formData                     | `Partial<FormData> | null | void`                          | The form data to be used as returned by the form action from the server. This should be null or undefined if entry is given |
| entry                       | `PropertyKey | null | undefined`                           | The same as the serial argument for the zodAction. If given it automatically chooses to use the form data sent by form action having same entry as this. This should be undefined if formData is defined. formData takes priority over this property, so if formData is not null or undefined that will be used instead. |
| realTime                    | `boolean`                                      | If true, it validates the input values on each `"input"` events. This in general should be set to false. It's false by default. |

## slot properties
### `names`
This is a proxy, it is typed as having the same shape as the zod schema, accept all of it's keys has the key `[Value]` which is a string, and it doesn't hold the actual values of the fields. This is meant to allow you to name your inputs in a typed manner. If not using this names are to be wirtten how you wold actually access that field. For example if the schema has a value at `schem.a.b.c` then the value of name of the input will be `"a.b.c"`. The names proxy only makes it easier for typescript as you write `{names.a.b.c[Value]}`.

### errors
This is a proxy for the errors stored in the Form element. This should be used to conditionally display errors. The symbol for this is already discussed and properly explained.

### `values`
This is a proxy for the values of the fields. This one may or may not use for allowing the form data sent from the server to fill the values, the values are already properly updated if js is enabled but to allow this to work even when js is disabled you must use this to fill there values. This maybe avoided if your site can't work without js by default.

### `FormError`

This is a component to make the error handling easier. As of right now this will be recomended not be used as it doesn't add much convienience, but if you like to have it rather than a if block you are free to use it. It basically is a if block that checks the error's HasErrors property, and renders based on that. This won't be documented further. It is also exported as `FormErrorComponent` by the library. Let me know if this is useful and should be documented, if you ever use it.

### `validation`
This is an action that is to be added to the form. This stops the form from submitting when there is a type error. And without this the `Form` component can't access any of the data of the form. This is a irreplacable action, that must be used. It also adds the event `validate-data`. This event is added after the schema is done with the data. This allows you to either throw error bassed on some condition that can't be added to zod, or even reformat the value and revalidate, to pass a failing result.

### `formInput`

This is an optional action, to be added to input. This is only for typescript. The validation action on the form also adds a few events for inputs also for similar purpose, although this may not be as good as the one in the form. This should only be used, if you want to use the evnets on the inputs.

## `zodAction`

This is the function it transforms the formdata coming from the client to appropriate data, as dictated by the zod schema. It takes the schema, a validate function where you can request revaidate or throw error, depending on some condition. If you return false the action stops there. otherwise if the result is a success and the validate funciton returns true, then your provided action is ran. This action gets some aditional arguments other than the acual event from the svlte. It gets the parsed complete data from zod. It also gets the formdata that was provided in the request. Your returned value is stored in the formAction attribute of the return. If you return success to be false, it is considered to be a failed form response, and the result is returned as is.

Hope this will be helpful for some of you. Thanks for using this library, and do report any bug that you might encounter while using.
