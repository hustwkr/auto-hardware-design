Set ws = CreateObject("WScript.Shell")
ws.CurrentDirectory = "C:\codexprojects\auto-hardware-design\backend"
ws.Run """C:\nvm4w\nodejs\node.exe"" server.js", 0, False
