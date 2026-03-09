import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import { getQuestions } from "../database/queries";

export default function Learn(){

const params=useLocalSearchParams();

const [cards,setCards]=useState<any[]>([]);
const [index,setIndex]=useState(0);
const [showAnswer,setShowAnswer]=useState(false);

useEffect(()=>{
load();
},[]);

async function load(){
const q=await getQuestions(
Number(params.subject),
Number(params.topic),
10
);
setCards(q);
}

if(cards.length===0){
return(
<View style={{flex:1,justifyContent:"center",alignItems:"center"}}>
<Text>No cards available</Text>
</View>
);
}

const card=cards[index];

return(

<View style={{flex:1,padding:20}}>

<Text>{card.question}</Text>

{showAnswer && (
<Text style={{marginTop:20}}>
{card.explanation || "Answer"}
</Text>
)}

<Button
title="Show Answer"
onPress={()=>setShowAnswer(true)}
/>

<Button
title="Next"
onPress={()=>{
setShowAnswer(false);
setIndex(index+1);
}}
/>

</View>

);
}