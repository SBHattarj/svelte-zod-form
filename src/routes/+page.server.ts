import { zodAction } from '$lib'
import { fail } from '@sveltejs/kit'
import { z } from 'zod'
import type { Actions } from './$types'
export const actions: Actions = {
    default: zodAction({
        schema: z.object({
            a: z.string(),
            b: z.object({
                c: z.number().min(3).max(10)
            }),
            c: z.string()
        }),
        action: () => {
            return fail(400, {
                errors: [
                    {
                        path: ['a'],
                        errors: ["This is 'a' test error"]
                    }
                ]
            })
        }
    })
}
