export interface OperationContext {
  mode:'terrain'|'base';tool:string;mirror:boolean;inspection:boolean;creative:boolean;
  placement:boolean;layoutName:string;dialog:boolean;
  blocked?:string;lanePreview?:boolean;
}
export function operationScope(c:OperationContext){
  if(c.dialog)return {kind:'preview',label:'Preview dialog · review before Apply',detail:'The dialog explains which terrain or layout will change. Editing preview settings alone does not apply the result.'};
  if(c.mode==='terrain'){
    if(c.tool==='lane')return {kind:'preview',label:c.lanePreview?'Shared terrain · lane preview · Apply to commit':'Shared terrain · lane tool · Draw a lane to preview',detail:'Draw a lane and adjust its bend, width, floor and shoulders. Preview settings do not change the map. Apply lane records one Undo step.'};
    if(c.tool==='landform')return {kind:'preview',label:`Shared terrain · ${c.mirror?'mirrored footprints':'single footprint'} · ${c.blocked?'preview blocked':'click to apply'}`,detail:c.blocked??'Hover shows the landform preview. One click applies it; map Undo restores that placement. Terrain is shared by every base layout.'};
    return {kind:'edit',label:`Shared terrain · ${c.tool==='paint'?'texture painting':'height editing'} · immediate stroke`,detail:'Dragging edits the brush footprint immediately. Map Undo restores one stroke. Terrain changes are shared by every base layout.'};
  }
  if(c.inspection)return {kind:'read',label:c.creative?'Formation preview · inspect only':'Active layout · inspect only',detail:'Viewport clicks inspect buildings; camera movement does not edit the map.'};
  if(c.creative)return {kind:'preview',label:'New base layout · Preview, then Apply',detail:'Position and reroll the proposed formation. Apply creates a separate layout; existing layouts remain available. Previewing does not change the map.'};
  return {kind:'edit',label:`Active layout · ${c.placement?'click to place':'select and edit buildings'}`,detail:`${c.layoutName}: manual building edits affect this layout. They do not automatically mirror to the other team. Map Undo restores the edit.`};
}
