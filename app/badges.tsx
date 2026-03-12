import { useEffect, useState } from "react"
import {
    FlatList,
    Text,
    View
} from "react-native"

import { BadgeController } from "../controllers/badgeController"
import { useDatabase } from "../hooks/useDatabase"

export default function BadgesScreen() {

  const { db } = useDatabase()

  const [badges, setBadges] =
    useState<any[]>([])

  useEffect(() => {

    const load = async () => {

      if (!db) return

      const controller =
        new BadgeController(db)

      const result =
        await db.getAllAsync(
          `
          SELECT *
          FROM user_badges
          WHERE user_id = ?
          `,
          [1]
        )

      setBadges(result)

    }

    load()

  }, [db])

  return (

    <View
      style={{
        flex: 1,
        padding: 20
      }}
    >

      <Text
        style={{
          fontSize: 24,
          marginBottom: 20
        }}
      >
        Achievements
      </Text>

      <FlatList
        data={badges}
        keyExtractor={(item) =>
          item.id
        }
        renderItem={({ item }) => (

          <View
            style={{
              padding: 15,
              marginBottom: 10,
              backgroundColor: "#eee",
              borderRadius: 8
            }}
          >

            <Text
              style={{
                fontSize: 18
              }}
            >
              {item.title}
            </Text>

            <Text
              style={{
                color: "#666"
              }}
            >
              {item.description}
            </Text>

          </View>

        )}
      />

    </View>

  )

}