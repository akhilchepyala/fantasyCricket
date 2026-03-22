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
  const [screen, setScreen] = useState("loading");
  const [session, setSession] = useState({ name: null, isAdmin: false });

  const [metaGame, setMetaGame] = useState({});
  const [allMembers, setAllMembers] = useState({});
  const [seasonTotals, setSeasonTotals] = useState({});

  // ── Multi-match support ──
  // activeMatches: { [matchId]: { match, players, teams, stats } }
  const [activeMatches, setActiveMatches] = useState({});
  // currentMatchId: the primary match (admin view / backward compat)
  const [currentMatchId, setCurrentMatchId] = useState(null);

  // Derived from activeMatches[currentMatchId] for backward compat
  const currentMatch = activeMatches[currentMatchId]?.match || {};
  const matchPlayers = activeMatches[currentMatchId]?.players || [];
  const allTeams = activeMatches[currentMatchId]?.teams || {};
  const playerStats = activeMatches[currentMatchId]?.stats || {};

  const [localTeam, setLocalTeam] = useState({
    players: [],
    captain: "",
    vc: "",
  });

  const [arActive, setArActive] = useState(false);
  const [arSecs, setArSecs] = useState(0);
  const arIntervalRef = useRef(null);
  const arTimerRef = useRef(null);
  const arSecsRef = useRef(0);

  const matchUnsubsRef = useRef({}); // { [matchId]: unsubFn }
  const dbRef = useRef(null);

  const urlJoinCode = new URLSearchParams(window.location.search).get("join");

  // ────────────────────────────────────────────
  //  Bootstrap
  // ────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      try {
        const db = getDB();
        dbRef.current = db;

        const mgSnap = await getDoc(doc(db, "meta", "game"));
        if (!mgSnap.exists()) {
          await setDoc(doc(db, "meta", "game"), {
            currentMatchId: "",
            activeMatchIds: [],
            adminPin: "0000",
            joinCode: "",
          });
        }

        // Real-time: meta/game
        onSnapshot(doc(db, "meta", "game"), (snap) => {
          const data = snap.data() || {};
          setMetaGame(data);

          const primary = data.currentMatchId || "";
          // activeMatchIds includes primary + any additional matches
          const ids = Array.from(
            new Set([...(data.activeMatchIds || []), primary].filter(Boolean)),
          );

          // Subscribe to each active match
          ids.forEach((mid) => subscribeMatch(db, mid));

          // Unsubscribe from matches no longer active
          Object.keys(matchUnsubsRef.current).forEach((mid) => {
            if (!ids.includes(mid)) {
              matchUnsubsRef.current[mid]();
              delete matchUnsubsRef.current[mid];
              setActiveMatches((prev) => {
                const next = { ...prev };
                delete next[mid];
                return next;
              });
            }
          });

          setCurrentMatchId((prev) => {
            if (primary && primary !== prev) {
              setLocalTeam({ players: [], captain: "", vc: "" });
            }
            return primary || null;
          });

          if (!primary) {
            setCurrentMatchId(null);
          }
        });

        onSnapshot(doc(db, "meta", "members"), (snap) => {
          setAllMembers(snap.data() || {});
        });

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
    if (matchUnsubsRef.current[mid]) return; // already subscribed
    matchUnsubsRef.current[mid] = onSnapshot(
      doc(db, "matches", mid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() || {};
        setActiveMatches((prev) => ({
          ...prev,
          [mid]: {
            match: data,
            players: data.players || [],
            stats: data.stats || {},
            teams: data.teams || {},
          },
        }));
      },
    );
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
    Object.values(matchUnsubsRef.current).forEach((unsub) => unsub());
    matchUnsubsRef.current = {};
    setSession({ name: null, isAdmin: false });
    setLocalTeam({ players: [], captain: "", vc: "" });
    setScreen("login");
    window.history.replaceState({}, "", window.location.pathname);
  }

  function backToAdmin() {
    setSession((s) => ({ ...s, name: null }));
    setScreen("admin");
  }

  async function loadMemberTeam(name, matchId) {
    const db = dbRef.current;
    const mid = matchId || currentMatchId;
    if (!mid || !db) return { players: [], captain: "", vc: "" };
    const matchSnap = await getDoc(doc(db, "matches", mid));
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
          const merged = { ...(mdata.stats || {}) };
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
        screen,
        setScreen,
        session,
        loginAdmin,
        loginMember,
        loginMemberAsAdmin,
        logout,
        backToAdmin,
        loadMemberTeam,
        db,
        metaGame,
        allMembers,
        currentMatchId,
        currentMatch,
        matchPlayers,
        allTeams,
        playerStats,
        seasonTotals,
        activeMatches,
        localTeam,
        setLocalTeam,
        arActive,
        arSecs,
        startAR,
        stopAR,
        autoFetchStats,
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
