Set shell = CreateObject("WScript.Shell")

scriptFolder = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
launcher = scriptFolder & "\hca-launcher.ps1"

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & launcher & """"

shell.Run command, 0, False