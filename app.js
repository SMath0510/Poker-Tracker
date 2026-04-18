const { createClient } = supabase;

const supabaseClient = createClient(
  "https://bsbvghacbfwwtmvabbxi.supabase.co",
  "sb_publishable_F1550nUALJYXnzk1GwPFzw_W_2aN26G"
);

// ---------- UI ----------
function showSection(id){
  document.querySelectorAll(".section").forEach(s=>s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

// ---------- USERS ----------
async function loadUsers(){
  const { data } = await supabaseClient.from("users").select("*");

  const ids = ["userTx","txUser","profitUser","fromUser","toUser"];
  ids.forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.innerHTML="";
    data.forEach(u=>{
      const opt=document.createElement("option");
      opt.value=u.id;
      opt.text=u.username;
      el.appendChild(opt);
    });
  });

  const list=document.getElementById("userList");
  list.innerHTML="";
  data.forEach(u=>{
    const li=document.createElement("li");
    li.innerText=u.username;
    list.appendChild(li);
  });
}

window.onload = loadUsers;

async function register(){
  const username=document.getElementById("username").value;
  await supabaseClient.from("users").insert([{username}]);
  loadUsers();
}

// ---------- TRANSACTION ----------
async function addTransaction(){
  const user=document.getElementById("userTx").value;
  const type=document.getElementById("type").value;
  const amount=parseInt(document.getElementById("amount").value);
  const date=document.getElementById("date").value;

  await supabaseClient.from("transactions").insert([{user_id:user,type,amount,date}]);
  alert("Added");
}

// ---------- SETTLEMENT ----------
async function addSettlement(){
  const from=document.getElementById("fromUser").value;
  const to=document.getElementById("toUser").value;
  const amount=parseInt(document.getElementById("settleAmount").value);
  const date=document.getElementById("settleDate").value;

  await supabaseClient.from("settlements").insert([{from_user:from,to_user:to,amount,date}]);
  alert("Settlement Added");
}

// ---------- TX VIEW ----------
async function txByUser(){
  const uid=document.getElementById("txUser").value;

  const { data } = await supabaseClient
    .from("transactions")
    .select("id,date,type,amount,users(username)")
    .eq("user_id",uid)
    .limit(40);

  renderTx(data);
}

async function txByDate(){
  const date=document.getElementById("txDate").value;

  const { data } = await supabaseClient
    .from("transactions")
    .select("id,date,type,amount,users(username)")
    .eq("date",date);

  renderTx(data);
}

function renderTx(data){
  let html=`<table><tr><th>Date</th><th>User</th><th>Type</th><th>Amt</th><th>Action</th></tr>`;

  data.forEach(t=>{
    html+=`<tr>
      <td>${t.date}</td>
      <td>${t.users.username}</td>
      <td>${t.type}</td>
      <td>${t.amount}</td>
      <td>
        <button onclick="deleteTx(${t.id})">❌</button>
      </td>
    </tr>`;
  });

  html+="</table>";
  document.getElementById("txTable").innerHTML=html;
}

async function deleteTx(id){
  await supabaseClient.from("transactions").delete().eq("id",id);
  alert("Deleted");
}

// ---------- PROFIT ----------
async function userProfit(){
  const uid = document.getElementById("profitUser").value;

  const { data: tx } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("user_id", uid);

  const { data: sett } = await supabaseClient
    .from("settlements")
    .select("*");

  const map = {};

  // transactions
  tx.forEach(t=>{
    if(!map[t.date]) map[t.date] = { pnl:0, settle:0 };

    if(t.type==="BUY_IN") map[t.date].pnl -= t.amount;
    else map[t.date].pnl += t.amount;
  });

  // settlements
  sett.forEach(s=>{
    if(!map[s.date]) map[s.date] = { pnl:0, settle:0 };

    if(s.to_user == uid) map[s.date].settle += s.amount;
    if(s.from_user == uid) map[s.date].settle -= s.amount;
  });

  let total = 0;

  let html = `
    <table>
      <tr>
        <th>Date</th>
        <th>PnL</th>
        <th>Settlement</th>
        <th>Net</th>
        <th>Cumulative</th>
      </tr>
  `;

  Object.keys(map).sort().forEach(d=>{
    const net = map[d].pnl + map[d].settle;
    total += net;

    html += `
      <tr>
        <td>${d}</td>
        <td>${map[d].pnl}</td>
        <td>${map[d].settle}</td>
        <td>${net}</td>
        <td>${total}</td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("profitTable").innerHTML = html;
}

// ---------- AUTO SETTLE ----------
async function autoSettle(){
  const date = document.getElementById("settleDateFilter").value;

  const { data: users } = await supabaseClient.from("users").select("*");
  const { data: tx } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("date", date);

  const balance = {};
  const userMap = {};

  users.forEach(u=>{
    balance[u.id] = 0;
    userMap[u.id] = u.username;
  });

  tx.forEach(t=>{
    balance[t.user_id] += t.type==="BUY_IN" ? -t.amount : t.amount;
  });

  // ---------- DISPLAY DAILY PnL ----------
  let pnlHtml = `
    <table>
      <tr><th>User</th><th>PnL (₹)</th></tr>
  `;

  for(let u in balance){
    if(balance[u] !== 0){
      pnlHtml += `
        <tr>
          <td>${userMap[u]}</td>
          <td>${balance[u]}</td>
        </tr>
      `;
    }
  }

  pnlHtml += "</table>";
  document.getElementById("dayPnlTable").innerHTML = pnlHtml;

  // ---------- SETTLEMENT ENGINE ----------
  const pos=[], neg=[];

  for(let u in balance){
    if(balance[u] > 0) pos.push({u, amt:balance[u]});
    if(balance[u] < 0) neg.push({u, amt:-balance[u]});
  }

  let i=0, j=0;
  const res=[];

  while(i<pos.length && j<neg.length){
    let x = Math.min(pos[i].amt, neg[j].amt);

    res.push({
      from: userMap[neg[j].u],
      to: userMap[pos[i].u],
      amt: x
    });

    pos[i].amt -= x;
    neg[j].amt -= x;

    if(pos[i].amt === 0) i++;
    if(neg[j].amt === 0) j++;
  }

  let html = `
    <table>
      <tr><th>From</th><th>To</th><th>Amount</th></tr>
  `;

  res.forEach(r=>{
    html += `
      <tr>
        <td>${r.from}</td>
        <td>${r.to}</td>
        <td>${r.amt}</td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("settleTable").innerHTML = html;
}
// ---------- RECK -----------------

async function reck(){
  const date = document.getElementById("reckDate").value;

  const { data } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("date", date);

  let buy = 0, cash = 0;

  data.forEach(t=>{
    if(t.type==="BUY_IN") buy += t.amount;
    else cash += t.amount;
  });

  document.getElementById("reckTable").innerHTML = `
    <table>
      <tr><th>Total Buy-in</th><th>Total Cash-out</th><th>Reck</th></tr>
      <tr><td>${buy}</td><td>${cash}</td><td>${buy - cash}</td></tr>
    </table>
  `;
}

// ---------- LEADERBOARD ----------
async function leaderboard(){
  const { data:users } = await supabaseClient.from("users").select("*");
  const { data:tx } = await supabaseClient.from("transactions").select("*");

  const map={};
  users.forEach(u=>map[u.id]={name:u.username,val:0});

  tx.forEach(t=>{
    map[t.user_id].val += t.type==="BUY_IN"?-t.amount:t.amount;
  });

  let arr=Object.values(map).sort((a,b)=>b.val-a.val);

  let html=`<table><tr><th>User</th><th>PnL</th></tr>`;
  arr.forEach(a=>{
    html+=`<tr><td>${a.name}</td><td>${a.val}</td></tr>`;
  });
  html+="</table>";

  document.getElementById("leaderboardTable").innerHTML=html;
}

// ---------- CSV ----------
async function exportCSV(){
  const { data } = await supabaseClient.from("transactions").select("*");

  let csv="date,user,type,amount\n";
  data.forEach(r=>{
    csv+=`${r.date},${r.user_id},${r.type},${r.amount}\n`;
  });

  const blob=new Blob([csv]);
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="data.csv";
  a.click();
}

// ---------- INSIGHTS ----------
async function insights(){
  const { data } = await supabaseClient.from("transactions").select("*");

  let total=0, count=0;
  data.forEach(t=>{
    total+=t.amount;
    count++;
  });

  document.getElementById("insightsTable").innerHTML=`
    <table>
      <tr><th>Total Volume</th><th>Avg Tx</th></tr>
      <tr><td>${total}</td><td>${(total/count).toFixed(2)}</td></tr>
    </table>
  `;
}
