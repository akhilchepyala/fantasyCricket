// src/components/admin/AdminSeason.jsx
import React from "react";
import SeasonTable from "../shared/SeasonTable";

export default function AdminSeason({ allMembers, seasonTotals, showToast }) {
  function exportCSV() {
    const members = Object.keys(allMembers);
    const rows = members
      .map((name) => {
        const sd = seasonTotals[name] || { total: 0, matches: [] };
        return {
          name,
          teamName: allMembers[name]?.teamName || name,
          total:    sd.total   || 0,
          matches:  sd.matches || [],
        };
      })
      .sort((a, b) => b.total - a.total);

    if (!rows.length) { showToast("No data to export", "err"); return; }

    const matchCols = rows[0].matches.map((m) => m.label || "Match");
    const header    = ["Rank", "Name", "Team", ...matchCols, "Total"];
    const lines     = [
      header.join(","),
      ...rows.map((r, i) =>
        [i + 1, r.name, r.teamName, ...r.matches.map((m) => m.pts), r.total].join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
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
