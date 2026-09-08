using System.Drawing.Drawing2D;

namespace WulframForge;

// Native painting is available before WebView2 or the embedded web assets load.
internal sealed class StartupScreen : Control
{
    private readonly System.Windows.Forms.Timer animation = new() { Interval = 40 };
    private readonly System.Diagnostics.Stopwatch elapsed = System.Diagnostics.Stopwatch.StartNew();
    private string stage = "Preparing the forge";
    private readonly Region tankSilhouette = CreateSilhouette(StartupTankGeometry.Tank);

    private static Region CreateSilhouette(PointF[][] triangles)
    {
        Region result = new();
        result.MakeEmpty();
        foreach (PointF[] triangle in triangles)
        {
            using GraphicsPath path = new();
            path.AddPolygon(triangle);
            result.Union(path);
        }
        return result;
    }

    private void DrawTankScene(Graphics g, double time, bool motion)
    {
        // A six-second vignette: idle, jump, launch at the apex, settle, idle.
        double phase = motion ? time % 6 : 0;
        float jump = phase is >= .8 and <= 3.2 ? (float)Math.Sin((phase-.8)/2.4*Math.PI) : 0;
        using SolidBrush shadow = new(Color.FromArgb(34-(int)(jump*15), 0,0,0));
        const float tankScale = 6.3f;
        const float centerX = -65;
        const float centerY = -129;
        const float jumpHeight = 27;
        float shadowWidth=84-jump*18;
        g.FillEllipse(shadow,centerX-shadowWidth/2,-106,shadowWidth,7-jump*2);
        var state = g.Save();
        g.TranslateTransform(centerX,centerY-jump*jumpHeight);
        g.RotateTransform(-jump*5);
        g.ScaleTransform(tankScale,tankScale);
        using SolidBrush ink = new(Color.FromArgb(94,172,153,121));
        g.FillRegion(ink,tankSilhouette);
        g.Restore(state);

        if (motion && phase is >= 1.85 and <= 3.75)
        {
            float age=(float)(phase-1.85);
            // Anchor to the model's own missile_pos, transformed at launch time.
            float launchJump=(float)Math.Sin((1.85-.8)/2.4*Math.PI);
            float angle=-launchJump*5*(float)Math.PI/180;
            PointF launch=StartupTankGeometry.LaunchPoint;
            float x=centerX+tankScale*(launch.X*(float)Math.Cos(angle)-launch.Y*(float)Math.Sin(angle))+age*138;
            float y=centerY-launchJump*jumpHeight+tankScale*(launch.X*(float)Math.Sin(angle)+launch.Y*(float)Math.Cos(angle))-age*28;
            int alpha=(int)(170*Math.Min(1,(3.75-phase)/.4));
            // The in-game effect reads as a slender luminous rod, not a rocket body.
            // Grow out of the launch point rather than appearing as a full-length flash.
            float length=Math.Min(42,age*230);
            PointF tail=new(x-length,y+length*.203f);
            foreach (var layer in new[] { (Width:9f,Alpha:alpha/18), (Width:5f,Alpha:alpha/9), (Width:2.8f,Alpha:alpha/4), (Width:1.2f,Alpha:alpha) })
            {
                using Pen glow=new(Color.FromArgb(layer.Alpha,220,197,154),layer.Width) { StartCap=LineCap.Round,EndCap=LineCap.Round };
                g.DrawLine(glow,tail,new PointF(x,y));
            }
        }
        if (motion && phase is >= 3.2 and <= 4)
        {
            float age=(float)(phase-3.2);
            using Pen dust=new(Color.FromArgb((int)(25*(1-age/.8)),172,153,121),1);
            g.DrawEllipse(dust,centerX-42-age*14,-109,84+age*28,7+age*5);
        }
    }

    public StartupScreen()
    {
        Dock = DockStyle.Fill;
        BackColor = Color.FromArgb(16, 18, 20);
        DoubleBuffered = true;
        SetStyle(ControlStyles.ResizeRedraw | ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint, true);
        AccessibleName = "Wufram Lives — Forge Map Editor startup";
        animation.Tick += (_, _) => Invalidate();
        animation.Start();
    }

    public void SetStage(string value) { stage = value; AccessibleDescription = value; Invalidate(); }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        float scale = DeviceDpi / 96f;
        g.TranslateTransform(Width / 2f, Height / 2f);
        g.ScaleTransform(scale, scale);
        double time = elapsed.Elapsed.TotalSeconds;
        bool motion = SystemInformation.IsMenuAnimationEnabled;
        using Pen terrain = new(Color.FromArgb(18, 151, 166, 172), 1);
        for (int row = 0; row < 9; row++)
        {
            PointF[] contour = new PointF[33];
            for (int x = 0; x < contour.Length; x++)
                contour[x] = new PointF(-320 + x * 20, 60 + row * 13 + (float)Math.Sin(x * .29 + row * .26) * (12 + row * 2));
            g.DrawCurve(terrain, contour);
        }
        // Survey grid, paired outposts, and a thin route echo the map workspace.
        using Pen grid = new(Color.FromArgb(10, 151, 166, 172), 1);
        for (int x = -280; x <= 280; x += 40) g.DrawLine(grid, x, 83, x, 186);
        for (int y = 100; y <= 180; y += 40) g.DrawLine(grid, -300, y, 300, y);
        using Pen structures = new(Color.FromArgb(30, 158, 169, 170), 1);
        foreach (int side in new[] { -1, 1 })
        {
            float x = side * 235;
            g.DrawPolygon(structures, new PointF[] { new(x-22,113),new(x,100),new(x+22,113),new(x+22,138),new(x,151),new(x-22,138) });
            g.DrawRectangle(structures, x-7,116,14,18);
            g.DrawEllipse(structures, x-44,118,8,8);
            g.DrawEllipse(structures, x+36,118,8,8);
            g.DrawLine(structures,x-22,126,x-36,122);
            g.DrawLine(structures,x+22,126,x+36,122);
        }
        PointF[] route = { new(-205,126),new(-130,126),new(-84,151),new(55,151),new(113,126),new(205,126) };
        g.DrawLines(structures,route);
        if (motion)
        {
            float scan = -300 + (float)(time * 22 % 600);
            using Pen sweep = new(Color.FromArgb(22, 181, 161, 123), 1);
            g.DrawLine(sweep,scan,85,scan,180);
            using SolidBrush signal = new(Color.FromArgb(70, 181, 161, 123));
            float travel = (float)(time * .16 % 1) * (route.Length-1);
            int segment = (int)travel; float fraction = travel-segment;
            float px=route[segment].X+(route[segment+1].X-route[segment].X)*fraction;
            float py=route[segment].Y+(route[segment+1].Y-route[segment].Y)*fraction;
            g.FillEllipse(signal,px-2,py-2,4,4);
        }
        DrawTankScene(g, time, motion);
        using Font title = new("Bahnschrift", 54, FontStyle.Bold, GraphicsUnit.Pixel);
        using Font subtitle = new("Bahnschrift", 16, FontStyle.Regular, GraphicsUnit.Pixel);
        using Font status = new("Segoe UI", 11, FontStyle.Regular, GraphicsUnit.Pixel);
        using StringFormat centered = new() { Alignment = StringAlignment.Center };
        using SolidBrush titleInk = new(Color.FromArgb(181, 190, 174, 144));
        using SolidBrush quietInk = new(Color.FromArgb(125, 149, 153, 153));
        using GraphicsPath wordmark = new();
        wordmark.AddString("WUFRAM LIVES",title.FontFamily,(int)FontStyle.Bold,54,PointF.Empty,StringFormat.GenericTypographic);
        RectangleF bounds=wordmark.GetBounds();
        using Matrix wordmarkTransform=new();
        wordmarkTransform.Translate(-bounds.X-bounds.Width/2,-bounds.Y-42);
        wordmark.Transform(wordmarkTransform);
        using Matrix slant=new(1,0,-.10f,1,0,0);
        wordmark.Transform(slant);
        g.FillPath(titleInk,wordmark);
        g.DrawString("F O R G E   M A P   E D I T O R", subtitle, quietInk, new RectangleF(-300,18,600,27), centered);
        using Pen track = new(Color.FromArgb(30, 177, 163, 136), 1);
        using Pen light = new(Color.FromArgb(85, 177, 163, 136), 1.5f);
        g.DrawLine(track, -90, 65, 90, 65);
        float offset = motion ? (float)((Math.Sin(time * .9) + 1) * 70) : 70;
        g.DrawLine(light, -90 + offset, 65, -50 + offset, 65);
        string dots = motion ? new string('.', 1 + (int)(time * 1.7) % 3) : "…";
        string message = elapsed.Elapsed.TotalSeconds > 45
            ? stage + dots + "  Taking longer than usual" : stage + dots;
        g.DrawString(message, status, quietInk, new RectangleF(-350,205,700,25), centered);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            animation.Dispose();
            tankSilhouette.Dispose();
        }
        base.Dispose(disposing);
    }
}

