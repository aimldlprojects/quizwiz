import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getSubjectsWithQuestions, getTopics, getUsers } from "../database/queries";

export default function Home() {

  const [users, setUsers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  const [user, setUser] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedTopicName, setSelectedTopicName] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {

  const u = await getUsers();
  const s = await getSubjectsWithQuestions();

  setUsers(u);
  setSubjects(s);

  if (u.length > 0) setUser(u[0].id);

}

  async function loadTopics(id) {

    const t = await getTopics(id);
    setTopics(t);

}

  return (

  <View style={styles.container}>

    <Stack.Screen options={{ headerShown: false }} />

    <Text style={styles.title}>QuizWiz</Text>

    <Text style={styles.label}>User</Text>

    <Picker
      mode="dropdown"
      selectedValue={user}
      onValueChange={(v) => setUser(v)}
      style={styles.picker}
    >
      {users.map(u => (
        <Picker.Item label={u.name} value={u.id} key={u.id} />
      ))}
    </Picker>

    <Text style={styles.label}>Subject</Text>

    <Picker
      mode="dropdown"
      selectedValue={subject}
      onValueChange={(v) => {
        setSubject(v);
        loadTopics(v);
      }}
      style={styles.picker}
    >
      {subjects.map(s => (
        <Picker.Item label={s.name} value={s.id} key={s.id} />
      ))}
    </Picker>

    <Text style={styles.label}>Topic</Text>

    <Picker
      mode="dropdown"
      selectedValue={topic}
      onValueChange={(v) => {
        setTopic(v);
        const t = topics.find(x => x.id === v);
        if (t) setSelectedTopicName(t.name);
      }}
      style={styles.picker}
    >
      {topics.map(t => (
        <Picker.Item label={t.name} value={t.id} key={t.id} />
      ))}
    </Picker>

    <Pressable
      style={[styles.button, { backgroundColor: "#4CAF50" }]}
      disabled={!topic}
      onPress={() => router.push({
        pathname: "/learn",
  params: { user, subject, topic, topicName: selectedTopicName }
})}
    >

      <MaterialCommunityIcons name="book-open-page-variant" size={22} color="white" />
      <Text style={styles.buttonText}> Learn Cards</Text>

    </Pressable>

    <Pressable
      style={[styles.button, { backgroundColor: "#2196F3" }]}
      disabled={!topic}
      onPress={() => router.push({
        pathname: "/practice",
  params: { user, subject, topic, topicName: selectedTopicName }
})}
    >

      <MaterialCommunityIcons name="brain" size={22} color="white" />
      <Text style={styles.buttonText}> Start Practice</Text>

    </Pressable>

  </View>

);

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5"
  },

  title: {
  fontSize: 26,
  fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20
  },

  label: {
    marginTop: 10,
    fontSize: 16
  },

  picker: {
    backgroundColor: "white"
  },

  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  padding: 12,
  borderRadius: 10,
    marginTop: 12
  },

  buttonText: {
    color: "white",
    fontSize: 18,
    marginLeft: 10,
    fontWeight: "bold"
  }

});