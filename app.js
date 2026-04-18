const supabaseClient = supabase.createClient(
  "YOUR_SUPABASE_URL",
  "YOUR_ANON_KEY"
);

// ---------- HELPER ----------
async function getUser(username) {
  const { data, error } = await supabaseClient
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (error || !data) return null;
  return data;
}

// ---------- REGISTER ----------
async function register() {
  const username = document.getElementById("username").value;

  const { error } = await supabaseClient
    .from("users")
    .insert([{ username }]);

  if (error) alert("User may already exist");
  else alert("User registered");
}

// ---------- ADD TRANSACTION ----------
async function addTransaction() {
  const username = document.getElementById("userTx").value;
  const type = document.getElementById("type").value;
  const amount = parseInt(document.getElementById("amount").value);
  const date = document.getElementById("date").value;

  const user = await getUser(username);

  if (!user) {
    alert("Username does not exist");
    return;
  }

  await supabaseClient.from("transactions").insert([{
    user_id: user.id,
    type,
    amount,
    date
  }]);

  alert("Transaction added");
}

// ---------- PROFIT ----------
async function getProfit() {
  const username = document.getElementById("userProfit").value;
  const date = document.getElementById("profitDate").value;

  const user = await getUser(username);

  if (!user) {
    document.getElementById("profitResult").innerText = "User does not exist";
    return;
  }

  let query = supabaseClient
    .from("transactions")
    .select("*")
    .eq("user_id", user.id);

  if (date) query = query.eq("date", date);

  const { data } = await query;

  let buyin = 0, cashout = 0;

  data.forEach(t => {
    if (t.type === "BUY_IN") buyin += t.amount;
    else cashout += t.amount;
  });

  document.getElementById("profitResult").innerText =
    "Profit/Loss: ₹" + (cashout - buyin);
}

// ---------- TRANSACTIONS ----------
async function getTransactions() {
  const username = document.getElementById("userTxView").value;
  const date = document.getElementById("txDate").value;

  const user = await getUser(username);

  if (!user) {
    alert("User does not exist");
    return;
  }

  let query = supabaseClient
    .from("transactions")
    .select("*")
    .eq("user_id", user.id);

  if (date) query = query.eq("date", date);

  const { data } = await query;

  const list = document.getElementById("txList");
  list.innerHTML = "";

  data.forEach(t => {
    const li = document.createElement("li");
    li.innerText = `${t.date} | ${t.type} | ₹${t.amount}`;
    list.appendChild(li);
  });
}

// ---------- RECK ----------
async function reck() {
  const date = document.getElementById("reckDate").value;

  if (!date) {
    alert("Enter a date");
    return;
  }

  const { data } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("date", date);

  let buyin = 0, cashout = 0;

  data.forEach(t => {
    if (t.type === "BUY_IN") buyin += t.amount;
    else cashout += t.amount;
  });

  document.getElementById("reckResult").innerText =
    "Reck Value: ₹" + (buyin - cashout);
}
