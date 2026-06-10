const ZAFRONIX_BASE =
  "https://api.zafronix.com/fifa/worldcup/v1";

async function getWcFixtures(req, res) {
  const apiKey = process.env.ZAFRONIX_API_KEY;

  if (!apiKey) {
    return res
      .status(503)
      .json({
        message:
          "ZAFRONIX_API_KEY chưa cấu hình",
      });
  }

  try {
    const { round } = req.query;

    const stageParam = mapRoundToStage(round);

    const params = new URLSearchParams({
      year: "2026",
    });

    if (stageParam) {
      params.append("stage", stageParam);
    }

    const response = await fetch(
      `${ZAFRONIX_BASE}/matches?${params.toString()}`,
      {
        headers: {
          "X-API-Key": apiKey,
        },
      }
    );

    if (response.status === 429) {
      return res.status(429).json({
        message: "Quá giới hạn quota Zafronix",
      });
    }

    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({}));

      return res.status(502).json({
        message: "Lỗi Zafronix API",
        details: err.message || "Unknown error",
      });
    }

    const data = await response.json();

    const remaining = response.headers.get(
      "X-RateLimit-Remaining"
    );

    if (remaining) {
      console.log(
        `[Zafronix] Quota còn: ${remaining}`
      );
    }

    const fixtures = (data.data || []).map(
      (m) => ({
        fixtureId: m.id,
        matchDate: `${m.date}T${
          m.kickoff || "00:00"
        }:00Z`,
        status: mapStatus(m),
        round: mapStageToRound(
          m.stageNormalized || m.stage
        ),
        homeTeam: {
          id: m.homeTeam,
          name: m.homeTeam,
          logo: buildFlagUrl(m.homeTeam),
        },
        awayTeam: {
          id: m.awayTeam,
          name: m.awayTeam,
          logo: buildFlagUrl(m.awayTeam),
        },
        homeGoals: m.homeScore ?? null,
        awayGoals: m.awayScore ?? null,
        stadium: m.stadium ?? null,
        city: m.city ?? null,
      })
    );

    // ─── GROUP STATS ─────────────────────────────
    const groupFixtures = fixtures.filter(
      (f) => f.round === "Vòng bảng"
    );

    const done = groupFixtures.filter(
      (f) => f.status === "FT"
    );

    const groupStats = {
      total: groupFixtures.length,
      done: done.length,
      homeWins: done.filter(
        (f) => f.homeGoals > f.awayGoals
      ).length,
      awayWins: done.filter(
        (f) => f.homeGoals < f.awayGoals
      ).length,
      draws: done.filter(
        (f) => f.homeGoals === f.awayGoals
      ).length,
    };

    res.json({ fixtures, groupStats });
  } catch (err) {
    console.error("WC API error:", err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

// ─── STATUS ─────────────────────────────────────
function mapStatus(m) {
  if (m.homeScore !== null && m.awayScore !== null) {
    if (m.penalties) return "PEN";
    if (m.extraTime) return "AET";
    return "FT";
  }
  return "NS";
}

// ─── STAGE → ROUND ──────────────────────────────
function mapStageToRound(stage) {
  if (!stage) return "Vòng bảng";
  if (stage.startsWith("group_"))
    return "Vòng bảng";
  if (stage === "round_of_32")
    return "Vòng 1/16";
  if (stage === "round_of_16")
    return "Vòng 1/8";
  if (stage === "quarter_final")
    return "Tứ kết";
  if (stage === "semi_final")
    return "Bán kết";
  if (stage === "third_place")
    return "Tranh hạng 3";
  if (stage === "final")
    return "Chung kết";
  return "Vòng bảng";
}

// ─── ROUND → STAGE ─────────────────────────────
function mapRoundToStage(round) {
  if (!round) return null;

  switch (round) {
    case "Vòng 1/16":
      return "round_of_32";
    case "Vòng 1/8":
      return "round_of_16";
    case "Tứ kết":
      return "quarter_final";
    case "Bán kết":
      return "semi_final";
    case "Tranh hạng 3":
      return "third_place";
    case "Chung kết":
      return "final";
    default:
      return null;
  }
}

// ─── FLAG ───────────────────────────────────────
function buildFlagUrl(teamName) {
  const isoMap = {
    USA: "us",
    "United States": "us",
    Mexico: "mx",
    Canada: "ca",
    Brazil: "br",
    Argentina: "ar",
    Uruguay: "uy",
    Colombia: "co",
    Ecuador: "ec",
    Peru: "pe",
    Chile: "cl",
    Paraguay: "py",
    Panama: "pa",
    "Costa Rica": "cr",
    Honduras: "hn",
    Jamaica: "jm",
    Germany: "de",
    France: "fr",
    Spain: "es",
    England: "gb-eng",
    Portugal: "pt",
    Italy: "it",
    Netherlands: "nl",
    Belgium: "be",
    Switzerland: "ch",
    Croatia: "hr",
    Serbia: "rs",
    Austria: "at",
    Poland: "pl",
    "Czech Republic": "cz",
    Ukraine: "ua",
    Turkey: "tr",
    Morocco: "ma",
    Senegal: "sn",
    Nigeria: "ng",
    Cameroon: "cm",
    Ghana: "gh",
    Tunisia: "tn",
    Egypt: "eg",
    Algeria: "dz",
    Japan: "jp",
    "South Korea": "kr",
    Australia: "au",
    Vietnam: "vn",
  };

  const iso = isoMap[teamName];

  return iso
    ? `https://flagcdn.com/w80/${iso}.png`
    : `https://flagcdn.com/w80/un.png`;
}

module.exports = { getWcFixtures };