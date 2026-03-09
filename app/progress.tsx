import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";

export default function Progress(){

const [topics,setTopics] = useState([]);

useEffect(()=>{
loadProgress();
},[]);

async function loadProgress(){

// later fetch from DB
setTopics([
{name:"Tables",progress:70},
{name:"Algebra",progress:40}
]);

}

return(

<View style={{flex:1,padding:20}}>

<Text style={{fontSize:24,fontWeight:"bold"}}>
Topic Progress
</Text>

<FlatList
data={topics}
keyExtractor={(item)=>item.name}
renderItem={({item})=>(
<View style={{marginTop:20}}>

<Text>{item.name}</Text>

<View style={{
height:10,
backgroundColor:"#ddd",
borderRadius:5
}}>

<View style={{
width:`${item.progress}%`,
height:10,
backgroundColor:"#4CAF50",
borderRadius:5
}}/>

</View>

</View>
)}
/>

</View>

);

}