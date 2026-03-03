@echo off
D:
cd D:\Apps\DocReady
echo Installing all dependencies from package.json...
npm install
echo Done. Exit code: %ERRORLEVEL%
