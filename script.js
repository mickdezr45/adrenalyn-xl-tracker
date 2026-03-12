let cards=[]
let owned=JSON.parse(localStorage.getItem("owned")||"{}")

fetch("cards.json")
.then(r=>r.json())
.then(data=>{
cards=data
render(cards)
updateStats()
})

function render(list){

let grid=document.getElementById("cardGrid")
grid.innerHTML=""

list.forEach(card=>{

let count=owned[card.id]||0

let div=document.createElement("div")
div.className="card"

if(count>0) div.classList.add("owned")

div.innerHTML=`
<b>#${card.id}</b>
<div>${card.player}</div>
<div>${card.team}</div>
<div class="type">${card.type}</div>
${count>1?`Duplicate x${count-1}`:""}
`

div.onclick=()=>toggle(card.id)

grid.appendChild(div)

})

}

function toggle(id){

owned[id]=(owned[id]||0)+1

if(owned[id]>3) delete owned[id]

save()

}

function save(){

localStorage.setItem("owned",JSON.stringify(owned))
render(cards)
updateStats()

}

function updateStats(){

let ownedCount=Object.values(owned).reduce((a,b)=>a+b,0)

let total=cards.length

let pct=Math.round((ownedCount/total)*100)

document.getElementById("stats").innerText=
`Owned ${ownedCount} / ${total} (${pct}%)`

document.getElementById("progressFill").style.width=pct+"%"

}

document.getElementById("search").addEventListener("input",e=>{

let q=e.target.value.toLowerCase()

let filtered=cards.filter(c=>
c.player.toLowerCase().includes(q)||
c.team.toLowerCase().includes(q)||
c.id.toString().includes(q)
)

render(filtered)

})

function openPack(){

let pack=[]

for(let i=0;i<8;i++){

let card=cards[Math.floor(Math.random()*cards.length)]

pack.push(card)

owned[card.id]=(owned[card.id]||0)+1

}

save()

alert("You opened:\n"+pack.map(c=>c.player).join("\n"))

}

function generateTrade(){

let duplicates=[]
let missing=[]

cards.forEach(c=>{

let count=owned[c.id]||0

if(count>1) duplicates.push(c.id)

if(count==0) missing.push(c.id)

})

document.getElementById("tradeList").innerText=
`Duplicates:\n${duplicates.join(", ")}\n\nNeed:\n${missing.join(", ")}`

}

function shareCollection(){

let list=Object.keys(owned).join(",")

let url=location.origin+location.pathname+"?owned="+list

navigator.clipboard.writeText(url)

alert("Collection link copied!")

}