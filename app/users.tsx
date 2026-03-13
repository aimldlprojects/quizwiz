import { router } from "expo-router"
import { useState } from "react"
import {
  Button,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"

import { useDatabase } from "../hooks/useDatabase"
import { useUsers } from "../hooks/useUsers"

export default function UsersScreen() {

  const { db } = useDatabase()

  const {
    users,
    activeUser,
    createUser,
    deleteUser,
    selectUser,
    loading
  } = useUsers(db)

  const [name, setName] =
    useState("")

  if (loading) {
    return <Text>Loading...</Text>
  }

  return (

    <View style={{ flex: 1, padding: 20 }}>

      <Text style={{ fontSize: 22 }}>
        User Profiles
      </Text>

      <TextInput
        placeholder="Enter name"
        value={name}
        onChangeText={setName}
        style={{
          borderWidth: 1,
          padding: 10,
          marginTop: 15
        }}
      />

      <Button
        title="Add User"
        onPress={async () => {

          if (!name) return

          await createUser(name)

          setName("")

        }}
      />

      <FlatList
        data={users}
        keyExtractor={(item) =>
          String(item.id)
        }
        style={{ marginTop: 20 }}
        renderItem={({ item }) => (

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 10
            }}
          >

            <TouchableOpacity
              onPress={() => {
                selectUser(item.id)
                router.replace("/learn")
              }}
            >

              <Text
                style={{
                  fontSize: 18,
                  color:
                    activeUser === item.id
                      ? "green"
                      : "black"
                }}
              >
                {item.name}
              </Text>

            </TouchableOpacity>

            <Button
              title="Delete"
              onPress={() =>
                deleteUser(item.id)
              }
            />

          </View>

        )}
      />

    </View>

  )

}
