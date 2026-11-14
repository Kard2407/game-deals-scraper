@echo off
echo ======================================================================
echo Iniciando Servidor Web Local - GameScraper Deals (Bloque 2)
echo IC3101 Arquitectura de Computadoras - TEC San Carlos
echo ======================================================================
echo.
echo Abriendo servidor local en http://localhost:8000/
echo Presiona Ctrl+C para detener el servidor.
echo.
cd web
python -m http.server 8000
pause
