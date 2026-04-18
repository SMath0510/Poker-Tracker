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
    .select("date, type, amount, users(username)")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(40);

  renderTxTable(data);
}

async function txByDate() {
  const date = document.getElementById("txDate").value;

  const { data } = await supabaseClient
    .from("transactions")
    .select("date, type, amount, users(username)")
    .eq("date", date);

  renderTxTable(data);
}

function renderTxTable(data) {
  const container = document.getElementById("txTable");

  let html = `
    <table>
      <tr>
        <th>Date</th>
        <th>Username</th>
        <th>Type</th>
        <th>Amount (₹)</th>
      </tr>
  `;

  data.forEach(t => {
    html += `
      <tr>
        <td>${t.date}</td>
        <td>${t.users.username}</td>
        <td>${t.type}</td>
        <td>${t.amount}</td>
      </tr>
    `;
  });

  html += "</table>";
  container.innerHTML = html;
}

// ---------- PROFIT ----------
async function userProfitSummary() {
  const username = document.getElementById("profitUser").value;
  const user = await getUser(username);

  if (!user) return alert("User does not exist");

  const { data } = await supabaseClient
    .from("transactions")
    .select("date, type, amount")
    .eq("user_id", user.id);

  const map = {};

  data.forEach(t => {
    if (!map[t.date]) map[t.date] = 0;

    if (t.type === "BUY_IN") map[t.date] -= t.amount;
    else map[t.date] += t.amount;
  });

  let total = 0;

  let html = `
    <table>
      <tr>
        <th>Date</th>
        <th>Profit/Loss (₹)</th>
        <th>Cumulative (₹)</th>
      </tr>
  `;

  Object.keys(map).sort().forEach(date => {
    total += map[date];

    html += `
      <tr>
        <td>${date}</td>
        <td>${map[date]}</td>
        <td>${total}</td>
      </tr>
    `;
  });

  html += `
      <tr>
        <th>Total</th>
        <th colspan="2">${total}</th>
      </tr>
    </table>
  `;

  document.getElementById("profitTable").innerHTML = html;
}

async function allUsersProfit() {
  const date = document.getElementById("profitDate").value;

  const { data } = await supabaseClient
    .from("transactions")
    .select("user_id, type, amount, users(username)")
    .eq("date", date);

  const map = {};

  data.forEach(t => {
    const username = t.users.username;

    if (!map[username]) map[username] = 0;

    if (t.type === "BUY_IN") map[username] -= t.amount;
    else map[username] += t.amount;
  });

  let html = `
    <table>
      <tr>
        <th>Username</th>
        <th>Profit/Loss (₹)</th>
      </tr>
  `;

  Object.keys(map).forEach(user => {
    if (map[user] !== 0) {
      html += `
        <tr>
          <td>${user}</td>
          <td>${map[user]}</td>
        </tr>
      `;
    }
  });

  html += "</table>";

  document.getElementById("allUsersProfitTable").innerHTML = html;
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
