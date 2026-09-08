import type {AuthoredBasePackage} from '@/lib/authored-base-package';
import {AUTHORED_LIBRARY_KEY,readAuthoredLibrary} from '@/lib/authored-base-library';
import { useEffect, useMemo, useState } from 'react';
import { PersonalBaseLibrary } from './personal-base-library';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BASE_COMPOSITION_TRAITS, buildBaseLibrary, filterBaseLibrary, type BaseLibraryEntry, type BaseLibraryFilter } from '@/lib/base-library';
import type { CreativeSize } from '@/lib/creative-base-layouts';
import type { FormationFavorite } from '@/lib/formation-favorites';
import { CATALOG, hasModelForEntity, type AssetManifest, type BaseTemplate } from '@/lib/wulfram';

function LibraryDiagram({ authoredBase, template, manifest, approach, reservationBands, reservationWidth=200, reservationLabel="entrance" }: { authoredBase?:AuthoredBasePackage; template: BaseTemplate; manifest: AssetManifest; approach?:Array<[number,number]>; reservationBands?:Array<{points:Array<[number,number]>;width:number}>; reservationWidth?:number; reservationLabel?:string }) {
  const units = template.units.filter((u,i) => hasModelForEntity({ ...u, team: authoredBase?.geometry.units[i].team??1 }, manifest));
  const bands=reservationBands??(approach?[{points:approach,width:reservationWidth}]:[]);
  const xs = [...units.map(u => u.offset[0]),...bands.flatMap(b=>b.points.flatMap(p=>[p[0]-b.width/2,p[0]+b.width/2]))], ys = [...units.map(u => u.offset[1]),...bands.flatMap(b=>b.points.flatMap(p=>[p[1]-b.width/2,p[1]+b.width/2]))];
  const minX = Math.min(0, ...xs), maxX = Math.max(0, ...xs), minY = Math.min(0, ...ys), maxY = Math.max(0, ...ys);
  const scale = Math.min(196 / Math.max(1, maxX - minX), 140 / Math.max(1, maxY - minY));
  return <figure className="library-diagram"><svg viewBox="-110 -82 220 164" aria-label={`${template.name} layout diagram`}>
    {bands.map((band,index)=><polyline key={index} points={band.points.map(([x,y])=>`${(x-(minX+maxX)/2)*scale},${-(y-(minY+maxY)/2)*scale}`).join(" ")} fill="none" stroke="#b598e6" strokeOpacity=".35" strokeWidth={band.width*scale} strokeLinecap="round" strokeLinejoin="round" />)}
    {units.map((u, index) => { const color = u.token === 'e' ? '#ffd366' : ['r','f'].includes(u.token) ? '#72dadd' : CATALOG.some(c=>c.token===u.token&&c.category==='defense') ? '#f69b80' : u.token === 'd' ? '#c1a0ff' : '#cbd4de';
      return <g key={index} transform={`translate(${(u.offset[0]-(minX+maxX)/2)*scale} ${-(u.offset[1]-(minY+maxY)/2)*scale})`}><title>{authoredBase?`Team ${authoredBase.geometry.units[template.units.indexOf(u)].team}: `:''}{CATALOG.find(c => c.token === u.token)?.label ?? u.token}</title>{['r','f'].includes(u.token) ? <rect x="-3.5" y="-3.5" width="7" height="7" fill={color} /> : <circle r="2.8" fill={color} />}</g>; })}
  </svg><figcaption>{bands.length?`Centers + reserved ${reservationLabel} · sample only`:'Structure centers · not collision footprints'}</figcaption></figure>;
}

const defaults: BaseLibraryFilter = { query: '', category: 'All', count: 'all', role: 'all', terrain: 'all' };
export function BaseLibraryDialog({ templates, favorites, manifest, onClose, onChoose, onSaveFavorites }: {
  templates: BaseTemplate[]; favorites: FormationFavorite[]; manifest: AssetManifest;
  onClose: () => void; onChoose: (entry: BaseLibraryEntry) => void;
  onSaveFavorites: (bases: FormationFavorite[]) => void;
}) {
  const readAuthored=()=>{try{const raw=localStorage.getItem(AUTHORED_LIBRARY_KEY);return {raw,library:readAuthoredLibrary(raw),error:''};}catch(error){return {raw:undefined,library:undefined,error:String(error)};}};
  const [authored,setAuthored]=useState(readAuthored);
  useEffect(()=>{const refresh=(event:Event)=>{if(event instanceof StorageEvent&&event.key!==null&&event.key!==AUTHORED_LIBRARY_KEY)return;setAuthored(readAuthored());};window.addEventListener('storage',refresh);window.addEventListener('authored-library-changed',refresh);return()=>{window.removeEventListener('storage',refresh);window.removeEventListener('authored-library-changed',refresh);};},[]);
  const [filter, setFilter] = useState(defaults);
  const [size, setSize] = useState<CreativeSize>('large');
  const [selectedKey, setSelectedKey] = useState('');
  const [page, setPage] = useState(0);
  const entries = useMemo(() => buildBaseLibrary(templates, favorites, manifest, size, authored.library?.entries), [templates, favorites, manifest, size, authored.library]);
  const matches = useMemo(() => filterBaseLibrary(entries, filter), [entries, filter]);
  const selected = matches.find(e => e.key === selectedKey);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(matches.length / 12) - 1));
  const change = (key: keyof BaseLibraryFilter, value: string) => { setFilter(f => ({ ...f, [key]: value })); setPage(0); };
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="base-library-dialog">
      <DialogHeader><DialogTitle>Base library</DialogTitle><DialogDescription>Browse designs without changing your map. Authored cards show all saved teams; other thumbnails show one team. Creative cards use a repeatable sample seed.</DialogDescription></DialogHeader>
      <div className="base-library-filters">
        <label>Search designs<input aria-label="Search base library" placeholder="Name, purpose or source map" value={filter.query} onChange={e => change('query', e.target.value)} /></label>
        <label>Collection<select aria-label="Base library collection" value={filter.category} onChange={e => change('category', e.target.value)}>{['All','Creative','Experimental','Original','Curated','My bases','My districts','Authored bases'].map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Creative size<select aria-label="Library creative size" value={size} onChange={e => { setSize(e.target.value as CreativeSize); setPage(0); }}>{([['small','Starter'],['standard','Standard'],['large','Fortified'],['massive','Massive']] as const).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      </div>
      <details className="base-library-advanced"><summary>More filters{[filter.count,filter.role,filter.terrain,filter.trait??'all'].filter(v=>v!=='all').length>0?` · ${[filter.count,filter.role,filter.terrain,filter.trait??'all'].filter(v=>v!=='all').length} active`:''}</summary>
      <div className="base-library-filters">
        <label>Sample structures<select aria-label="Library structure count" value={filter.count} onChange={e => change('count', e.target.value)}><option value="all">Any count</option><option value="small">Up to 15</option><option value="medium">16–35</option><option value="large">36 or more</option></select></label>
        <label>Includes<select aria-label="Library role" value={filter.role} onChange={e => change('role', e.target.value)}><option value="all">Any role</option><option value="service">Repair / refuel</option><option value="defense">Defensive structures</option><option value="concealment">Darklights</option></select></label>
        <label>Composition trait<select aria-label="Library composition trait" value={filter.trait??'all'} onChange={e=>change('trait',e.target.value)}><option value="all">Any trait</option>{BASE_COMPOSITION_TRAITS.map(trait=><option key={trait}>{trait}</option>)}</select></label>
        <label>Terrain handling<select aria-label="Library terrain handling" value={filter.terrain} onChange={e => change('terrain', e.target.value)}><option value="all">Any handling</option><option value="adaptive">Adaptive powered yards</option><option value="fixed">Fixed arrangement</option></select></label>
      </div>
      <p className="base-library-note">Size changes creative composition only. Fixed templates keep their composition. Terrain handling describes placement behavior, not a guarantee of suitability or power.</p>
      <details className="base-library-trait-help"><summary>How composition traits are counted</summary><p>Starter count: up to 15 modeled structures. Service yard: at least two repair/refuel pads; Multiple service pads: at least four. Defense heavy: at least half the modeled structures are available modeled defenses. Darklights present: at least one. Elongated footprint: long side at least 2.5 times the short side. Traits describe the displayed sample, not terrain fit, available power, cover or gameplay balance.</p></details>
      </details>
      {authored.error&&<p role="alert">Saved authored library unavailable: {authored.error} Open Saved authored bases for recovery.</p>}
      {filter.category!=='Authored bases'&&<PersonalBaseLibrary bases={favorites} onSave={onSaveFavorites} />}
      <div className="base-library-body">
        <section aria-label="Base library results">
          <div className="base-library-results"><output>{matches.length} designs</output><button type="button" onClick={() => { setFilter(defaults); setPage(0); }}>Reset filters</button></div>
          {!matches.length && <output>No designs match. Try fewer filters. My bases contains formations saved with “Save active formation as favorite”.</output>}
          <div className="base-library-grid">{matches.slice(currentPage * 12, currentPage * 12 + 12).map(e => <button className="base-library-card" type="button" key={e.key} aria-pressed={selected?.key === e.key} aria-label={`Details: ${e.name}`} onClick={() => setSelectedKey(e.key)}>
            {e.template ? <LibraryDiagram authoredBase={e.authoredBase} manifest={manifest} template={e.template} approach={e.approach} reservationBands={e.reservationBands} reservationWidth={e.reservationWidth} reservationLabel={e.reservationLabel} /> : <p>Sample unavailable</p>}
            <strong>{e.name}</strong><small>{e.category} · {e.modeledCount} modeled structures</small><span>{e.description}</span><small>{e.traits.join(" · ")}</small>
          </button>)}</div>
          <div className="base-library-results"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous designs</button><span>Page {currentPage + 1} / {Math.max(1, Math.ceil(matches.length / 12))}</span><button type="button" disabled={(currentPage + 1) * 12 >= matches.length} onClick={() => setPage(currentPage + 1)}>Next designs</button></div>
        </section>
        <section className="base-library-detail" aria-label="Base design details">
          {selected ? <>
            <h3>{selected.name}</h3><p>{selected.description}</p><p>Composition traits: {selected.traits.join(" · ")||"No listed traits"}</p>
            {selected.template && <LibraryDiagram authoredBase={selected.authoredBase} manifest={manifest} template={selected.template} approach={selected.approach} reservationBands={selected.reservationBands} reservationWidth={selected.reservationWidth} reservationLabel={selected.reservationLabel} />}
            <p>Gold: power · cyan squares: services · coral: defenses · purple: Darklights · gray: other structures.</p>
            <dl><dt>Collection / source</dt><dd>{selected.category} · {selected.template?.sourceMap ?? 'Creative sample'}</dd><dt>{selected.authoredBase?'Saved building center span':selected.planBounds?'Sample occupied + reserved bounds':'Sample footprint'}</dt><dd>{Math.ceil(selected.planBounds?.width??selected.template?.footprint.width??0)} × {Math.ceil(selected.planBounds?.height??selected.template?.footprint.height??0)} world units{selected.planBounds&&` · both team model boxes + ${selected.reservationLabel??'entrance'}, for one base; flat sample`}</dd><dt>{selected.authoredBase?'Modeled structures across all saved teams':'Modeled structures for one team'}</dt><dd>{selected.modeledCount} total · {selected.power} power cells · {selected.services} service pads · {selected.defenses} defensive structures · {selected.concealment} Darklights</dd></dl>
            <p>{selected.authoredBase?'Next: open the saved package in authored placement, adjust origin/rotation and terrain handling, then Preview authored base and Apply. Teams and rules are retained.': selected.id==='three-lane-anchor' ? 'Next: choose a size, move or rotate the paired courts, then Preview formation and Apply formation. Count 0 uses the size minimum; higher targets add defenses when they fit. Yards stay fixed; placement checks terrain and all six unbound exits. Save an authored base or whole map for reuse.' : selected.id==='valley-pockets' ? 'Next: choose a size, move or rotate the paired yards, and reroll if needed. Preview formation → Apply formation. Current buildings are retained. Raise the count to add defenses; built-in passage ends stay fixed. Save a favorite to reuse unchanged yards and passages.' : ['Creative','Experimental'].includes(selected.category) ? 'Next: move and rotate the mirrored pair, adjust count or entrance, then Preview formation → Apply formation. Preview may adapt yards and reject blocked approaches. The card sample is not a terrain-fit result.' : selected.category === 'My bases' ? 'Next: preview the saved mirrored pair, move or rotate it, then Apply formation. The composition stays fixed; check power and access on this terrain.' : 'Next: choose a team, adjust footprint spacing and yaw, then hover over terrain for a preview. Click terrain to place one copy in the active layout. This is not a mirrored-pair generator; Undo removes the placement.'}</p>
            {selected.guidance&&<p>{selected.guidance}</p>}
            {selected.reservationBands&&<p>Violet bands: {selected.reservationLabel ?? 'reserved space'} ({[...new Set(selected.reservationBands.map(b=>b.width))].join(', ')} units wide). Symbols mark building centers; preview checks fit on your terrain.</p>}
            {selected.approach&&<p>Violet band: reserved {selected.reservationLabel??'entrance'}, {selected.reservationWidth??200} world units wide. Structure symbols mark centers. This card is a plan sample, not a terrain fit or game-balance result.</p>}
            <p>Entrances and power coverage must be inspected on the current map. Counts and sample footprints do not certify coverage. Authored packages reject missing model types; other templates may omit unavailable models.</p>
            {selected.error && <p role="alert">{selected.error}</p>}
          </> : <p>Select a card to see composition, source, placement behavior and limitations.</p>}
        </section>
      </div>
      <div className="base-library-footer"><button type="button" onClick={onClose}>Close library</button><span>{selected?.name ?? 'Select a design'}</span><button className="base-library-use" type="button" disabled={!selected?.template||!!selected.error} onClick={() => { if(selected){if(selected.authoredBase&&localStorage.getItem(AUTHORED_LIBRARY_KEY)!==authored.raw){setAuthored(readAuthored());setSelectedKey('');return;}onChoose(selected);} }}>Preview on current map</button></div>
    </DialogContent>
  </Dialog>;
}

