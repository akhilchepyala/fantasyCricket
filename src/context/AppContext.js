// src/context/AppContext.js
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { getDB } from "../firebase/db";
import { fetchScorecard } from "../utils/cricketApi";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Screen router ──
  const [screen, setScreen] = useState("loading"); // loading | login | join | member | admin

  // ── Auth ──
  const [session, setSession] = useState({ name: null, isAdmin: false });

  // ── Firestore data ──
  const [metaGame, setMetaGame] = useState({});
  const [allMembers, setAllMembers] = useState({});
  const [currentMatchId, setCurrentMatchId] = useState(null);
  const [currentMatch, setCurrentMatch] = useState({});
  const [matchPlayers, setMatchPlayers] = useState([]);
  const [allTeams, setAllTeams] = useState({});
  const [playerStats, setPlayerStats] = useState({});
  const [seasonTotals, setSeasonTotals] = useState({});

  // ── Local (unsaved) team being built ──
  const [localTeam, setLocalTeam] = useState({
    players: [],
    captain: "",
    vc: "",
  });

  // ── Auto-refresh ──
  const [arActive, setArActive] = useState(false);
  const [arSecs, setArSecs] = useState(0);
  const arIntervalRef = useRef(null);
  const arTimerRef = useRef(null);
  const arSecsRef = useRef(0);

  // ── Refs ──
  const matchUnsubRef = useRef(null);
  const dbRef = useRef(null);

  // ── URL join code ──
  const urlJoinCode = new URLSearchParams(window.location.search).get("join");

  // ────────────────────────────────────────────
  //  Bootstrap
  // ────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      try {
        const db = getDB();
        dbRef.current = db;

        // Ensure meta/game doc exists
        const mgSnap = await getDoc(doc(db, "meta", "game"));
        if (!mgSnap.exists()) {
          await setDoc(doc(db, "meta", "game"), {
            currentMatchId: "",
            adminPin: "0000",
            joinCode: "",
          });
        }

        // Real-time: meta/game
        onSnapshot(doc(db, "meta", "game"), (snap) => {
          const data = snap.data() || {};
          setMetaGame(data);
          const newMid = data.currentMatchId || "";
          if (newMid) {
            setCurrentMatchId((prev) => {
              if (newMid !== prev) subscribeMatch(db, newMid);
              return newMid;
            });
          }
        });

        // Real-time: members
        onSnapshot(doc(db, "meta", "members"), (snap) => {
          setAllMembers(snap.data() || {});
        });

        // Real-time: season totals
        onSnapshot(doc(db, "season", "totals"), (snap) => {
          setSeasonTotals(snap.data() || {});
        });

        setScreen(urlJoinCode ? "join" : "login");
      } catch (e) {
        console.error("Firebase boot error:", e);
        setScreen("error");
      }
    }
    boot();
    // eslint-disable-next-line
  }, []);

  function subscribeMatch(db, mid) {
    if (matchUnsubRef.current) matchUnsubRef.current();
    matchUnsubRef.current = onSnapshot(doc(db, "matches", mid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      setCurrentMatch(data);
      setMatchPlayers(data.players || []);
      setPlayerStats(data.stats || {});
      setAllTeams(data.teams || {});
    });
  }

  // ────────────────────────────────────────────
  //  Auth actions
  // ────────────────────────────────────────────
  function loginAdmin() {
    setSession({ name: null, isAdmin: true });
    setScreen("admin");
  }

  function loginMember(name, team) {
    setSession({ name, isAdmin: false });
    setLocalTeam(team);
    setScreen("member");
  }

  function loginMemberAsAdmin(name, team) {
    setSession({ name, isAdmin: true });
    setLocalTeam(team);
    setScreen("member");
  }

  function logout() {
    stopAR();
    setSession({ name: null, isAdmin: false });
    setScreen("login");
    window.history.replaceState({}, "", window.location.pathname);
  }

  function backToAdmin() {
    setSession((s) => ({ ...s, name: null }));
    setScreen("admin");
  }

  async function loadMemberTeam(name) {
    const db = dbRef.current;
    if (!currentMatchId || !db) return { players: [], captain: "", vc: "" };
    const matchSnap = await getDoc(doc(db, "matches", currentMatchId));
    if (!matchSnap.exists()) return { players: [], captain: "", vc: "" };
    const t = (matchSnap.data().teams || {})[name] || {};
    return {
      players: t.players || [],
      captain: t.captain || "",
      vc: t.vc || "",
    };
  }

  // ────────────────────────────────────────────
  //  Auto-refresh
  // ────────────────────────────────────────────
  const autoFetchStats = useCallback(
    async (showResult = false) => {
      const db = dbRef.current;
      if (!db || !currentMatchId) return { count: 0 };
      try {
        const mgSnap = await getDoc(doc(db, "meta", "game"));
        const mg = mgSnap.data() || {};
        const key = mg.cricApiKey;
        const matchSnap = await getDoc(doc(db, "matches", currentMatchId));
        if (!matchSnap.exists()) return { count: 0 };
        const mdata = matchSnap.data();
        const liveMatchId = mdata.liveMatchId;
        if (!key || !liveMatchId) return { count: 0 };

        const { updatedStats, updatedCount } = await fetchScorecard(
          key,
          liveMatchId,
          mdata.players || [],
        );
        if (updatedCount > 0) {
          const su = {};
          // Merge with existing stats
          const existingStats = mdata.stats || {};
          const merged = { ...existingStats };
          Object.entries(updatedStats).forEach(([p, s]) => {
            merged[p] = { ...(merged[p] || {}), ...s };
          });
          Object.entries(merged).forEach(([p, s]) => {
            su[`stats.${p}`] = s;
          });
          await updateDoc(doc(db, "matches", currentMatchId), su);
        }
        return { count: updatedCount };
      } catch (e) {
        console.warn("Auto-fetch failed:", e.message);
        return { count: 0, error: e.message };
      }
    },
    [currentMatchId],
  );

  function startAR(secs) {
    stopAR();
    arSecsRef.current = secs;
    setArActive(true);
    setArSecs(secs);
    autoFetchStats();
    arIntervalRef.current = setInterval(() => {
      autoFetchStats();
      arSecsRef.current = secs;
    }, secs * 1000);
    arTimerRef.current = setInterval(() => {
      arSecsRef.current = Math.max(0, arSecsRef.current - 1);
      setArSecs(arSecsRef.current);
    }, 1000);
  }

  function stopAR() {
    if (arIntervalRef.current) {
      clearInterval(arIntervalRef.current);
      arIntervalRef.current = null;
    }
    if (arTimerRef.current) {
      clearInterval(arTimerRef.current);
      arTimerRef.current = null;
    }
    setArActive(false);
    setArSecs(0);
    arSecsRef.current = 0;
  }

  const db = dbRef.current;

  return (
    <AppContext.Provider
      value={{
        // Screen
        screen,
        setScreen,
        // Auth
        session,
        loginAdmin,
        loginMember,
        loginMemberAsAdmin,
        logout,
        backToAdmin,
        loadMemberTeam,
        // Data
        db,
        metaGame,
        allMembers,
        currentMatchId,
        currentMatch,
        matchPlayers,
        allTeams,
        playerStats,
        seasonTotals,
        // Local team
        localTeam,
        setLocalTeam,
        // Auto-refresh
        arActive,
        arSecs,
        startAR,
        stopAR,
        autoFetchStats,
        // URL
        urlJoinCode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
