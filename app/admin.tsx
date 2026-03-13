import { useState } from "react"
import {
    Button,
    FlatList,
    Text,
    TextInput,
    View
} from "react-native"

import { useDatabase } from "../hooks/useDatabase"
import { useUsers } from "../hooks/useUsers"

export default function AdminScreen() {

  const { db } = useDatabase()

  const {
    users,
    createUser,
    deleteUser,
    loading
  } = useUsers(db)

  const [name, setName] =
    useState("")

  if (loading) {
    return <Text>Loading...</Text>
  }

  async function handleAddUser() {

    if (!name.trim()) return

    await createUser(name)

    setName("")

  }

  return (

    <View style={{ flex: 1, padding: 20 }}>

      <Text
        style={{
          fontSize: 24,
          fontWeight: "600",
          marginBottom: 20
        }}
      >
        Admin Panel
      </Text>

      {/* Add User */}

      <TextInput
        placeholder="Enter new user name"
        value={name}
        onChangeText={setName}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 10,
          borderRadius: 8,
          marginBottom: 10
        }}
      />

      <Button
        title="Add User"
        onPress={handleAddUser}
      />

      {/* Users List */}

      <Text
        style={{
          fontSize: 20,
          marginTop: 30,
          marginBottom: 10
        }}
      >
        Existing Users
      </Text>

      <FlatList
        data={users}
        keyExtractor={(item) =>
          String(item.id)
        }
        renderItem={({ item }) => (

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderColor: "#eee"
            }}
          >

            <Text style={{ fontSize: 18 }}>
              {item.name}
            </Text>

            <Button
              title="Delete"
              color="red"
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