# svelte-zod-form

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
| default | validation, formInput, formSection, formSectionContainer, formError, names|The main slot form goes here and should be the first child |
|  error  |                             error                                  |For adding custom component for error                      |

## slots props:
### default:
|       Prop         |                                                   description                                                   |
|--------------------|-----------------------------------------------------------------------------------------------------------------|
|     names          | names of all the input has the same structure as the infered object from zod. Must be used as the name for each input to allow it work over ssr and to be able to progresively enhance the form
|    validation      | action to add validation to form adds on:validate-data event                                                    |
|     formInput      | adds on:value-transform and on:validate-value on input, only needed in typescript                               |
|    formSection     | takes a name. adds a transformed data-form-section property to make a section of form `names[...path][Value]` is to be used as the name, without it using `names[...props][Value] will have undefined variable, you will have to use a string having the prop name of that section. eg for a property at `b.c.d` you'll normally have the value `"d"` in the property data-form-seciton, but with this you can use "names[...props][Value]                   |
|formSectionContainer| alternative for data-form-section-container. denotes container which includes one form section or input and error|
|     formError      | alternative for data-form-error, placeholder for error, must be a div, error is added in it                     |

### error:
|prop |                                                                                                       description                                                                                               |
|-----|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|error|error messages given by either value or data validation event or error messages given by zod for the path that had the error. messages can be accessed through error.errors and path can be accessed through path|


There exists other exports other than the form element. The Value symbol is exported to be used with the names variable.

A plugin is provided through the /plugin path. This is now neccesary as it adds one necesarry data attribute to all inputs automatically. This makes it easier to work with with respect to ts and progresively enhancing and using form actions. it's a function that takes no argument and returns a plugin. It's the default export.

The event types are exported.

Nested object can be implemented by using the form sections.

All input having same path defined through form sections and same name will be synced if they are a part of schema.

No inputs having path that is not in the schema will be handled by the form.

More work maybe needed. Help will be appreciated.

Also it seems the animation added on the error slot persists even when it is showed in the form, which is interesting as I am copying over only the html.
