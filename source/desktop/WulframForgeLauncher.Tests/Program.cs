using System.Diagnostics;
using System.Security.Cryptography;
using System.Text.Json;

var probe = Environment.GetEnvironmentVariable("WULFRAM_LAUNCHER_PROBE");
if (!string.IsNullOrEmpty(probe))
{
    File.WriteAllText(probe, JsonSerializer.Serialize(new { executable = Environment.ProcessPath, directory = Environment.CurrentDirectory, pid = Environment.ProcessId }));
    return;
}
if (args.Length != 2) throw new ArgumentException("Supply launcher EXE and a new test output directory.");
var launcher = Path.GetFullPath(args[0]);
var output = Path.GetFullPath(args[1]);
if (Directory.Exists(output)) throw new IOException("Use a new isolated output directory.");
Directory.CreateDirectory(output);
var config = Path.Combine(output, "settings.json");
var first = Path.Combine(output, "Build one", "editor.exe");
var second = Path.Combine(output, "Build two", "editor.exe");
Directory.CreateDirectory(Path.GetDirectoryName(first)!);
Directory.CreateDirectory(Path.GetDirectoryName(second)!);
File.Copy(Environment.ProcessPath!, first);
File.Copy(Environment.ProcessPath!, second);
var beforeHash = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(launcher)));
var checks = new List<string>();
void Check(bool value, string message) { if (!value) throw new InvalidOperationException(message); checks.Add(message); }
int Run(string[] arguments, string? receipt = null)
{
    var start = new ProcessStartInfo(launcher) { UseShellExecute = false, CreateNoWindow = true };
    start.ArgumentList.Add("--config"); start.ArgumentList.Add(config);
    foreach (var argument in arguments) start.ArgumentList.Add(argument);
    if (receipt is not null) start.Environment["WULFRAM_LAUNCHER_PROBE"] = receipt;
    using var process = Process.Start(start)!;
    if (!process.WaitForExit(15000)) { process.Kill(); throw new TimeoutException("Launcher command did not exit."); }
    return process.ExitCode;
}
void LaunchAndCheck(string expected, string label)
{
    var receipt = Path.Combine(output, label + ".json");
    Check(Run(["--launch"], receipt) == 0, label + " launch command succeeds");
    var timer = Stopwatch.StartNew();
    while (!File.Exists(receipt) && timer.Elapsed < TimeSpan.FromSeconds(15)) Thread.Sleep(50);
    using var data = JsonDocument.Parse(File.ReadAllText(receipt));
    Check(data.RootElement.GetProperty("executable").GetString() == expected, label + " starts selected executable");
    Check(data.RootElement.GetProperty("directory").GetString() == Path.GetDirectoryName(expected), label + " uses selected build directory");
    try { using var child = Process.GetProcessById(data.RootElement.GetProperty("pid").GetInt32()); if (!child.WaitForExit(10000)) throw new TimeoutException("Probe editor did not exit."); }
    catch (ArgumentException) { /* Probe already exited before its receipt was read. */ }
}
Check(Run(["--launch"]) == 1, "No configured build fails without starting anything");
Check(Run(["--configure", first]) == 0, "First build can be selected");
LaunchAndCheck(first, "first");
var original = File.ReadAllBytes(config);
Check(Run(["--configure", Path.Combine(output, "missing.exe")]) == 1, "Missing build rejects");
Check(File.ReadAllBytes(config).SequenceEqual(original), "Rejected selection preserves settings");
var invalid = Path.Combine(output, "invalid.exe"); File.WriteAllText(invalid, "not an executable");
Check(Run(["--configure", invalid]) == 1, "Invalid executable rejects");
Check(Run(["--configure", launcher]) == 1, "Launcher cannot select itself");
var renamedLauncher = Path.Combine(output, "renamed-launcher.exe"); File.Copy(launcher, renamedLauncher);
Check(Run(["--configure", renamedLauncher]) == 1, "Renamed launcher cannot be selected as an editor");
var editorHash = SHA256.HashData(File.ReadAllBytes(first));
Check(Run(["--config", first, "--configure", first]) == 1, "Settings cannot overwrite the editor executable");
Check(SHA256.HashData(File.ReadAllBytes(first)).SequenceEqual(editorHash), "Rejected configuration path preserves editor bytes");
Check(File.ReadAllBytes(config).SequenceEqual(original), "Invalid and self selections preserve settings");
Check(Run(["--configure", second]) == 0, "Replacement build can be selected");
LaunchAndCheck(second, "second");
// Model a saved target that no longer exists without depending on Windows releasing
// a freshly executed image file immediately after the process exits.
File.WriteAllText(config, JsonSerializer.Serialize(new { Version = 1, EditorPath = second + ".missing.exe" }));
Check(Run(["--launch"]) == 1, "Moved or deleted build produces a launch failure");
File.WriteAllText(config, "{broken");
Check(Run(["--launch"]) == 1, "Malformed settings fail without a launch");
Check(File.ReadAllText(config) == "{broken", "Malformed settings are preserved until explicit selection");
Check(Run(["--configure", first]) == 0, "Explicit selection recovers malformed settings");
LaunchAndCheck(first, "recovered");
Check(Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(launcher))) == beforeHash, "Build changes leave launcher bytes unchanged");
using (var form = new WulframForgeLauncher.LauncherForm(config))
{
    form.ShowInTaskbar = false;
    form.StartPosition = System.Windows.Forms.FormStartPosition.Manual;
    form.Location = new System.Drawing.Point(-30000, -30000);
    form.Show(); System.Windows.Forms.Application.DoEvents(); form.PerformLayout();
    using var bitmap = new System.Drawing.Bitmap(form.Width, form.Height);
    form.DrawToBitmap(bitmap, new System.Drawing.Rectangle(System.Drawing.Point.Empty, form.Size));
    bitmap.Save(Path.Combine(output, "launcher-form.png"), System.Drawing.Imaging.ImageFormat.Png);
    var orangePixels = 0;
    for (var y = 0; y < bitmap.Height; y++) for (var x = 0; x < bitmap.Width; x++)
    { var pixel = bitmap.GetPixel(x, y); if (pixel.R > 180 && pixel.G > 70 && pixel.G < 200 && pixel.B < 100) orangePixels++; }
    Check(orangePixels > 100, "Source form renders its Launch button for visual review");
}
File.WriteAllText(Path.Combine(output, "report.json"), JsonSerializer.Serialize(new { passed = true, launcher, sha256 = beforeHash, checks }, new JsonSerializerOptions { WriteIndented = true }));
Console.WriteLine(JsonSerializer.Serialize(new { passed = true, checks = checks.Count, report = Path.Combine(output, "report.json") }));
