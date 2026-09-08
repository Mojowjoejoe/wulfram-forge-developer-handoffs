import { useRef, useState } from 'react';
import type { FormationFavorite } from '@/lib/formation-favorites';
import { exportPortableBases, mergePersonalBases, parsePortableBases, validatePersonalBases } from '@/lib/portable-base-library';

export function PersonalBaseLibrary({ bases, onSave }: { bases: FormationFavorite[]; onSave: (next: FormationFavorite[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const readSequence = useRef(0);
  const [incoming, setIncoming] = useState<FormationFavorite[]>();
  const [previous, setPrevious] = useState<FormationFavorite[]>();
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const apply = (next: FormationFavorite[]) => {
    const checked = validatePersonalBases(next);
    onSave(checked); setPrevious(structuredClone(bases));
  };
  const attempt = (work: () => void) => { try { work(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Library operation failed.'); } };
  let preview: ReturnType<typeof mergePersonalBases> | undefined, previewError = '';
  if (incoming) { try { preview = mergePersonalBases(bases, incoming); } catch (error) { previewError = error instanceof Error ? error.message : 'Import failed.'; } }
  return <details className="personal-base-library"><summary>Manage My bases · {bases.length}/50</summary>
    <p>Saved bases belong to this device, separately from maps. Export a library to back them up or move them to another editor. Import preserves existing entries.</p>
    <input ref={fileRef} hidden aria-label="Import personal base library file" type="file" accept=".json,application/json" onChange={event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      const sequence = ++readSequence.current;
      setIncoming(undefined); setMessage('');
      if (file.size > 2_000_000) { setMessage('Base library exceeds the 2 MB limit.'); return; }
      void file.text().then(raw => { if (sequence === readSequence.current) setIncoming(parsePortableBases(raw)); }).catch(error => { if (sequence === readSequence.current) setMessage(error instanceof Error ? error.message : 'Could not read library.'); });
    }} />
    <div className="personal-base-actions">
      <button type="button" onClick={() => fileRef.current?.click()}>Import library</button>
      <button type="button" onClick={() => attempt(() => {
        const url = URL.createObjectURL(new Blob([exportPortableBases(bases)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = 'wulfram-base-library.json'; a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Library exported. Keep this file as your backup.');
      })}>Export My bases</button>
      <button type="button" disabled={!previous} onClick={() => attempt(() => { if (!previous) return; onSave(previous); setPrevious(undefined); setMessage('Last library change undone. Map history is unchanged.'); })}>Undo library change</button>
    </div>
    {incoming && <div className="personal-base-import"><output>{preview ? `${preview.added} new · ${preview.skipped} identical skipped · ${preview.conflicts} ID conflicts kept as separate entries` : previewError}</output>
      <button type="button" disabled={!preview || preview.added === 0} onClick={() => attempt(() => { if (!preview) return; apply(preview.bases); setIncoming(undefined); setMessage(`Imported ${preview.added} saved bases.`); })}>Apply library import</button>
      <button type="button" onClick={() => setIncoming(undefined)}>Cancel library import</button>
    </div>}
    <div className="personal-base-actions">
      <label>Saved base<select aria-label="Manage saved base" value={selected} onChange={e => { setSelected(e.target.value); setName(bases.find(b => b.id === e.target.value)?.name ?? ''); }}><option value="">Choose a saved base…</option>{bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label>Name<input aria-label="Saved base name" maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
      <button type="button" disabled={!bases.some(b => b.id === selected) || !name.trim()} onClick={() => attempt(() => { apply(bases.map(b => b.id === selected ? { ...b, name: name.trim(), template: { ...b.template, name: name.trim() } } : b)); setMessage('Saved base renamed. Placed maps are unchanged.'); })}>Rename saved base</button>
      <button type="button" disabled={!bases.some(b => b.id === selected)} onClick={() => attempt(() => { apply(bases.filter(b => b.id !== selected)); setSelected(''); setName(''); setMessage('Saved base removed. Undo library change restores it until this dialog closes.'); })}>Remove saved base</button>
    </div>
    <output aria-live="polite">{message}</output>
  </details>;
}
