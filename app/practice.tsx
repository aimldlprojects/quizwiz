import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import { getQuestions } from "../database/queries";

export default function Practice(){

const params=useLocalSearchParams();

const [questions,setQuestions]=useState<any[]>([]);
const [index,setIndex]=useState(0);

useEffect(()=>{
load();
},[]);

async function load(){
const q=await getQuestions(
Number(params.subject),
Number(params.topic),
10
);
setQuestions(q);
}

if(questions.length===0){
return(
<View style={{flex:1,justifyContent:"center",alignItems:"center"}}>
<Text>No questions</Text>
</View>
);
}

const q=questions[index];

return(

<View style={{flex:1,padding:20}}>

<Text>{q.question}</Text>

<Button
title="Next Question"
onPress={()=>setIndex(index+1)}
/>

</View>

);
}