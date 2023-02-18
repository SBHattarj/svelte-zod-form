# create-svelte

A zod typed form for svelte.

to install use the bellow command:
```
npm i svelte-zod-form
```

Only one component is exported. The form element is exported as default.

## attributes:
|  Attribute  |                type                  |             Description               |
|-------------|--------------------------------------|---------------------------------------|
|   schema    |`T extends z.ZodObject<z.ZodRawShape>`|zod schema to validate data            |
|    data     |             `z.infer<T>`             |data stored from inputs of form        |
|  realTime   |               `boolean`              |if true validates on input value change|

## slots:
|  Slot   |                             props                                  |                 description                               |
|---------|--------------------------------------------------------------------|-----------------------------------------------------------|
| default | validation, formInput, formSection, formSectionContainer, formError|The main slot form goes here and should be the first child |
|  error  |                             error                                  |For adding custom component for error                      |

## slots props:
### default:
|       Prop         |                                                   description                                                   |
|--------------------|-----------------------------------------------------------------------------------------------------------------|
|    validation      | action to add validation to form adds on:validate-data event                                                    |
|     formInput      | adds on:value-transform and on:validate-value on input, only needed in typescript                               |
|    formSection     | alternative data-form-section, takes a name. adds the data property to make a section of form                   |
|formSectionContainer| alternative for data-form-section-container. dnotes container which includes one form section or input and error|
|     formError      | alternative for data-form-error, placeholder for error, must be a div, error is added in it                     |

### error:
|prop |                                                                                                       description                                                                                               |
|-----|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|error|error messages given by either value or data validation event or error messages given by zod for the path that had the error. messages can be accessed through error.errors and path can be accessed through path|

The event types are exported.

Nested object can be implemented by using the form sections.

All input having same path defined through form sections and same name will be synced if they are a part of schema.

No inputs having path that is not in the schema will not be handled by the form.

More work maybe needed. Help will be appreciated.