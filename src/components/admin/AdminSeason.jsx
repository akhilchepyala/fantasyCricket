// src/components/admin/AdminSeason.jsx
import React from "react";
import SeasonTable from "../shared/SeasonTable";

export default function AdminSeason({ allMembers, seasonTotals, showToast }) {
  function exportCSV() {
    const members = Object.keys(allMembers);
    if (!members.length) {
      showToast("No data to export", "err");
      return;
    }

    const rows = members
      .map((name) => {
        const sd = seasonTotals[name] || { total: 0, matches: [] };
        return {
          name,
          teamName: allMembers[name]?.teamName || name,
          total: sd.total || 0,
          matches: sd.matches || [],
        };
      })
      .sort((a, b) => b.total - a.total);

    // Collect all unique match labels across all members
    const matchLabels = [];
    const matchLabelSet = new Set();
    rows.forEach((r) => {
      r.matches.forEach((m) => {
        const lbl = m.label || m.matchId || "Match";
        if (!matchLabelSet.has(lbl)) {
          matchLabelSet.add(lbl);
          matchLabels.push(lbl);
        }
      });
    });

    const header = ["Rank", "Name", "Team", ...matchLabels, "Total"];
    const lines = [
      header.join(","),
      ...rows.map((r, i) => {
        const ptsByLabel = {};
        r.matches.forEach((m) => {
          ptsByLabel[m.label || m.matchId || "Match"] = m.pts;
        });
        return [
          i + 1,
          r.name,
          r.teamName,
          ...matchLabels.map((lbl) => ptsByLabel[lbl] ?? 0),
          r.total,
        ].join(",");
      }),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ipl_fantasy_season.csv";
    a.click();
    showToast("CSV exported!");
  }

  return (
    <div style={{ padding: 16 }}>
      <div className="acard">
        <div className="acard-hrow">
          <div className="acard-t">🏆 Season Leaderboard</div>
          <button className="btn-sm" onClick={exportCSV}>
            Export CSV
          </button>
        </div>
        <SeasonTable
          allMembers={allMembers}
          seasonTotals={seasonTotals}
          highlightName={null}
        />
      </div>
    </div>
  );
}
