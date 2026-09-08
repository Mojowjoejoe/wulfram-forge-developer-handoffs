'use client';
import { useState } from 'react';
import { FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createEditorDiagnostics, type DiagnosticContext } from '@/lib/editor-diagnostics';
import { safeMapName } from '@/lib/map-package';
import type { AssetManifest, WulframProject } from '@/lib/wulfram';

export function DiagnosticsButton({ project, manifest, context }: { project: WulframProject; manifest: AssetManifest; context: DiagnosticContext | (() => DiagnosticContext) }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const save = async () => {
    if (!window.confirm('Export a local diagnostics ZIP containing the full map, all layouts, metadata, draft settings and any preview? No upload happens. Review its contents before sharing.')) return;
    setBusy(true); setMessage('');
    try {
      const archive = await createEditorDiagnostics(project, manifest, typeof context === 'function' ? context() : context);
      const url = URL.createObjectURL(new Blob([archive], { type: 'application/zip' }));
      const anchor = document.createElement('a'); anchor.href = url;
      anchor.download = `${safeMapName(project.name)}-diagnostics.zip`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage('Diagnostics ZIP prepared locally. Attach it here when ready.');
    } catch (error) { setMessage(`Diagnostics failed: ${error instanceof Error ? error.message : String(error)}`); }
    finally { setBusy(false); }
  };
  return <span><Button disabled={busy} title="Export diagnostics" variant="outline" size="sm" onClick={() => void save()}><FileArchive />{busy ? 'Preparing…' : 'Export diagnostics'}</Button>{message && <small aria-live="polite">{message}</small>}</span>;
}
