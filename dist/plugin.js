import { walk, parse } from "svelte/compiler"
export default function formInputAction() {
    return {
        /**
         * @param {{content: string}} options
         */
        markup({content}) {
            /**
             * @type {{value: string, position: number}[]}
             */
            const inputs = []
            // @ts-ignore
            walk(parse(content).html, {
                enter(node) {
                    let value, end;
                    // @ts-ignore
                    if(node.type === "Element" && node.name === "input") {
                        // @ts-ignore
                        node.attributes.forEach(attr => {
                            if(attr?.type === "Attribute" && attr?.name === "name") {
                                if(attr.value[0].type === "Text") {
                                    value = `"${attr.value[0].data.split(".").at(-1)}"`
                                }
                                if(attr.value[0].type === "MustacheTag") {
                                    const expressionEnd = attr.value[0].expression.end
                                    const expressionStart = attr.value[0].expression.start
                                    value = `{${content.slice(expressionStart, expressionEnd)}}`
                                }
                                end = attr.end
                            }
                        })
                    }
                    if(value != null && end != null) inputs.unshift({value, position: end})
                }
            })
            inputs.forEach(({value, position}) => {
                content = `${content.slice(0, position)} data-name=${value}${content.slice(position)
                }`
            })
            
            return { code: content }
        }
    }
}
