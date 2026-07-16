@echo off
REM ============================================================
REM  Push this portfolio to GitHub.
REM  DOUBLE-CLICK this file, OR right-click > Run.
REM
REM  BEFORE running: create an EMPTY repo on GitHub named
REM  tahsinapac-ops.github.io  (do NOT add a README).
REM  github.com/new
REM
REM  On the push step a browser window will open to sign you
REM  into GitHub - approve it. That's your existing account.
REM ============================================================

setlocal
cd /d "%~dp0"

REM Locate git (PATH first, then the user-profile install)
where git >nul 2>&1
if %errorlevel%==0 (
  set "GIT=git"
) else (
  set "GIT=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
)

echo.
echo === Using git: %GIT%
"%GIT%" --version || (echo Could not run git & pause & exit /b 1)

echo.
echo === Initializing repository...
"%GIT%" init
"%GIT%" config user.name  "Tahsin Tazwar"
"%GIT%" config user.email "tahsin@outsourcetobd.com"

echo.
echo === Staging and committing...
"%GIT%" add -A
"%GIT%" commit -m "Portfolio: Tahsin Tazwar, Co-Founder of Outsource to BD"
"%GIT%" branch -M main

echo.
echo === Connecting to GitHub and pushing...
"%GIT%" remote remove origin >nul 2>&1
"%GIT%" remote add origin https://github.com/tahsinapac-ops/tahsinapac-ops.github.io.git
"%GIT%" push -u origin main

echo.
echo ============================================================
echo  Done. If it succeeded, next:
echo   1) GitHub repo - Settings - Pages - Source: GitHub Actions
echo   2) Set the hostsheba DNS records (see DEPLOY-DOMAIN.md)
echo ============================================================
pause
