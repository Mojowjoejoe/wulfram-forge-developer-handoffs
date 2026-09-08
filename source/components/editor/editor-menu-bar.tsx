import {useEffect,useRef} from 'react';

export interface EditorMenuGroup {label:string;items:{label:string;run:()=>void;disabled?:boolean}[]}

export function EditorMenuBar({groups}:{groups:EditorMenuGroup[]}){
  const root=useRef<HTMLElement>(null);
  useEffect(()=>{
    const close=()=>root.current?.querySelectorAll('details[open]').forEach(item=>item.removeAttribute('open'));
    const pointer=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))close();};
    const key=(event:KeyboardEvent)=>{
      const opened=root.current?.querySelector<HTMLDetailsElement>('details[open]');
      if(event.key==='Escape'&&opened){event.preventDefault();event.stopPropagation();close();opened.querySelector('summary')?.focus();return;}
      const target=event.target;
      if(!(target instanceof HTMLElement)||!root.current?.contains(target)||event.ctrlKey||event.metaKey||event.altKey)return;
      const current=target.closest('details');
      if(!current)return;
      const menus=[...root.current.querySelectorAll('details')];
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        event.preventDefault();event.stopPropagation();
        const next=menus[(menus.indexOf(current)+(event.key==='ArrowRight'?1:menus.length-1))%menus.length];
        const wasOpen=current.open;close();next.open=wasOpen;next.querySelector('summary')?.focus();return;
      }
      if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();
      current.open=true;
      const commands=[...current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      if(!commands.length)return;
      const index=commands.indexOf(target as HTMLButtonElement);
      const next=event.key==='Home'?0:event.key==='End'?commands.length-1:index<0?(event.key==='ArrowUp'?commands.length-1:0):(index+(event.key==='ArrowDown'?1:commands.length-1))%commands.length;
      commands[next].focus();
    };
    document.addEventListener('pointerdown',pointer);document.addEventListener('keydown',key,true);
    return()=>{document.removeEventListener('pointerdown',pointer);document.removeEventListener('keydown',key,true);};
  },[]);
  return <nav className="editor-menu-bar" aria-label="Editor commands" ref={root}>
    {groups.map(group=><details key={group.label} onToggle={event=>{
      if(event.currentTarget.open)root.current?.querySelectorAll('details').forEach(other=>{if(other!==event.currentTarget)other.open=false;});
    }}>
      <summary>{group.label}</summary>
      <div className="editor-menu-items">{group.items.map(item=><button key={item.label} type="button" disabled={item.disabled} onClick={event=>{
        event.currentTarget.closest('details')?.removeAttribute('open');item.run();
      }}>{item.label}</button>)}</div>
    </details>)}
  </nav>;
}
