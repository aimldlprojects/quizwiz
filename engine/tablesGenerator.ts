export function generateTablesQuestions(){

const questions=[];

for(let i=1;i<=20;i++){

for(let j=1;j<=10;j++){

questions.push({
question:`${i} × ${j} = ?`,
answer:i*j,
table:i,
multiplier:j
});

}

}

return questions;

}

export function getRandomTableQuestion(){

const table = Math.floor(Math.random()*20)+1;
const multiplier = Math.floor(Math.random()*10)+1;

return {

id:`table_${table}_${multiplier}`,
question:`${table} × ${multiplier} = ?`,
answer:table*multiplier

};

}