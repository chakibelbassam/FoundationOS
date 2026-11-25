@echo off
setlocal
node "%~dp0FoundationOS Server\server.ts" %*
set "result=%errorlevel%"
if not "%result%"=="0" pause
exit /b %result%
