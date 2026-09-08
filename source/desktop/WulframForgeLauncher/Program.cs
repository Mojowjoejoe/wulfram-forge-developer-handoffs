namespace WulframForgeLauncher;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        var config = LauncherStore.DefaultPath;
        string? target = null;
        var launch = false;
        try
        {
            for (var i = 0; i < args.Length; i++)
            {
                switch (args[i])
                {
                    case "--config" when i + 1 < args.Length: config = Path.GetFullPath(args[++i]); break;
                    case "--configure" when i + 1 < args.Length: target = args[++i]; break;
                    case "--launch": launch = true; break;
                    default: throw new ArgumentException("Use --config PATH, --configure EDITOR.exe, or --launch.");
                }
            }
            if (target is not null) LauncherStore.Save(config, target);
            if (launch)
            {
                using var process = LauncherStore.Launch(LauncherStore.Load(config) ?? throw new InvalidOperationException("Choose an editor build in the launcher first."));
                return 0;
            }
            if (target is not null) return 0;
            ApplicationConfiguration.Initialize();
            Application.Run(new LauncherForm(config));
            return 0;
        }
        catch (Exception error)
        {
            if (args.Length == 0) MessageBox.Show(error.Message, "Wulfram Forge Launcher", MessageBoxButtons.OK, MessageBoxIcon.Error);
            else Console.Error.WriteLine(error.Message);
            return 1;
        }
    }
}
