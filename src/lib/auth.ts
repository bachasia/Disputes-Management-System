import { authOptions } from "@/lib/auth/config"
import { getServerSession } from "next-auth/next"

export const getServerAuthSession = () => getServerSession(authOptions)

