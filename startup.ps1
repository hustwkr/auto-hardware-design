# Auto-start hardware design tools (hidden windows)
# Start-Process with -WindowStyle Hidden runs without showing any window

$nodeDir = "C:\codexprojects\auto-hardware-design\backend"
$pyDir   = "C:\codexprojects\file-trans"

Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $nodeDir -WindowStyle Hidden
Start-Process -FilePath "python" -ArgumentList "app.py" -WorkingDirectory $pyDir -WindowStyle Hidden
