using System.Diagnostics;

namespace WulframForgeLauncher;

internal sealed class LauncherForm : Form
{
    private readonly string configPath;
    private LauncherSettings? settings;
    private readonly Label version = new() { AutoSize = true, ForeColor = Color.Silver, Margin = new Padding(0, 0, 0, 14) };
    private readonly TextBox target = new() { ReadOnly = true, Multiline = true, Height = 65, Dock = DockStyle.Fill, ScrollBars = ScrollBars.Vertical, AccessibleName = "Selected editor executable" };
    private readonly Label status = new() { AutoSize = true, MaximumSize = new Size(530, 0), Margin = new Padding(0, 12, 0, 0) };
    private readonly Button launch = new() { Text = "Launch editor", AutoSize = true, Padding = new Padding(22, 8, 22, 8), BackColor = Color.FromArgb(223, 127, 55), ForeColor = Color.Black, FlatStyle = FlatStyle.Flat };

    public LauncherForm(string configPath)
    {
        this.configPath = configPath;
        Text = "Wulfram Forge Launcher";
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(600, 335);
        MinimumSize = new Size(500, 360);
        AutoScaleMode = AutoScaleMode.Dpi;
        Font = new Font("Segoe UI", 10);
        BackColor = Color.FromArgb(23, 28, 31);
        ForeColor = Color.WhiteSmoke;
        var panel = new TableLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(26), ColumnCount = 1, RowCount = 6 };
        panel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        panel.RowStyles.Add(new RowStyle(SizeType.Absolute, 72));
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        panel.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        panel.Controls.Add(new Label { Text = "WULFRAM FORGE", AutoSize = true, Font = new Font("Segoe UI", 19, FontStyle.Bold), Margin = new Padding(0, 0, 0, 6) }, 0, 0);
        panel.Controls.Add(version, 0, 1);
        panel.Controls.Add(target, 0, 2);
        var buttons = new FlowLayoutPanel { AutoSize = true, Dock = DockStyle.Fill, Margin = new Padding(0, 12, 0, 0), WrapContents = true };
        var choose = new Button { Text = "Change editor build…", AutoSize = true, Padding = new Padding(12, 8, 12, 8), FlatStyle = FlatStyle.Flat };
        buttons.Controls.Add(launch); buttons.Controls.Add(choose);
        panel.Controls.Add(buttons, 0, 3);
        panel.Controls.Add(status, 0, 4);
        Controls.Add(panel);
        Resize += (_, _) => status.MaximumSize = new Size(Math.Max(100, ClientSize.Width - 60), 0);
        AcceptButton = launch;
        choose.Click += (_, _) => ChooseBuild();
        launch.Click += (_, _) => LaunchEditor();
        try { settings = LauncherStore.Load(configPath); RefreshBuild(); }
        catch (Exception error) { RefreshBuild(); status.Text = error.Message; }
    }

    private void RefreshBuild()
    {
        target.Text = settings?.EditorPath ?? "No editor selected";
        launch.Enabled = settings is not null;
        version.Text = "One launcher. Your choice of editor build.";
        status.Text = "Keep this launcher in the same place. Change the editor build when a new version is ready.";
        if (settings is null) return;
        try
        {
            LauncherStore.ValidateTarget(settings.EditorPath);
            version.Text = "Selected build: " + (FileVersionInfo.GetVersionInfo(settings.EditorPath).ProductVersion?.Split('+')[0] ?? "Version unavailable");
        }
        catch (Exception error) { status.Text = error.Message; launch.Enabled = false; }
    }

    private void ChooseBuild()
    {
        using var picker = new OpenFileDialog { Title = "Choose Wulfram Forge editor", Filter = "Editor executable (*.exe)|*.exe", CheckFileExists = true, Multiselect = false };
        if (settings is not null && Directory.Exists(Path.GetDirectoryName(settings.EditorPath))) picker.InitialDirectory = Path.GetDirectoryName(settings.EditorPath);
        if (picker.ShowDialog(this) != DialogResult.OK) return;
        try { settings = LauncherStore.Save(configPath, picker.FileName); RefreshBuild(); }
        catch (Exception error) { MessageBox.Show(this, error.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error); }
    }

    private void LaunchEditor()
    {
        if (settings is null) return;
        try { using var process = LauncherStore.Launch(settings); status.Text = "Editor started. You can close this launcher."; }
        catch (Exception error) { status.Text = error.Message; }
    }
}
