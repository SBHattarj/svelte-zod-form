import { zodAction } from '$lib'
import { z } from 'zod'
import type { Actions } from './$types'
export const actions: Actions = {
    default: zodAction(z.object({a: z.number()}), () => {
        return true
    }, async (event, data) => {
        console.log(data)
    })
}
