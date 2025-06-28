// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsv7hyPIFa1LkiamtCs-xf3issL7y07Ew",
  authDomain: "noreply@crazy-war-zone-681ea.firebaseapp.com",
  projectId: "crazy-war-zone-681ea",
  storageBucket: "crazy-war-zone-681ea.appspot.com",
  messagingSenderId: "Crazy_War_Zone",
  appId: "1:523971016681:android:8f3a8d162b401bbcb73d78",
  databaseURL: "https://crazy-war-zone-681ea-default-rtdb.firebaseio.com"
};

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, GoogleAuthProvider, signInWithPopup, doc, setDoc };
// auth.js
import {
  auth, db, GoogleAuthProvider, signInWithPopup,
  doc, setDoc
} from "./firebase.js";

const provider = new GoogleAuthProvider();
const googleLoginBtn = document.getElementById("googleLogin");
const status = document.getElementById("status");

googleLoginBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Save to Firestore
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      name: user.displayName,
      email: user.email,
      uid: user.uid,
      teamName: user.displayName.replace(/\s/g, '') + "11",
      createdAt: new Date()
    });

    status.innerText = `✅ Welcome ${user.displayName}`;
    window.location.href = "matches.html"; // next step
  } catch (error) {
    console.error(error);
    status.innerText = "❌ Login Failed";
  }
});
// match.js
import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const matchListDiv = document.getElementById('matchList');

async function loadMatches() {
  const matchSnap = await getDocs(collection(db, "matches"));
  matchSnap.forEach(doc => {
    const match = doc.data();
    const matchId = doc.id;
    const startTime = new Date(match.startTime);
    const timeNow = new Date();

    let status = "Upcoming";
    if (timeNow > startTime) status = "Live";

    const html = `
      <div class="match-card">
        <h3>${match.teamA} 🆚 ${match.teamB}</h3>
        <p>Start Time: ${startTime.toLocaleString()}</p>
        <p>Status: <strong>${status}</strong></p>
        <button onclick="joinTeam('${matchId}')">Join ➕</button>
      </div>
    `;
    matchListDiv.innerHTML += html;
  });
}

window.joinTeam = (matchId) => {
  localStorage.setItem("selectedMatch", matchId);
  window.location.href = "team.html";
};

loadMatches();
import { db } from './firebase.js';
import {
  collection, query, where, getDocs, doc, setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const matchId = localStorage.getItem("selectedMatch");
let allPlayers = [];
let selectedPlayers = [];
let creditsUsed = 0;

const playerListDiv = document.getElementById("playerList");
const creditsLeftSpan = document.getElementById("creditsLeft");
const selectedCountSpan = document.getElementById("selectedCount");
const captainSection = document.getElementById("captainSection");
const captainSelect = document.getElementById("captainSelect");
const viceCaptainSelect = document.getElementById("viceCaptainSelect");
const saveStatus = document.getElementById("saveStatus");

async function fetchPlayers() {
  const q = query(collection(db, "players"), where("matchId", "==", matchId));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    allPlayers.push({ id: doc.id, ...doc.data() });
  });
  displayPlayers(allPlayers);
}

function displayPlayers(players) {
  playerListDiv.innerHTML = '';
  players.forEach(player => {
    const isSelected = selectedPlayers.find(p => p.id === player.id);
    const card = document.createElement("div");
    card.className = "player-card";
    card.innerHTML = `
      <p><strong>${player.name}</strong> (${player.role})</p>
      <p>Credit: ${player.credit}</p>
      <button>${isSelected ? "Remove" : "Add"}</button>
    `;
    card.querySelector("button").onclick = () => togglePlayer(player);
    playerListDiv.appendChild(card);
  });
}

function togglePlayer(player) {
  const index = selectedPlayers.findIndex(p => p.id === player.id);
  if (index > -1) {
    selectedPlayers.splice(index, 1);
    creditsUsed -= player.credit;
  } else {
    if (selectedPlayers.length >= 11 || (creditsUsed + player.credit) > 100) return;
    selectedPlayers.push(player);
    creditsUsed += player.credit;
  }

  selectedCountSpan.innerText = selectedPlayers.length;
  creditsLeftSpan.innerText = 100 - creditsUsed;

  displayPlayers(allPlayers);

  if (selectedPlayers.length === 11) {
    showCaptainSection();
  } else {
    captainSection.style.display = "none";
  }
}

function filterRole(role) {
  if (role === 'ALL') return displayPlayers(allPlayers);
  const filtered = allPlayers.filter(p => p.role === role);
  displayPlayers(filtered);
}

function showCaptainSection() {
  captainSection.style.display = "block";
  captainSelect.innerHTML = "";
  viceCaptainSelect.innerHTML = "";

  selectedPlayers.forEach(p => {
    const opt1 = document.createElement("option");
    opt1.value = p.id;
    opt1.innerText = p.name;
    const opt2 = opt1.cloneNode(true);

    captainSelect.appendChild(opt1);
    viceCaptainSelect.appendChild(opt2);
  });
}

async function saveTeam() {
  const uid = localStorage.getItem("uid");
  const captain = captainSelect.value;
  const viceCaptain = viceCaptainSelect.value;

  if (!captain || !viceCaptain || captain === viceCaptain) {
    alert("Captain and Vice Captain must be different!");
    return;
  }

  await setDoc(doc(db, "teams", uid + "_" + matchId), {
    uid,
    matchId,
    players: selectedPlayers,
    captain,
    viceCaptain,
    createdAt: new Date()
  });

  saveStatus.innerText = "✅ Team Saved!";
  setTimeout(() => window.location.href = "matches.html", 1000);
}

fetchPlayers();
import { db } from './firebase.js';
import {
  collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const matchId = localStorage.getItem("selectedMatch");
const uid = localStorage.getItem("uid");
const contestList = document.getElementById("contestList");

async function loadContests() {
  const q = query(collection(db, "contests"), where("matchId", "==", matchId));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const contest = docSnap.data();
    const id = docSnap.id;

    const html = `
      <div class="contest-card">
        <h3>${contest.name}</h3>
        <p>Prize: ₹${contest.prize}</p>
        <p>Entry Fee: ₹${contest.entryFee}</p>
        <p>Entries: ${contest.joinedCount}/${contest.maxEntries}</p>
        <button onclick="joinContest('${id}')">Join Now</button>
      </div>
    `;
    contestList.innerHTML += html;
  });
}

async function joinContest(contestId) {
  const teamId = uid + "_" + matchId;

  // Check if team exists
  const teamDoc = await getDoc(doc(db, "teams", teamId));
  if (!teamDoc.exists()) return alert("⚠️ Please create a team first!");

  // Check if already joined
  const q = query(collection(db, "joins"), where("contestId", "==", contestId), where("teamId", "==", teamId));
  const snap = await getDocs(q);
  if (!snap.empty) return alert("✅ Already joined this contest with your team.");

  // Join Logic
  const joinRef = doc(collection(db, "joins"));
  await setDoc(joinRef, {
    uid,
    teamId,
    matchId,
    contestId
  });

  // Increment contest entry count
  await updateDoc(doc(db, "contests", contestId), {
    joinedCount: increment(1)
  });

  alert("✅ Successfully joined the contest!");
}

loadContests();
import { db } from './firebase.js';
import {
  collection, query, where, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const uid = localStorage.getItem("uid");
const myContestList = document.getElementById("myContestList");

async function loadMyContests() {
  const q = query(collection(db, "joins"), where("uid", "==", uid));
  const snap = await getDocs(q);

  for (const join of snap.docs) {
    const data = join.data();
    const contestSnap = await getDoc(doc(db, "contests", data.contestId));
    const contest = contestSnap.data();

    const html = `
      <div class="contest-card">
        <h3>${contest.name}</h3>
        <p>Match: ${data.matchId}</p>
        <button onclick="goToLeaderboard('${data.matchId}', '${data.contestId}')">📊 View Leaderboard</button>
      </div>
    `;
    myContestList.innerHTML += html;
  }
}

window.goToLeaderboard = function (matchId, contestId) {
  localStorage.setItem("leader_match", matchId);
  localStorage.setItem("leader_contest", contestId);
  window.location.href = "leaderboard.html";
};

loadMyContests();
import { db } from './firebase.js';
import {
  collection, query, where, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const matchId = localStorage.getItem("leader_match");
const contestId = localStorage.getItem("leader_contest");
const leaderboardList = document.getElementById("leaderboardList");

async function loadLeaderboard() {
  const q = query(collection(db, "joins"), where("contestId", "==", contestId));
  const snap = await getDocs(q);

  let scores = [];

  for (const join of snap.docs) {
    const teamId = join.data().teamId;
    const teamSnap = await getDoc(doc(db, "teams", teamId));
    const team = teamSnap.data();
    let total = 0;

    for (const p of team.players) {
      const ptSnap = await getDoc(doc(db, "points", `${matchId}_${p.id}`));
      const pt = ptSnap.exists() ? ptSnap.data().points : 0;
import { db } from './firebase.js';
import {
  collection, query, where, getDocs, doc, setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Dummy Admin Protection (basic)
const uid = localStorage.getItem("uid");
if (uid !== "admin_user_id") {
  alert("Unauthorized. Only admin allowed.");
  window.location.href = "index.html";
}

// Load all players
const playerList = document.getElementById("playerList");

async function loadPlayers() {
  const q = query(collection(db, "players"));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const player = docSnap.data();
    const option = document.createElement("option");
    option.value = docSnap.id;
    option.text = `${player.name} (${player.role})`;
    playerList.appendChild(option);
  });
}

window.updatePoints = async function () {
  const matchId = document.getElementById("matchId").value.trim();
  const playerId = playerList.value;
  const points = parseFloat(document.getElementById("points").value);

  if (!matchId || !playerId || isNaN(points)) {
    return alert("⚠️ Please enter all details.");
  }

  const docId = `${matchId}_${playerId}`;
  await setDoc(doc(db, "points", docId), {
    matchId,
    playerId,
    points
  });

  document.getElementById("status").innerText = "✅ Points Updated Successfully!";
};

loadPlayers();
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /points/{docId} {
      allow write: if request.auth != null && request.auth.uid == "admin_user_id";
      allow read: if true;
    }

    match /{document=**} {
      allow read: if true;
    }
  }
}
import { db } from './firebase.js';
import {
  doc, getDoc, setDoc, updateDoc, increment,
  collection, addDoc, query, where, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const uid = localStorage.getItem("uid");
const balanceEl = document.getElementById("balance");
const txnList = document.getElementById("txnList");

async function loadWallet() {
  const walletRef = doc(db, "wallets", uid);
  const snap = await getDoc(walletRef);

  if (snap.exists()) {
    balanceEl.innerText = snap.data().balance.toFixed(2);
  } else {
    await setDoc(walletRef, { uid, balance: 0 });
    balanceEl.innerText = "0.00";
  }

  // Load Transactions
  const q = query(collection(db, "transactions"), where("uid", "==", uid), orderBy("timestamp", "desc"));
  const txns = await getDocs(q);
  txns.forEach(t => {
    const d = t.data();
    const li = document.createElement("li");
    li.textContent = `${d.type.toUpperCase()}: ₹${d.amount} (${new Date(d.timestamp).toLocaleString()})`;
    txnList.appendChild(li);
  });
}

window.addMoney = async function () {
  const amount = parseFloat(document.getElementById("amount").value);
  if (isNaN(amount) || amount <= 0) return alert("Enter valid amount");

  const walletRef = doc(db, "wallets", uid);
  await updateDoc(walletRef, { balance: increment(amount) });

  await addDoc(collection(db, "transactions"), {
    uid,
    amount: amount,
    type: "add",
    timestamp: new Date().toISOString()
  });

  alert("✅ Amount Added Successfully!");
  location.reload();
};

loadWallet();
// Check wallet balance
const walletRef = doc(db, "wallets", uid);
const walletSnap = await getDoc(walletRef);
const balance = walletSnap.exists() ? walletSnap.data().balance : 0;

if (balance < contest.entryFee) {
  return alert("⚠️ Insufficient Wallet Balance. Please add money.");
}

// Deduct entry fee
await updateDoc(walletRef, { balance: increment(-contest.entryFee) });

await addDoc(collection(db, "transactions"), {
  uid,
  amount: -contest.entryFee,
  type: "join",
  contestId: contestId,
  timestamp: new Date().toISOString()
});
// Example: Top 1 winner gets ₹500
const winnerUid = "user123";  // from leaderboard rank 1
const walletRef = doc(db, "wallets", winnerUid);
await updateDoc(walletRef, { balance: increment(500) });

await addDoc(collection(db, "transactions"), {
  uid: winnerUid,
  amount: 500,
  type: "prize",
  contestId: "xyz123",
  timestamp: new Date().toISOString()
});
match /wallets/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
match /transactions/{docId} {
  allow read, write: if request.auth != null && request.auth.uid == request.resource.data.uid;
}
import { db } from './firebase.js';
import {
  setDoc, doc, collection, addDoc, updateDoc, increment,
  query, where, getDocs, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ✅ Match Create
window.createMatch = async () => {
  const id = document.getElementById("matchId").value;
  const teamA = document.getElementById("teamA").value;
  const teamB = document.getElementById("teamB").value;
  const time = document.getElementById("matchTime").value;

  if (!id || !teamA || !teamB || !time) return alert("⚠️ All fields required");

  await setDoc(doc(db, "matches", id), {
    id,
    teamA,
    teamB,
    time
  });

  alert("✅ Match Created");
};

// ✅ Player Add
window.addPlayer = async () => {
  const name = document.getElementById("playerName").value;
  const team = document.getElementById("playerTeam").value;
  const role = document.getElementById("playerRole").value;

  if (!name || !team || !role) return alert("⚠️ All fields required");

  const newRef = doc(collection(db, "players"));
  await setDoc(newRef, {
    name,
    team,
    role
  });

  alert("✅ Player Added");
};

// ✅ Contest Create
window.createContest = async () => {
  const name = document.getElementById("contestName").value;
  const matchId = document.getElementById("forMatchId").value;
  const entry = parseFloat(document.getElementById("entryFee").value);
  const spots = parseInt(document.getElementById("maxSpots").value);

  if (!name || !matchId || !entry || !spots) return alert("⚠️ Fill all fields");

  const newRef = doc(collection(db, "contests"));
  await setDoc(newRef, {
    id: newRef.id,
    name,
    matchId,
    entryFee: entry,
    maxSpots: spots
  });

  alert("✅ Contest Created");
};

// ✅ Prize Distribution (Top 1)
window.distributePrize = async () => {
  const matchId = document.getElementById("prizeMatch").value;
  const contestId = document.getElementById("prizeContest").value;
  const prize = parseFloat(document.getElementById("prizeAmount").value);

  const q = query(collection(db, "joins"), where("contestId", "==", contestId));
  const snap = await getDocs(q);
  let scores = [];

  for (const join of snap.docs) {
    const data = join.data();
    const teamSnap = await getDoc(doc(db, "teams", data.teamId));
    const team = teamSnap.data();
    let total = 0;

    for (const p of team.players) {
      const ptSnap = await getDoc(doc(db, "points", `${matchId}_${p.id}`));
      const pt = ptSnap.exists() ? ptSnap.data().points : 0;

      let mult = 1;
      if (team.captain === p.id) mult = 2;
      else if (team.viceCaptain === p.id) mult = 1.5;

      total += pt * mult;
    }

    scores.push({ uid: data.uid, points: total });
  }

  scores.sort((a, b) => b.points - a.points);
  const winner = scores[0];

  const walletRef = doc(db, "wallets", winner.uid);
  await updateDoc(walletRef, { balance: increment(prize) });

  await addDoc(collection(db, "transactions"), {
    uid: winner.uid,
    amount: prize,
    type: "prize",
    contestId,
    timestamp: new Date().toISOString()
  });

  alert(`🏆 Prize ₹${prize} given to UID: ${winner.uid}`);
};
match /{document=**} {
  allow read: if true;

  allow write: if request.auth != null && (
    request.auth.uid == "admin_user_id"
  );
}
window.startPayment = async function () {
  const amount = parseFloat(document.getElementById("amount").value);
  if (!amount || amount < 1) return alert("Enter valid amount");

  const res = await fetch("https://your-server.com/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amount * 100 }) // in paisa
  });

  const data = await res.json();

  const options = {
    key: "YOUR_RAZORPAY_KEY_ID",
    amount: data.amount,
    currency: "INR",
    name: "Mysore11",
    description: "Add Money to Wallet",
    order_id: data.id,
    handler: async function (response) {
      // Call server to confirm
      await fetch("https://your-server.com/payment-success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...response,
          uid: localStorage.getItem("uid"),
          amount: amount
        })
      });

      alert("✅ Money Added Successfully!");
      location.reload();
    },
    prefill: {
      name: "Mysore11 User",
      email: "test@example.com"
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
};
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccount.json')),
  databaseURL: "https://crazy-war-zone-681ea-default-rtdb.firebaseio.com"
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: "YOUR_KEY_ID",
  key_secret: "YOUR_KEY_SECRET"
});

app.post('/create-order', async (req, res) => {
  const options = {
    amount: req.body.amount,
    currency: "INR",
    receipt: "rcptid_" + Math.random(),
  };

  const order = await razorpay.orders.create(options);
  res.json(order);
});

app.post('/payment-success', async (req, res) => {
  const { uid, amount } = req.body;

  const walletRef = db.collection("wallets").doc(uid);
  await walletRef.set({ balance: admin.firestore.FieldValue.increment(amount) }, { merge: true });

  await db.collection("transactions").add({
    uid,
    amount,
    type: "razorpay",
    timestamp: new Date().toISOString()
  });

  res.send({ status: "success" });
});

app.listen(3000, () => co