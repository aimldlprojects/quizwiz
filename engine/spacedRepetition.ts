export function updateSpacedRepetition(progress,difficulty){

let ease = progress.ease_factor || 2.5;
let interval = progress.interval || 1;

if(difficulty==="easy"){

interval = interval * 2;
ease += 0.15;

}

if(difficulty==="medium"){

interval = interval * ease;

}

if(difficulty==="hard"){

interval = 1;
ease -= 0.2;

}

const nextReview = Date.now() + interval * 86400000;

return {
ease_factor:ease,
interval:Math.round(interval),
next_review:nextReview
};

}