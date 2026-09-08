using System.Diagnostics;
using System.Text.Json;

namespace WulframForgeLauncher;

public sealed record LauncherSettings(int Version, string EditorPath);

public static class LauncherStore
{
    public static string DefaultPath => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "BlackwaterGaming", "WulframForgeLauncher", "settings.json");

    public static LauncherSettings? Load(string configPath)
    {
        if (!File.Exists(configPath)) return null;
        if (new FileInfo(configPath).Length > 16384) throw new InvalidDataException("Launcher settings are too large. Choose the editor build again.");
        var settings = JsonSerializer.Deserialize<LauncherSettings>(File.ReadAllText(configPath));
        if (settings is null || settings.Version != 1 || string.IsNullOrWhiteSpace(settings.EditorPath) || !Path.IsPathFullyQualified(settings.EditorPath))
            throw new InvalidDataException("Launcher settings are not supported. Choose the editor build again.");
        return settings;
    }

    public static string ValidateTarget(string path)
    {
        var full = Path.GetFullPath(path);
        if (!string.Equals(Path.GetExtension(full), ".exe", StringComparison.OrdinalIgnoreCase) || !File.Exists(full))
            throw new FileNotFoundException("This editor EXE is missing. Use Change editor build to select its new location.", full);
        if (string.Equals(full, Environment.ProcessPath, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(FileVersionInfo.GetVersionInfo(full).InternalName, "WulframForgeLauncher.dll", StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("Select the editor EXE, not the launcher.");
        using var file = File.OpenRead(full);
        if (file.ReadByte() != 'M' || file.ReadByte() != 'Z') throw new InvalidDataException("Select a Windows editor executable.");
        return full;
    }

    public static LauncherSettings Save(string configPath, string target)
    {
        var settings = new LauncherSettings(1, ValidateTarget(target));
        var full = Path.GetFullPath(configPath);
        if (!string.Equals(Path.GetExtension(full), ".json", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(full, settings.EditorPath, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(full, Environment.ProcessPath, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("Launcher settings must use a separate JSON file, never an executable.");
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        var temporary = full + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            File.WriteAllText(temporary, JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true }));
            File.Move(temporary, full, true);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
        return settings;
    }

    public static Process Launch(LauncherSettings settings)
    {
        var target = ValidateTarget(settings.EditorPath);
        return Process.Start(new ProcessStartInfo(target) { WorkingDirectory = Path.GetDirectoryName(target)!, UseShellExecute = false })
            ?? throw new InvalidOperationException("Windows could not start the editor.");
    }
}
