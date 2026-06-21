@echo off
REM 地牢突袭 · Windows 命令行包装器
REM 用法：dr.bat <命令> [参数]
REM 示例：dr.bat release
REM         dr.bat deploy
REM         dr.bat test

setlocal EnableDelayedExpansion
set SCRIPTDIR=%~dp0
set ARGS=%*

if "%1"=="" (
  powershell -ExecutionPolicy Bypass -NoProfile -File "%SCRIPTDIR%dr.ps1" help
  goto :eof
)

REM 把所有参数传递给 dr.ps1
powershell -ExecutionPolicy Bypass -NoProfile -File "%SCRIPTDIR%dr.ps1" %*

endlocal
