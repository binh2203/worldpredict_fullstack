-- ============================================================
-- WorldPredict 2026 — PostgreSQL Schema
-- Chạy 1 lần để khởi tạo DB
-- ============================================================

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Users (
  Id           SERIAL        PRIMARY KEY,
  Username     VARCHAR(50)   NOT NULL UNIQUE,
  PasswordHash VARCHAR(255)  NOT NULL,
  FullName     VARCHAR(100)  NOT NULL,
  Phone        VARCHAR(20),
  Role         VARCHAR(10)   NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
  Points       INTEGER       NOT NULL DEFAULT 0,
  IsActive     BOOLEAN       NOT NULL DEFAULT TRUE,
  CreatedAt    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ── Matches ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Matches (
  Id           SERIAL        PRIMARY KEY,
  HomeTeamId   INTEGER       NOT NULL DEFAULT 0,
  HomeTeamName VARCHAR(100)  NOT NULL,
  HomeTeamLogo VARCHAR(500),
  AwayTeamId   INTEGER       NOT NULL DEFAULT 0,
  AwayTeamName VARCHAR(100)  NOT NULL,
  AwayTeamLogo VARCHAR(500),
  MatchDate    TIMESTAMP     NOT NULL,
  Round        VARCHAR(50)   NOT NULL,
  Status       VARCHAR(10)   NOT NULL DEFAULT 'NS',     -- NS|1H|HT|2H|FT|AET|PEN
  HomeGoals    INTEGER,
  AwayGoals    INTEGER,
  Handicap     NUMERIC(5,2)  NOT NULL DEFAULT 0,
  IsLocked     BOOLEAN       NOT NULL DEFAULT FALSE,
  LockedAt     TIMESTAMP,
  ResultLocked BOOLEAN       NOT NULL DEFAULT FALSE,
  ResultSetAt  TIMESTAMP,
  ResultSetBy  INTEGER       REFERENCES Users(Id)
);

-- ── Predictions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Predictions (
  Id        SERIAL       PRIMARY KEY,
  UserId    INTEGER      NOT NULL REFERENCES Users(Id),
  MatchId   INTEGER      NOT NULL REFERENCES Matches(Id),
  Choice    VARCHAR(10)  NOT NULL,                      -- 'home' | 'away'
  CreatedAt TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE (UserId, MatchId)                              -- 1 dự đoán/người/trận
);

-- ── BetRules ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS BetRules (
  Id                SERIAL      PRIMARY KEY,
  Round             VARCHAR(50) NOT NULL UNIQUE,
  WinPoints         INTEGER     NOT NULL DEFAULT 3,
  LosePoints        INTEGER     NOT NULL DEFAULT 1,
  DefaultLosePoints INTEGER     NOT NULL DEFAULT 2
);

INSERT INTO BetRules (Round, WinPoints, LosePoints, DefaultLosePoints) VALUES
  ('Vòng bảng',    3,  1, 2),
  ('Vòng 1/16',    4,  1, 2),
  ('Vòng 1/8',     5,  2, 3),
  ('Tứ kết',       7,  3, 4),
  ('Bán kết',      10, 4, 6),
  ('Tranh hạng 3', 10, 4, 6),
  ('Chung kết',    15, 5, 8)
ON CONFLICT (Round) DO NOTHING;

-- ── PredictionResults ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS PredictionResults (
  Id           SERIAL       PRIMARY KEY,
  PredictionId INTEGER      REFERENCES Predictions(Id),  -- NULL nếu không dự đoán
  UserId       INTEGER      NOT NULL REFERENCES Users(Id),
  MatchId      INTEGER      NOT NULL REFERENCES Matches(Id),
  IsCorrect    BOOLEAN      NOT NULL DEFAULT FALSE,
  PointChange  INTEGER      NOT NULL,
  Reason       VARCHAR(20)  NOT NULL,                    -- 'win' | 'lose' | 'no_prediction'
  CalculatedAt TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNCTION: sp_set_match_result
-- Niêm phong kết quả + tính điểm tự động
-- Gọi: SELECT sp_set_match_result(matchId, homeGoals, awayGoals, adminId)
-- ============================================================
CREATE OR REPLACE FUNCTION sp_set_match_result(
  p_match_id   INTEGER,
  p_home_goals INTEGER,
  p_away_goals INTEGER,
  p_admin_id   INTEGER
) RETURNS VOID AS $$
DECLARE
  v_round        VARCHAR(50);
  v_handicap     NUMERIC(5,2);
  v_win_pts      INTEGER;
  v_lose_pts     INTEGER;
  v_default_pts  INTEGER;
  v_adj_home     NUMERIC(7,2);
  v_actual_result VARCHAR(10);
BEGIN
  -- Guard: đã niêm phong rồi thì không cho sửa
  IF EXISTS (SELECT 1 FROM Matches WHERE Id = p_match_id AND ResultLocked = TRUE) THEN
    RAISE EXCEPTION 'Kết quả đã được niêm phong, không thể thay đổi.';
  END IF;

  SELECT Round, COALESCE(Handicap, 0)
  INTO v_round, v_handicap
  FROM Matches WHERE Id = p_match_id;

  SELECT
    COALESCE(WinPoints, 3),
    COALESCE(LosePoints, 1),
    COALESCE(DefaultLosePoints, 2)
  INTO v_win_pts, v_lose_pts, v_default_pts
  FROM BetRules WHERE Round = v_round;

  -- Fallback nếu BetRules chưa có vòng này
  v_win_pts     := COALESCE(v_win_pts, 3);
  v_lose_pts    := COALESCE(v_lose_pts, 1);
  v_default_pts := COALESCE(v_default_pts, 2);

  v_adj_home := p_home_goals + v_handicap;
  v_actual_result :=
    CASE
      WHEN v_adj_home > p_away_goals THEN 'home'
      WHEN v_adj_home < p_away_goals THEN 'away'
      ELSE 'draw'
    END;

  -- Niêm phong kết quả
  UPDATE Matches
  SET HomeGoals    = p_home_goals,
      AwayGoals    = p_away_goals,
      Status       = 'FT',
      IsLocked     = TRUE,
      ResultLocked = TRUE,
      ResultSetAt  = NOW(),
      ResultSetBy  = p_admin_id
  WHERE Id = p_match_id;

  -- Tính điểm người đã dự đoán
  INSERT INTO PredictionResults (PredictionId, UserId, MatchId, IsCorrect, PointChange, Reason)
  SELECT
    p.Id,
    p.UserId,
    p_match_id,
    (p.Choice = v_actual_result),
    CASE WHEN p.Choice = v_actual_result THEN v_win_pts ELSE -v_lose_pts END,
    CASE WHEN p.Choice = v_actual_result THEN 'win' ELSE 'lose' END
  FROM Predictions p
  WHERE p.MatchId = p_match_id;

  -- Cập nhật Points user đã dự đoán
  UPDATE Users u
  SET Points = u.Points + r.PointChange
  FROM PredictionResults r
  WHERE r.UserId   = u.Id
    AND r.MatchId  = p_match_id
    AND r.CalculatedAt >= NOW() - INTERVAL '5 seconds';

  -- Trừ điểm người KHÔNG dự đoán
  INSERT INTO PredictionResults (PredictionId, UserId, MatchId, IsCorrect, PointChange, Reason)
  SELECT NULL, u.Id, p_match_id, FALSE, -v_default_pts, 'no_prediction'
  FROM Users u
  WHERE u.Role     = 'user'
    AND u.IsActive = TRUE
    AND u.Id NOT IN (SELECT UserId FROM Predictions WHERE MatchId = p_match_id);

  UPDATE Users u
  SET Points = u.Points - v_default_pts
  WHERE u.Role     = 'user'
    AND u.IsActive = TRUE
    AND u.Id NOT IN (SELECT UserId FROM Predictions WHERE MatchId = p_match_id);

END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: sp_auto_lock_matches
-- Khóa trận trước 30 phút thi đấu
-- Gọi: SELECT sp_auto_lock_matches()
-- ============================================================
CREATE OR REPLACE FUNCTION sp_auto_lock_matches()
RETURNS VOID AS $$
BEGIN
  UPDATE Matches
  SET IsLocked = TRUE,
      LockedAt = NOW()
  WHERE IsLocked     = FALSE
    AND ResultLocked = FALSE
    AND MatchDate - NOW() <= INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- ── Admin mặc định (password: admin123) ───────────────────────────────────
INSERT INTO Users (Username, PasswordHash, FullName, Role)
VALUES (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVwB01DBi2',
  'Administrator',
  'admin'
) ON CONFLICT (Username) DO NOTHING;
