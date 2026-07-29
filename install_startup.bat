@echo off
echo Creating auto-startup task for hardware design tools...
echo.

schtasks /create /tn "AutoHardwareTools" /tr "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File C:\codexprojects\auto-hardware-design\startup.ps1" /sc onlogon /delay 0000:15 /rl highest /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: Task created! Both servers will auto-start on next login.
    echo   - Port 8080: Capacitor/Safety Calculator
    echo   - Port 5000: File Transfer
    echo.
    echo To test now, run: powershell.exe -File C:\codexprojects\auto-hardware-design\startup.ps1
) else (
    echo.
    echo FAILED: Please right-click this batch file and select "Run as administrator"
)

pause
