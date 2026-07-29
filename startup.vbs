' Auto-start hardware design tools (hidden windows)
' Port 8080 — Capacitor/Safety Calculator
' Port 5000 — File Transfer

Dim shell
Set shell = CreateObject("WScript.Shell")

' Node.js server (port 8080) — change working dir first
shell.Run "cmd /c cd /d C:\codexprojects\auto-hardware-design\backend && node server.js", 0, False

' Python Flask server (port 5000)
shell.Run "cmd /c cd /d C:\codexprojects\file-trans && python app.py", 0, False

Set shell = Nothing
