import type { EditorMode, TerrainTool } from './terrain-viewport';
import {AboutEditor} from './about-editor';

const terrainHelp: Record<TerrainTool, string> = {
  lane: 'Draw a lane through high terrain, then adjust its width, floor height and shoulder blend. Release previews the cut; Apply lane commits one Undo step. Existing saved height protections and structure reserves still apply.',
  sculpt: 'Raise terrain by dragging. Radius is in world units; strength controls the height change. Each stroke edits immediately and can be undone.',
  lower: 'Lower terrain by dragging. Radius is in world units. Each stroke edits immediately; Undo restores the previous stroke.',
  level: 'Start a stroke at the terrain height you want to match, then drag to flatten toward that height. The flat-pad preset uses a square brush with a hard edge. Undo restores the stroke. Use Set height for a numeric target.',
  smooth: 'Drag to soften sharp terrain changes. This changes terrain heights immediately; Undo restores the stroke.',
  paint: 'Choose a texture on the left, then drag to paint. This changes surface appearance, not terrain height. Undo restores the stroke.',
  stamp: 'Set terrain to the target height inside the brush. Check shape, radius and falloff before dragging. Undo restores the stroke.',
  landform: 'Choose a starter and set full length, width and peak height in world units. Hover to preview; click to place. Protected mode needs authored protection data. Check Mirror partner to understand the second footprint. Undo removes a placement.',
};

export function WorkflowGuide({ mode, tool, inspecting, templateCount, onAction }: {
  mode: EditorMode; tool: TerrainTool; inspecting: boolean;
  templateCount:number;
  onAction: (action: 'sculpt' | 'landform' | 'bases' | 'random' | 'inspect' | 'save') => void;
}) {
  return <section className="workflow-guide" aria-label="Map-making guide">
    <details>
      <summary>Map-making guide</summary>
      <p>Start with New or Import above. Work by hand, generate a candidate, or combine both.</p>
      <nav aria-label="Map-making tasks">
        {([['sculpt', 'Sculpt terrain'], ['landform', 'Large landforms'], ['bases', 'Choose base presets'], ['random', 'Generate a map'], ['inspect', 'Inspect bases'], ['save', 'Save and export help']] as const).map(([action, label]) =>
          <button type="button" key={action} onClick={() => onAction(action)}>{label}</button>)}
      </nav>
      <p>Undo / Redo are above the viewport. Save local keeps an editable copy on this device. Export map downloads a portable ZIP; keep a copy before starting another map.</p>
      <details><summary>Overlay legend</summary><p>Yellow lightning: powered according to editor rules. Red slashed lightning: unpowered. Green/red tint shows power status. Cyan lines show routes or inspected power connections. Red clearance markers indicate blocked space; yellow indicates tight space. Estimated Darklight and turret circles need server verification. Hiding an overlay does not disable checks.</p></details>
      <AboutEditor templateCount={templateCount}/>
    </details>
    <details key={`${mode}-${tool}-${inspecting}`}>
      <summary>{mode === 'terrain' ? `Active tool: ${({sculpt:'Raise',lower:'Lower',level:'Flatten',smooth:'Smooth',paint:'Paint texture',stamp:'Set height',landform:'Large landforms',lane:'Lane tool'}[tool])}` : inspecting ? 'Active mode: Inspect bases' : 'Active mode: Base builder'}</summary>
      <p>{mode === 'terrain' ? terrainHelp[tool] : inspecting ? 'Inspection selects buildings without moving them. Use power links, camera views and route checks in the right panel. Clearance checks approximate space; they are not vehicle playtests.' : 'Choose a layout or creative style in Base layout states below. Creative formations require Preview formation, then Apply formation. Check team, footprint, count and mirrored partner. Manual building placement edits the active layout immediately; Undo restores it.'}</p>
    </details>
  </section>;
}
