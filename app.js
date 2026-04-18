const { createClient } = supabase;

const supabaseClient = createClient(
  "https://bsbvghacbfwwtmvabbxi.supabase.co",
  "sb_publishable_F1550nUALJYXnzk1GwPFzw_W_2aN26G"
);

// ---------- UI TOGGLE ----------
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

// ---------- HELPERS ----------
async function getUser(username) {
  const { data } = await supabaseClient
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  return data || null;
}

// ---------- REGISTER ----------
async function register() {
  const username = document.getElementById("username").value;

  const { error } = await supabaseClient
    .from("users")
    .insert([{ username }]);

  alert(error ? "User exists" : "Registered");
}

// ---------- ADD ----------
async function addTransaction() {
  const username = document.getElementById("userTx").value;
  const type = document.getElementById("type").value;
  const amount = parseInt(document.getElementById("amount").value);
  const date = document.getElementById("date").value;

  const user = await getUser(username);
  if (!user) return alert("User does not exist");

  await supabaseClient.from("transactions").insert([{
    user_id: user.id,
    type,
    amount,
    date
  }]);

  alert("Added");
}

// ---------- TRANSACTIONS ----------
async function txByUser() {
  const username = document.getElementById("txUser").value;
  const user = await getUser(username);

  if (!user) return alert("User does not exist");

  const { data } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(40);

  renderTx(data);
}

async function txByDate() {
  const date = document.getElementById("txDate").value;

  const { data } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("date", date);

  renderTx(data);
}

function renderTx(data) {
  const list = document.getElementById("txList");
  list.innerHTML = "";

  data.forEach(t => {
    const li = document.createElement("li");
    li.innerText = `${t.date} | ${t.type} | ₹${t.amount}`;
    list.appendChild(li);
  });
}

// ---------- PROFIT ----------
async function userProfitSummary() {
  const username = document.getElementById("profitUser").value;
  const user = await getUser(username);

  if (!user) return alert("User does not exist");

  const { data } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("user_id", user.id);

  const map = {};

  data.forEach(t => {
    if (!map[t.date]) map[t.date] = 0;

    if (t.type === "BUY_IN") map[t.date] -= t.amount;
    else map[t.date] += t.amount;
  });

  let total = 0;
  let output = "";

  Object.keys(map).sort().forEach(date => {
    total += map[date];
    output += `${date}: ₹${map[date]}\n`;
  });

  output += `\nTotal: ₹${total}`;

  document.getElementById("profitBreakdown").innerText = output;
}

async function allUsersProfit() {
  const date = document.getElementById("profitDate").value;

  const { data } = await supabaseClient
    .from("transactions")
    .select("user_id, type, amount")
    .eq("date", date);

  const map = {};

  data.forEach(t => {
    if (!map[t.user_id]) map[t.user_id] = 0;

    if (t.type === "BUY_IN") map[t.user_id] -= t.amount;
    else map[t.user_id] += t.amount;
  });

  const list = document.getElementById("allUsersProfitList");
  list.innerHTML = "";

  for (let uid in map) {
    if (map[uid] !== 0) {
      const li = document.createElement("li");
      li.innerText = `User ${uid}: ₹${map[uid]}`;
      list.appendChild(li);
    }
  }
}

// ---------- RECK ----------
async function reck() {
  const date = document.getElementById("reckDate").value;

  const { data } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("date", date);

  let buy = 0, cash = 0;

  data.forEach(t => {
    if (t.type === "BUY_IN") buy += t.amount;
    else cash += t.amount;
  });

  document.getElementById("reckResult").innerText =
    `Reck: ₹${buy - cash}`;
}
