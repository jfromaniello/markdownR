@ECHO off
%~d0
CD "%~dp0"

IF EXIST %WINDIR%\SysWow64 (
set powerShellDir=%WINDIR%\SysWow64\windowspowershell\v1.0
) ELSE (
set powerShellDir=%WINDIR%\system32\windowspowershell\v1.0
)

ECHO Setting the Environment variables..
CALL %powerShellDir%\powershell.exe -Command Set-ExecutionPolicy unrestricted
CALL %powerShellDir%\powershell.exe -Command "& .\set_azure_role_information.ps1"

echo SUCCESS
exit /b 0
