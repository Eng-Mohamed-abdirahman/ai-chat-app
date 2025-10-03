"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"


export const signup = async (email: string, password: string,name: string) => {

    const user = await auth.api.signUpEmail({
        body: { email, password, name }
    })

    return user
  
}

export const signin = async (email: string, password: string) => {

    const user = await auth.api.signInEmail({
        body: { email, password }
    })

}

export const getUserInfo = async () => {

    const user = await auth.api.getSession({
        headers: await headers()
    })
    return user 
}