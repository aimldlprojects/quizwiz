import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getSubjectsWithQuestions, getTopics, getUsers } from "../database/queries";
import { Stack } from "expo-router";
export default function Home() {

  const [users,setUsers]=useState<any[]>([]);
  const [subjects,setSubjects]=useState<any[]>([]);
  const [topics,setTopics]=useState<any[]>([]);

  const [user,setUser]=useState("");
  const [subject,setSubject]=useState("");
  const [topic,setTopic]=useState("");

  const [autoTime,setAutoTime]=useState(5);
  const [tts,setTts]=useState(true);

  useEffect(()=>{
    load();
  },[]);

  async function load(){
    const u=await getUsers();
    const s=await getSubjectsWithQuestions();

    setUsers(u);
    setSubjects(s);

    if(u.length>0) setUser(u[0].id);
  }

  async function loadTopics(id:any){
    const t=await getTopics(id);
    setTopics(t);
  }

  return (

  <View style={styles.container}>

  <Stack.Screen options={{ headerShown: false }} />

  <Text style={styles.title}>QuizWiz</Text>

      {/* USER */}
      <Text style={styles.label}>👤 User</Text>
      <Picker
        selectedValue={user}
        onValueChange={(v)=>setUser(v)}
        style={styles.picker}
      >
        {users.map(u=>(
          <Picker.Item label={u.name} value={u.id} key={u.id}/>
        ))}
      </Picker>

      {/* SUBJECT */}
      <Text style={styles.label}>📘 Subject</Text>
      <Picker
        selectedValue={subject}
        onValueChange={(v)=>{
          setSubject(v);
          loadTopics(v);
        }}
        style={styles.picker}
      >
        {subjects.map(s=>(
          <Picker.Item label={s.name} value={s.id} key={s.id}/>
        ))}
      </Picker>

      {/* TOPIC */}
      <Text style={styles.label}>📖 Topic</Text>
      <Picker
        selectedValue={topic}
        onValueChange={(v)=>setTopic(v)}
        style={styles.picker}
      >
        {topics.map(t=>(
          <Picker.Item label={t.name} value={t.id} key={t.id}/>
        ))}
      </Picker>

      {/* SETTINGS */}
      <Text style={styles.section}>⚙ Settings</Text>

      <Text style={styles.label}>⏱ Auto Next</Text>
      <Picker
        selectedValue={autoTime}
        onValueChange={(v)=>setAutoTime(v)}
        style={styles.picker}
      >
        <Picker.Item label="3 sec" value={3}/>
        <Picker.Item label="5 sec" value={5}/>
        <Picker.Item label="10 sec" value={10}/>
      </Picker>

      <Text style={styles.label}>🔊 Voice</Text>
      <Picker
        selectedValue={tts}
        onValueChange={(v)=>setTts(v)}
        style={styles.picker}
      >
        <Picker.Item label="Enabled" value={true}/>
        <Picker.Item label="Disabled" value={false}/>
      </Picker>

      {/* BUTTONS */}

      <Pressable
        style={[styles.button,{backgroundColor:"#4CAF50"}]}
        onPress={()=>router.push({
          pathname:"/learn",
          params:{subject,topic,user}
        })}
      >
        <MaterialCommunityIcons name="book-open-page-variant" size={22} color="white"/>
        <Text style={styles.buttonText}> Learn Cards</Text>
      </Pressable>

      <Pressable
        style={[styles.button,{backgroundColor:"#2196F3"}]}
        onPress={()=>router.push({
          pathname:"/practice",
          params:{subject,topic,user}
        })}
      >
        <MaterialCommunityIcons name="brain" size={22} color="white"/>
        <Text style={styles.buttonText}> Start Practice</Text>
      </Pressable>

    </View>

  );

}

const styles = StyleSheet.create({

  container:{
    flex:1,
    padding:20,
    backgroundColor:"#f5f5f5"
  },

  title:{
    fontSize:28,
    fontWeight:"bold",
    marginBottom:20,
    textAlign:"center"
  },

  section:{
    marginTop:20,
    fontSize:18,
    fontWeight:"bold"
  },

  label:{
    marginTop:10,
    fontSize:16
  },

  picker:{
    backgroundColor:"white",
    borderRadius:8
  },

  button:{
    flexDirection:"row",
    justifyContent:"center",
    alignItems:"center",
    padding:15,
    borderRadius:10,
    marginTop:15
  },

  buttonText:{
    color:"white",
    fontSize:18,
    marginLeft:10,
    fontWeight:"bold"
  }

});