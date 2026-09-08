namespace WulframForge;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        TraceStartup("Main entered");
        ApplicationConfiguration.Initialize();
        Application.ApplicationExit += (_, _) => TraceStartup("Application exit");
        Application.Run(new MainForm(args));
        TraceStartup("Message loop returned");
    }

    internal static void TraceStartup(string message)
    {
        string? destination = Environment.GetEnvironmentVariable("WULFRAM_FORGE_STARTUP_LOG");
        if (string.IsNullOrWhiteSpace(destination)) return;
        try { File.AppendAllText(destination, $"{DateTime.UtcNow:O} {message}{Environment.NewLine}"); }
        catch { /* Optional diagnostics must not prevent startup. */ }
    }
}
