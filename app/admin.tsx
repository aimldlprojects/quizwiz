import { useState } from "react"
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useDatabase } from "../hooks/useDatabase"
import { useUsers } from "../hooks/useUsers"

const ADMIN_PASSWORD = "0000"

export default function AdminScreen() {

  const { db, loading: dbLoading } =
    useDatabase()

  const {
    users,
    createUser,
    deleteUser,
    loading
  } = useUsers(db)

  const [password, setPassword] =
    useState("")
  const [name, setName] =
    useState("")
  const [unlocked, setUnlocked] =
    useState(false)
  const [error, setError] =
    useState("")

  if (dbLoading || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading admin tools...
        </Text>
      </SafeAreaView>
    )
  }

  async function handleAddUser() {

    const trimmed = name.trim()

    if (!trimmed) return

    await createUser(trimmed)
    setName("")

  }

  function unlockAdmin() {

    if (password === ADMIN_PASSWORD) {
      setUnlocked(true)
      setError("")
      return
    }

    setError("Password is 0000.")

  }

  if (!unlocked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockCard}>
          <Text style={styles.lockTitle}>
            Admin Access
          </Text>

          <Text style={styles.lockText}>
            Enter the admin password to add
            or delete learner profiles.
          </Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            keyboardType="number-pad"
            secureTextEntry
            style={styles.passwordInput}
          />

          {error ? (
            <Text style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          <Pressable
            style={styles.primaryButton}
            onPress={unlockAdmin}
          >
            <Text style={styles.primaryButtonText}>
              Unlock Admin
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>
        Manage Profiles
      </Text>

      <Text style={styles.subheading}>
        Add new learners or remove old
        profiles from here.
      </Text>

      <View style={styles.addCard}>
        <TextInput
          placeholder="New learner name"
          value={name}
          onChangeText={setName}
          style={styles.nameInput}
        />

        <Pressable
          style={styles.primaryButton}
          onPress={handleAddUser}
        >
          <Text style={styles.primaryButtonText}>
            Add User
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) =>
          String(item.id)
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.userRow}>
            <Text style={styles.userName}>
              {item.name}
            </Text>

            <Pressable
              style={styles.deleteButton}
              onPress={() =>
                deleteUser(item.id)
              }
            >
              <Text style={styles.deleteButtonText}>
                Delete
              </Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  )

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f8fbff",
    padding: 20
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fbff"
  },

  loadingText: {
    fontSize: 18,
    color: "#1e3a5f"
  },

  lockCard: {
    marginTop: 80,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24
  },

  lockTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e3a5f"
  },

  lockText: {
    fontSize: 16,
    color: "#475569",
    marginTop: 10,
    lineHeight: 22
  },

  passwordInput: {
    backgroundColor: "#e0f2fe",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    marginTop: 18
  },

  errorText: {
    color: "#c1121f",
    marginTop: 10,
    fontWeight: "600"
  },

  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1e3a5f"
  },

  subheading: {
    fontSize: 16,
    color: "#475569",
    marginTop: 8,
    lineHeight: 22
  },

  addCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    marginTop: 22
  },

  nameInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    marginBottom: 12
  },

  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center"
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },

  listContent: {
    paddingTop: 20,
    gap: 12
  },

  userRow: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e3a5f"
  },

  deleteButton: {
    backgroundColor: "#ef4444",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10
  },

  deleteButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  }

})
