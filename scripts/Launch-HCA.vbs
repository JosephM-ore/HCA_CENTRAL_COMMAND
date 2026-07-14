Set shell = CreateObject("WScript.Shell")

launcher = "C:\Users\jmoore\HCA_CENTRAL_COMMAND\scripts\hca-launcher.ps1"
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & launcher & """"

shell.Run command, 0, False