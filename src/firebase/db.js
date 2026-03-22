// src/firebase/db.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { FIREBASE_CONFIG } from "./config";

let _db = null;

export function getDB() {
  if (_db) return _db;
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  _db = getFirestore(app);
  return _db;
}

export async function saveDraftTeam(db, matchId, memberName, teamData) {
  if (!matchId || !memberName) throw new Error("Missing matchId or memberName");
  const { players, captain, vc } = teamData;
  const matchRef = doc(db, "matches", matchId);
  await updateDoc(matchRef, {
    [`teams.${memberName}`]: {
      players: Array.isArray(players) ? players : [],
      captain: captain || "",
      vc: vc || "",
      submitted: false,
      updatedAt: Date.now(),
    },
  });
}

export async function submitTeam(db, matchId, memberName, teamData) {
  if (!matchId || !memberName) throw new Error("Missing matchId or memberName");
  const { players, captain, vc } = teamData;
  const matchRef = doc(db, "matches", matchId);
  const now = Date.now();
  await updateDoc(matchRef, {
    [`teams.${memberName}`]: {
      players: Array.isArray(players) ? players : [],
      captain: captain || "",
      vc: vc || "",
      submitted: true,
      submittedAt: now,
      updatedAt: now,
    },
  });
}
