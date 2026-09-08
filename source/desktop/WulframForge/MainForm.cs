using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace WulframForge;

internal sealed class MainForm : Form
{
    private readonly WebView2 webView = new() { Dock = DockStyle.Fill };
    private readonly StartupScreen startupScreen = new();
    private readonly MapRepositoryHost repositoryHost;
    private McpEditorHost? mcpHost;

    public MainForm(string[] args)
    {
        repositoryHost = new MapRepositoryHost(args, this);
        Text = "Wulfram Forge";
        BackColor = Color.FromArgb(16, 18, 20);
        ForeColor = Color.FromArgb(233, 230, 225);
        AutoScaleMode = AutoScaleMode.Dpi;
        MinimumSize = new Size(960, 640);
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        Controls.Add(webView);
        webView.DefaultBackgroundColor = BackColor;
        Controls.Add(startupScreen);
        startupScreen.BringToFront();
        FormClosing += (_, e) => Program.TraceStartup($"Form closing: {e.CloseReason}");
        Shown += async (_, _) => await InitializeWebViewAsync();
        FormClosed += (_, _) => mcpHost?.Dispose();
    }

    private async Task InitializeWebViewAsync()
    {
        try
        {
            Program.TraceStartup("Extracting web assets");
            startupScreen.SetStage("Loading terrain and unit assets");
            string webRoot = await Task.Run(WebAssets.Extract);
            if (IsDisposed || Disposing) return;
            Program.TraceStartup("Web assets ready");
            string? userDataOverride = Environment.GetEnvironmentVariable("WULFRAM_FORGE_USER_DATA_DIR");
            string userData = string.IsNullOrWhiteSpace(userDataOverride)
                ? Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "BlackwaterGaming",
                    "WulframForge",
                    "WebView2")
                : Path.GetFullPath(Environment.ExpandEnvironmentVariables(userDataOverride));
            Directory.CreateDirectory(userData);

            string fixedRuntime = Path.Combine(AppContext.BaseDirectory, "WebView2Runtime");
            string? browserFolder = File.Exists(Path.Combine(fixedRuntime, "msedgewebview2.exe"))
                ? fixedRuntime
                : null;
            string? debuggingPort = Environment.GetEnvironmentVariable("WULFRAM_FORGE_REMOTE_DEBUGGING_PORT");
            CoreWebView2EnvironmentOptions? options = int.TryParse(debuggingPort, out int port) && port is > 0 and <= 65535
                ? new CoreWebView2EnvironmentOptions($"--remote-debugging-port={port}")
                : null;
            Program.TraceStartup("Creating WebView environment");
            startupScreen.SetStage("Starting the editor");
            // Single-file apps extract native libraries away from the executable.
            // WebView's custom loader needs that absolute directory explicitly.
            string[] nativeDirectories = ((string?)AppContext.GetData("NATIVE_DLL_SEARCH_DIRECTORIES") ?? "")
                .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries);
            string? loaderDirectory = nativeDirectories.FirstOrDefault(directory =>
                File.Exists(Path.Combine(directory, "WebView2Loader.dll")));
            if (loaderDirectory is not null)
            {
                CoreWebView2Environment.SetLoaderDllFolderPath(loaderDirectory);
                Program.TraceStartup("Using extracted WebView loader");
            }
            CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(browserFolder, userData, options);
            Program.TraceStartup("Ensuring WebView control");
            await webView.EnsureCoreWebView2Async(environment);
            Program.TraceStartup("WebView control ready");
            webView.ZoomFactor = 1.0;

            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.IsZoomControlEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "wulfram-forge.local",
                webRoot,
                CoreWebView2HostResourceAccessKind.DenyCors);
            webView.CoreWebView2.WebMessageReceived += (sender, message) =>
            {
                if (message.WebMessageAsJson == "\"forge-startup-ready\"")
                {
                    if (!startupScreen.IsDisposed)
                    {
                        startupScreen.Visible = false;
                        startupScreen.Dispose();
                        Program.TraceStartup("Startup screen dismissed: editor initialized");
                    }
                }
                else repositoryHost.HandleMessage(sender, message);
            };
            webView.CoreWebView2.NavigationCompleted += (_, navigation) =>
            {
                if (!navigation.IsSuccess)
                {
                    if (!startupScreen.IsDisposed)
                    {
                        startupScreen.Visible = false;
                        startupScreen.Dispose();
                    }
                    MessageBox.Show(this, $"The editor page could not load ({navigation.WebErrorStatus}). Please restart the editor.",
                        "Wulfram Forge startup error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                else if (!startupScreen.IsDisposed) startupScreen.SetStage("Preparing your map");
            };
            webView.CoreWebView2.NewWindowRequested += (_, eventArgs) =>
            {
                eventArgs.Handled = true;
                if (Uri.TryCreate(eventArgs.Uri, UriKind.Absolute, out Uri? uri)
                    && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
                {
                    Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
                }
            };
            webView.CoreWebView2.Navigate("https://wulfram-forge.local/index.html");
            Program.TraceStartup("Navigation requested");
            if (Environment.GetEnvironmentVariable("WULFRAM_FORGE_MCP") == "1")
            {
                mcpHost = new McpEditorHost(this, webView.CoreWebView2);
                Text = "Wulfram Forge — MCP enabled";
            }
        }
        catch (Exception error)
        {
            Program.TraceStartup($"Startup exception: {error}");
            MessageBox.Show(
                this,
                $"Wulfram Forge could not start Edge WebView2.\n\n{error.Message}",
                "Wulfram Forge startup error",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
        }
    }
}
