param([Parameter(Mandatory=$true)][int]$TestProcessId,[Parameter(Mandatory=$true)][string]$ExpectedExecutable,[ValidateSet('Activate','Close')][string]$Action='Activate')
$ErrorActionPreference = 'Stop'
$testProcess = Get-Process -Id $TestProcessId
if ([IO.Path]::GetFullPath($testProcess.Path) -ne [IO.Path]::GetFullPath($ExpectedExecutable)) { throw 'Test process executable does not match; refusing window activation.' }
if ($testProcess.MainWindowHandle -eq 0) { throw 'Test process has no main window.' }
if ($Action -eq 'Close') {
  [pscustomobject]@{processId=$TestProcessId;closeRequested=$testProcess.CloseMainWindow()} | ConvertTo-Json -Compress
  exit
}
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ForgeTestWindow {
 [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int command);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
}
'@
if ([ForgeTestWindow]::IsIconic($testProcess.MainWindowHandle)) { [void][ForgeTestWindow]::ShowWindowAsync($testProcess.MainWindowHandle,9) }
$accepted = [ForgeTestWindow]::SetForegroundWindow($testProcess.MainWindowHandle)
Start-Sleep -Milliseconds 150
[pscustomobject]@{processId=$TestProcessId;requestAccepted=$accepted;foreground=([ForgeTestWindow]::GetForegroundWindow() -eq $testProcess.MainWindowHandle)} | ConvertTo-Json -Compress
