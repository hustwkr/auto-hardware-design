schtasks /create /tn AutoHardwareTools /tr "wscript.exe C:\codexprojects\auto-hardware-design\startup.vbs" /sc onlogon /delay 0000:15 /rl limited /f
