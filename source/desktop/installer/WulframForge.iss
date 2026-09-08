#ifndef PayloadDir
  #error PayloadDir is required
#endif
#ifndef OutputDir
  #error OutputDir is required
#endif
[Setup]
AppId={{62B874D5-12D3-4FD9-A0E5-6E9674F257D7}
AppName=Wulfram Forge
AppVersion=0.7.0.109
AppVerName=Wulfram Forge - Private v109
AppPublisher=Blackwater Gaming
DefaultDirName={localappdata}\Programs\Wulfram Forge
DefaultGroupName=Wulfram Forge
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutputDir}
OutputBaseFilename=WulframForge-Setup-v109
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\WulframForgeLauncher.exe
CloseApplications=yes
RestartApplications=no
SetupLogging=yes
[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: unchecked
[Files]
Source: "{#PayloadDir}\WulframForgeLauncher.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#PayloadDir}\WulframForge.exe"; DestDir: "{app}\Editor"; Flags: ignoreversion
Source: "{#PayloadDir}\START-HERE.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#PayloadDir}\MicrosoftEdgeWebview2Setup.exe"; Flags: dontcopy
[Icons]
Name: "{group}\Wulfram Forge"; Filename: "{app}\WulframForgeLauncher.exe"; Parameters: "--config ""{app}\launcher-settings.json"""; WorkingDir: "{app}"
Name: "{userdesktop}\Wulfram Forge"; Filename: "{app}\WulframForgeLauncher.exe"; Parameters: "--config ""{app}\launcher-settings.json"""; WorkingDir: "{app}"; Tasks: desktopicon
[Run]
Filename: "{app}\WulframForgeLauncher.exe"; Parameters: "--config ""{app}\launcher-settings.json"""; Description: "Open Wulfram Forge Launcher"; Flags: nowait postinstall skipifsilent
[UninstallDelete]
Type: files; Name: "{app}\launcher-settings.json"
[Code]
const WebViewKey = 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';
function HasWebView2: Boolean;
var V: String;
begin
  Result := (RegQueryStringValue(HKLM32, WebViewKey, 'pv', V) and (V <> '') and (V <> '0.0.0.0')) or
            (RegQueryStringValue(HKCU, WebViewKey, 'pv', V) and (V <> '') and (V <> '0.0.0.0'));
end;
function PrepareToInstall(var NeedsRestart: Boolean): String;
var Code: Integer;
begin
  Result := '';
  if not HasWebView2 then begin
    ExtractTemporaryFile('MicrosoftEdgeWebview2Setup.exe');
    if not Exec(ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe'), '/silent /install', '', SW_HIDE, ewWaitUntilTerminated, Code) then
      Result := 'Could not start Microsoft WebView2 setup. Install WebView2 and run Forge setup again.'
    else if not HasWebView2 then
      Result := 'Microsoft WebView2 was not installed. Check your internet connection, install WebView2, and run Forge setup again.';
  end;
end;
procedure CurStepChanged(CurStep: TSetupStep);
var Code: Integer;
    Args: String;
begin
  if (CurStep = ssPostInstall) and not FileExists(ExpandConstant('{app}\launcher-settings.json')) then begin
    Args := ExpandConstant('--config "{app}\launcher-settings.json" --configure "{app}\Editor\WulframForge.exe"');
    if not Exec(ExpandConstant('{app}\WulframForgeLauncher.exe'), Args, '', SW_HIDE, ewWaitUntilTerminated, Code) then
      RaiseException('Could not configure the Forge launcher. Run setup again.')
    else if Code <> 0 then RaiseException('The Forge launcher could not save its settings. Run setup again.');
  end;
end;
