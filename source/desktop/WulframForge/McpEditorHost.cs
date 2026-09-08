using System.IO.Pipes;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;

namespace WulframForge;

// Opt-in, current-Windows-user-only transport. No listening network/debug port.
internal sealed class McpEditorHost : IDisposable
{
    private readonly Form owner;
    private readonly CoreWebView2 webView;
    private readonly CancellationTokenSource stop = new();
    private readonly string token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    private readonly string sessionId = Guid.NewGuid().ToString("N");
    private readonly string pipeName;
    private readonly string descriptor;
    public McpEditorHost(Form owner, CoreWebView2 webView)
    {
        this.owner = owner; this.webView = webView;
        pipeName = "WulframForge-" + sessionId;
        string directory = Environment.GetEnvironmentVariable("WULFRAM_MCP_SESSION_DIR") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "BlackwaterGaming", "WulframForge", "mcp-sessions");
        Directory.CreateDirectory(directory);
        descriptor = Path.Combine(directory, sessionId + ".json");
        File.WriteAllText(descriptor, JsonSerializer.Serialize(new { protocolVersion = 1, sessionId, pipeName, token, pid = Environment.ProcessId }));
        _ = ServeAsync();
    }
    private async Task ServeAsync()
    {
        while (!stop.IsCancellationRequested)
        {
            try
            {
                using var pipe = new NamedPipeServerStream(pipeName, PipeDirection.InOut, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous | PipeOptions.CurrentUserOnly);
                await pipe.WaitForConnectionAsync(stop.Token);
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stop.Token);
                timeout.CancelAfter(TimeSpan.FromSeconds(30));
                long deadline = DateTimeOffset.UtcNow.AddSeconds(30).ToUnixTimeMilliseconds();
                using var reader = new StreamReader(pipe, new UTF8Encoding(false), false, 8192, true);
                using var writer = new StreamWriter(pipe, new UTF8Encoding(false), 8192, true) { AutoFlush = true };
                string? line = await reader.ReadLineAsync(timeout.Token);
                object response;
                try
                {
                    if (line is null || line.Length > 2 * 1024 * 1024) throw new InvalidOperationException("Invalid command size.");
                    using var request = JsonDocument.Parse(line);
                    if (request.RootElement.GetProperty("token").GetString() != token) throw new InvalidOperationException("Invalid session credential.");
                    if (request.RootElement.TryGetProperty("deadline", out var requestedDeadline))
                    {
                        if (!requestedDeadline.TryGetInt64(out long clientDeadline)) throw new InvalidOperationException("Invalid request deadline.");
                        deadline = Math.Min(deadline, clientDeadline);
                    }
                    long remaining = deadline - DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                    if (remaining <= 0) throw new TimeoutException("MCP request expired before dispatch.");
                    timeout.CancelAfter(TimeSpan.FromMilliseconds(remaining));
                    var command = request.RootElement.GetProperty("command").Clone();
                    var completion = new TaskCompletionSource<object>(TaskCreationOptions.RunContinuationsAsynchronously);
                    owner.BeginInvoke(async () =>
                    {
                        try
                        {
                            timeout.Token.ThrowIfCancellationRequested();
                            completion.TrySetResult(await DispatchAsync(command, deadline));
                        }
                        catch (Exception error) { completion.TrySetException(error); }
                    });
                    response = new { ok = true, result = await completion.Task.WaitAsync(timeout.Token) };
                }
                catch (Exception error) { response = new { ok = false, error = error.Message }; }
                await writer.WriteLineAsync(JsonSerializer.Serialize(response).AsMemory(), timeout.Token);
            }
            catch (OperationCanceledException) { }
            catch (IOException) { }
            catch (Exception) { if (owner.IsDisposed) break; }
        }
    }
    private async Task<object> DispatchAsync(JsonElement command, long deadline)
    {
        if (DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() >= deadline) throw new TimeoutException("MCP request expired before dispatch.");
        if (webView.Source != "https://wulfram-forge.local/index.html") throw new InvalidOperationException("Editor document is not active.");
        string? action = command.GetProperty("action").GetString();
        if (action == "capture_view")
        {
            using var stream = new MemoryStream();
            await webView.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, stream);
            return new { mimeType = "image/png", data = Convert.ToBase64String(stream.ToArray()), sessionId };
        }
        if (action is not ("get_editor_state" or "inspect_map" or "inspect_routes" or "inspect_entrances" or "set_entrance_routing" or "preview_entrance_routing" or "generate_base_layout" or "capture_formation_favorite" or "place_formation_favorite" or "inspect_authored_library" or "edit_authored_library" or "preview_authored_library" or "recover_authored_library" or "capture_authored_base" or "place_authored_base" or "validate_map" or "get_snapshot" or "edit_entities" or "edit_terrain" or "edit_terrain_protection" or "apply_landform" or "apply_lane" or "undo")) throw new InvalidOperationException("Unknown MCP command.");
        // JsonElement serialization escapes text; callers cannot submit script source.
        string encoded = JsonSerializer.Serialize(command);
        string result = await webView.ExecuteScriptAsync("(()=>{try{if(Date.now()>=" + deadline + ")throw new Error('MCP request expired before dispatch');if(!window.wulframMcp)throw new Error('MCP bridge is loading');return {ok:true,result:window.wulframMcp.dispatch(" + encoded + ")};}catch(e){return {ok:false,error:String(e.message||e)};}})()");
        using var document = JsonDocument.Parse(result);
        if (!document.RootElement.GetProperty("ok").GetBoolean()) throw new InvalidOperationException(document.RootElement.GetProperty("error").GetString());
        return document.RootElement.GetProperty("result").Clone();
    }
    public void Dispose()
    {
        stop.Cancel();
        try { File.Delete(descriptor); } catch (IOException) { }
    }
}
