@echo off
rem FoundationOS 0.2 client launcher. Starts the versioned client host against
rem the separately running FoundationOS 0.1 server.
rem
rem Usage: Start.cmd <server-url> [host options]
rem Example: Start.cmd http://127.0.0.1:8787 --no-open
rem If no argument is given, FOUNDATIONOS_SERVER is used.
setlocal EnableDelayedExpansion
if "%~1"=="" (
  if "%FOUNDATIONOS_SERVER%"=="" (
    echo Usage: Start.cmd ^<server-url^> [host options]
    echo Example: Start.cmd http://127.0.0.1:8787 --no-open
    echo   (or set FOUNDATIONOS_SERVER and pass only host options)
    exit /b 2
  )
  node "%~dp0FoundationOS\host\serve.mjs" %*
  set "result=!errorlevel!"
  if not "!result!"=="0" pause
  exit /b !result!
)
set "SERVER=%~1"
node "%~dp0FoundationOS\host\serve.mjs" --server "!SERVER!" %2 %3 %4 %5 %6 %7 %8 %9
set "result=!errorlevel!"
if not "!result!"=="0" pause
exit /b !result!
