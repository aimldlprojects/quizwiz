import { Stack } from "expo-router"
import { useEffect } from "react"
import { db } from "../database/db"
import { initDB } from "../database/initDB"
import { seedData } from "../database/seedData"

export default function RootLayout() {

  useEffect(() => {

    const setup = async () => {

      if (!db) return

      await initDB(db)
      await seedData()

    }

    setup()

  }, [])

  return <Stack screenOptions={{ headerShown: false }} />

}