@echo off
setlocal

cd /d "%~dp0backend"

if not exist node_modules (
  echo Instalando dependencias do backend...
  call npm install
  if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

echo Iniciando site em http://localhost:3000
start "" cmd /c "timeout /t 2 >nul && start "" http://localhost:3000"
call npm start
