'use client';
import {useRef,useState} from 'react';
import {findTools,type ToolDestination} from '@/lib/tool-navigation';
export function ToolFinder({onNavigate}:{onNavigate:(tool:ToolDestination)=>Promise<string>}){
  const [query,setQuery]=useState(''),[message,setMessage]=useState('');
  const matches=findTools(query);
  const request=useRef(0);
  const results=useRef<HTMLDivElement>(null);
  async function navigate(tool:ToolDestination){
    const id=++request.current;setMessage(`Opening ${tool.label}…`);
    try{const result=await onNavigate(tool);if(id===request.current)setMessage(result);}
    catch{if(id===request.current)setMessage('Could not open this tool. Try again.');}
  }
  return <details className="tool-finder"><summary>Find tools and settings</summary>
    <label>Find a tool<input aria-label="Find editor tools" aria-describedby="tool-finder-help" value={query} maxLength={100} placeholder="Try power, valley or lock" onChange={e=>{setQuery(e.target.value);request.current++;setMessage('');}} onKeyDown={e=>{
      if(e.key==='ArrowDown'){e.preventDefault();results.current?.querySelector('button')?.focus();}
      if(e.key==='Enter'&&matches.length===1){e.preventDefault();void navigate(matches[0]);}
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setQuery('');request.current++;setMessage('');}
    }}/></label>
    <p id="tool-finder-help">Shortcuts open controls without edits. Down arrow enters results; Tab moves between them. Enter opens a single match. Escape clears search.</p>
    <div ref={results} className="tool-finder-results">{matches.map(tool=><button type="button" key={tool.id} onClick={()=>void navigate(tool)}>{tool.label}</button>)}</div>
    <output aria-live="polite">{message||`${matches.length} matching tools${matches.length?'':'. Try a shorter name or another term.'}`}</output>
  </details>;
}
