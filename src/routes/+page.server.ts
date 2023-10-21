import { zodAction } from '$lib'
import { z } from 'zod'
import type { Actions } from './$types'
export const actions: Actions = {
    default: zodAction({
        schema: z.object({
            a: z.number(),
            b: z.object({
                c: z.number().min(3).max(10)
            }),
            c: z.string()
        }),
    })
}
