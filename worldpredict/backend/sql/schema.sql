-- ─── DATABASE SCHEMA: PredictWC2026 ──────────────────────────────────────────
-- Chạy file này 1 lần để khởi tạo DB
-- Local:   Server=localhost\SQLEXPRESS hoặc localhost\MSSQLSERVER02
-- Cloud:   Điền DB_SERVER trong .env

CREATE DATABASE PredictWC2026;
GO
USE PredictWC2026;
GO

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE Users (
  Id           INT           IDENTITY(1,1) PRIMARY KEY,
  Username     NVARCHAR(50)  UNIQUE NOT NULL,
  PasswordHash NVARCHAR(255) NOT NULL,
  FullName     NVARCHAR(100) NOT NULL,
  Phone        NVARCHAR(20),
  Role         NVARCHAR(10)  NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  Points       INT           NOT NULL DEFAULT 0,        -- điểm tích lũy
  IsActive     BIT           NOT NULL DEFAULT 1,
  CreatedAt    DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- Admin mặc định (password: admin123)
INSERT INTO Users (Username, PasswordHash, FullName, Role)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVwB01DBi2', 'Administrator', 'admin');
GO

-- ── Teams (cache logo từ Zafronix/flagcdn) ────────────────────────────────────
-- Không bắt buộc — Matches lưu trực tiếp tên+logo
-- (Để trống, Matches dùng HomeTeamName/AwayTeamName trực tiếp)

-- ── Matches ───────────────────────────────────────────────────────────────────
CREATE TABLE Matches (
  Id           INT           IDENTITY(1,1) PRIMARY KEY,
  HomeTeamId   INT           NOT NULL DEFAULT 0,       -- 0 nếu chưa có Teams table
  HomeTeamName NVARCHAR(100) NOT NULL,
  HomeTeamLogo NVARCHAR(500),
  AwayTeamId   INT           NOT NULL DEFAULT 0,
  AwayTeamName NVARCHAR(100) NOT NULL,
  AwayTeamLogo NVARCHAR(500),
  MatchDate    DATETIME2     NOT NULL,
  Round        NVARCHAR(50)  NOT NULL,
  Status       NVARCHAR(10)  NOT NULL DEFAULT 'NS',    -- NS|1H|HT|2H|FT|AET|PEN
  HomeGoals    INT,
  AwayGoals    INT,
  Handicap     FLOAT,
  IsLocked     BIT           NOT NULL DEFAULT 0,
  LockedAt     DATETIME2,
  ResultLocked BIT           NOT NULL DEFAULT 0,       -- TRUE vĩnh viễn sau khi set kết quả
  ResultSetAt  DATETIME2,
  ResultSetBy  INT REFERENCES Users(Id)
);
GO

-- ── Predictions ───────────────────────────────────────────────────────────────
CREATE TABLE Predictions (
  Id        INT          IDENTITY(1,1) PRIMARY KEY,
  UserId    INT          NOT NULL REFERENCES Users(Id),
  MatchId   INT          NOT NULL REFERENCES Matches(Id),
  Choice    NVARCHAR(10) NOT NULL,                     -- 'home' | 'draw' | 'away'
  CreatedAt DATETIME2    NOT NULL DEFAULT GETUTCDATE(),
  UNIQUE (UserId, MatchId)                             -- 1 dự đoán/người/trận
);
GO

-- ── BetRules ──────────────────────────────────────────────────────────────────
CREATE TABLE BetRules (
  Id                INT          IDENTITY(1,1) PRIMARY KEY,
  Round             NVARCHAR(50) UNIQUE NOT NULL,
  WinPoints         INT          NOT NULL DEFAULT 3,
  LosePoints        INT          NOT NULL DEFAULT 1,
  DefaultLosePoints INT          NOT NULL DEFAULT 2
);

INSERT INTO BetRules (Round, WinPoints, LosePoints, DefaultLosePoints) VALUES
  (N'Vòng bảng',    3,  1, 2),
  (N'Vòng 1/16',    4,  1, 2),
  (N'Vòng 1/8',     5,  2, 3),
  (N'Tứ kết',       7,  3, 4),
  (N'Bán kết',      10, 4, 6),
  (N'Tranh hạng 3', 10, 4, 6),
  (N'Chung kết',    15, 5, 8);
GO

-- ── PredictionResults ─────────────────────────────────────────────────────────
CREATE TABLE PredictionResults (
  Id           INT           IDENTITY(1,1) PRIMARY KEY,
  PredictionId INT           REFERENCES Predictions(Id),  -- NULL nếu không dự đoán
  UserId       INT           NOT NULL REFERENCES Users(Id),
  MatchId      INT           NOT NULL REFERENCES Matches(Id),
  IsCorrect    BIT           NOT NULL DEFAULT 0,
  PointChange  INT           NOT NULL,                    -- +3 / -1 / -2 …
  Reason       NVARCHAR(20)  NOT NULL,                    -- 'win' | 'lose' | 'no_prediction'
  CalculatedAt DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ─── SP: sp_SetMatchResult ────────────────────────────────────────────────────
-- Guard niêm phong + tính điểm tự động
CREATE OR ALTER PROCEDURE sp_SetMatchResult
  @MatchId   INT,
  @HomeGoals INT,
  @AwayGoals INT,
  @AdminId   INT
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (SELECT 1 FROM Matches WHERE Id=@MatchId AND ResultLocked=1)
  BEGIN
    RAISERROR(N'Kết quả đã được niêm phong, không thể thay đổi.', 16, 1);
    RETURN;
  END

  DECLARE @Round    NVARCHAR(50), @Handicap FLOAT;
  SELECT @Round=Round, @Handicap=Handicap FROM Matches WHERE Id=@MatchId;

  DECLARE @WinPts INT, @LosePts INT, @DefaultPts INT;
  SELECT @WinPts=WinPoints, @LosePts=LosePoints, @DefaultPts=DefaultLosePoints
  FROM BetRules WHERE Round=@Round;

  -- Fallback nếu BetRules chưa có vòng này
  SET @WinPts     = ISNULL(@WinPts, 3);
  SET @LosePts    = ISNULL(@LosePts, 1);
  SET @DefaultPts = ISNULL(@DefaultPts, 2);

  DECLARE @AdjHome    FLOAT     = @HomeGoals + ISNULL(@Handicap, 0);
  DECLARE @ActualResult NVARCHAR(10) =
    CASE WHEN @AdjHome > @AwayGoals THEN 'home'
         WHEN @AdjHome < @AwayGoals THEN 'away'
         ELSE 'draw' END;

  BEGIN TRANSACTION;

  -- Niêm phong kết quả
  UPDATE Matches
  SET HomeGoals=@HomeGoals, AwayGoals=@AwayGoals, Status='FT',
      IsLocked=1, ResultLocked=1, ResultSetAt=GETUTCDATE(), ResultSetBy=@AdminId
  WHERE Id=@MatchId;

  -- Tính điểm người đã dự đoán
  INSERT INTO PredictionResults (PredictionId, UserId, MatchId, IsCorrect, PointChange, Reason)
  SELECT p.Id, p.UserId, @MatchId,
    CASE WHEN p.Choice=@ActualResult THEN 1 ELSE 0 END,
    CASE WHEN p.Choice=@ActualResult THEN @WinPts ELSE -@LosePts END,
    CASE WHEN p.Choice=@ActualResult THEN 'win' ELSE 'lose' END
  FROM Predictions p WHERE p.MatchId=@MatchId;

  -- Cập nhật Points user đã dự đoán
  UPDATE u SET u.Points = u.Points + r.PointChange
  FROM Users u
  JOIN PredictionResults r ON r.UserId=u.Id
  WHERE r.MatchId=@MatchId
    AND r.CalculatedAt > DATEADD(SECOND,-5,GETUTCDATE());

  -- Trừ điểm người KHÔNG dự đoán
  INSERT INTO PredictionResults (PredictionId, UserId, MatchId, IsCorrect, PointChange, Reason)
  SELECT NULL, u.Id, @MatchId, 0, -@DefaultPts, 'no_prediction'
  FROM Users u
  WHERE u.Role='user' AND u.IsActive=1
    AND u.Id NOT IN (SELECT UserId FROM Predictions WHERE MatchId=@MatchId);

  UPDATE u SET u.Points = u.Points - @DefaultPts
  FROM Users u
  WHERE u.Role='user' AND u.IsActive=1
    AND u.Id NOT IN (SELECT UserId FROM Predictions WHERE MatchId=@MatchId);

  COMMIT;
END;
GO

-- ─── SP: sp_AutoLockMatches ───────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_AutoLockMatches AS
BEGIN
  UPDATE Matches
  SET IsLocked=1, LockedAt=GETUTCDATE()
  WHERE IsLocked=0 AND ResultLocked=0
    AND DATEDIFF(MINUTE, GETUTCDATE(), MatchDate) <= 30;
END;
GO
