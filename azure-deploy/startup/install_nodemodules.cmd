cd /d "%~dp0"

echo npm LOG > npmlog.txt

if "%EMULATED%"=="true" exit /b 0

powershell -c "set-executionpolicy unrestricted"
powershell .\download.ps1 "http://npmjs.org/dist/npm-1.1.9.zip"

7za x npm-1.1.9.zip -y -obin 1>> npmlog.txt 2>> npmlogerr.txt
bin\npm install 1>> npmlog.txt 2>> npmlogerr.txt

echo SUCCESS
exit /b 0

:error

echo FAILED
exit /b -1