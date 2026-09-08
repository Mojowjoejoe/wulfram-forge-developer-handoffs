import type { BaseTemplate, BaseTemplateUnit } from './wulfram.ts';

type DistrictKind = 'service' | 'defense' | 'mixed';
type District = { center: [number, number]; kind: DistrictKind; yaw?: number };
export interface AdvancedBasePreset {
  template: BaseTemplate;
  recommendedDiameter: number;
  routes: Array<Array<[number, number]>>;
}

// +X faces the enemy at formation yaw 0. Distances use native world units.
// Every district has its own primary/backup pair; districts stay >610 u apart.
const districtUnits: Record<DistrictKind, Array<[string, number, number]>> = {
  service: [['e',-20,0],['e',20,0],['r',-90,-135],['f',-90,135],['u',-220,0],['s',80,-170],['s',80,170],['g',185,-90],['g',185,90],['p',-220,-220],['d',-220,220]],
  defense: [['e',-20,0],['e',20,0],['g',160,-120],['g',160,120],['L',220,0],['s',0,-210],['s',0,210]],
  mixed: [['e',-20,0],['e',20,0],['r',-100,-135],['f',-100,135],['u',-220,0],['g',160,-120],['g',160,120],['L',220,0],['s',0,-210],['s',0,210]],
};
function preset(id: string, name: string, description: string, districts: District[], routes: AdvancedBasePreset['routes']): AdvancedBasePreset {
  const units: BaseTemplateUnit[] = districts.flatMap(({center:[x,y],kind,yaw=0}) => districtUnits[kind].map(([token,dx,dy]) => ({
    token,offset:[x+dx*Math.cos(yaw)-dy*Math.sin(yaw),y+dx*Math.sin(yaw)+dy*Math.cos(yaw)] as [number,number],
    groundOffset:0,rotation:[0,0,yaw] as [number,number,number],active:1,
  })));
  const xs=units.map(u=>u.offset[0]),ys=units.map(u=>u.offset[1]);
  const recommendedDiameter=Math.ceil((2*Math.max(...units.map(u=>Math.hypot(...u.offset)))+80)/50)*50;
  return {recommendedDiameter,routes,template:{
    id:`forge-advanced-${id}-v1`,name:`Advanced · ${name}`,description:`${description} Face +X at 0° rotation. Use 1× scale and a clear ${recommendedDiameter} u base area; power layout must be revalidated after scaling.`,
    curated:true,sourceMap:'Forge Advanced Bases',sourceState:'authored-v1',sourceTeam:1,sourceWorldSize:[6400,6400],sourceAnchor:[0,0],
    unitCount:units.length,footprint:{width:Math.ceil(Math.max(...xs)-Math.min(...xs)+100),height:Math.ceil(Math.max(...ys)-Math.min(...ys)+100)},units,
  }};
}
export const ADVANCED_BASE_PRESETS: AdvancedBasePreset[] = [
  preset('bastion','Bastion Gate','Rear repair/refuel court behind two independent defense wings. A broad center exit keeps departures clear of the guns.',[
    {center:[-460,0],kind:'service'},{center:[330,-430],kind:'defense'},{center:[330,430],kind:'defense'},
  ],[[[-170,0],[900,0]],[[0,-800],[0,800]]]),
  preset('spearhead','Spearhead','Forward gun and missile wings with rear logistics. Open center approach favors quick departures; spread-out power limits a single district outage.',[
    {center:[-520,0],kind:'service'},{center:[200,-380],kind:'defense',yaw:-Math.PI/12},{center:[200,380],kind:'defense',yaw:Math.PI/12},
  ],[[[-180,0],[900,0]]]),
  preset('twin-court','Twin Service Courts','Two complete repair/refuel courts and a forward defense island. Vehicles leave through two offset exits around the island.',[
    {center:[-200,-450],kind:'mixed'},{center:[-200,450],kind:'mixed'},{center:[550,0],kind:'defense'},
  ],[[[-400,0],[150,0],[300,-330],[950,-330]],[[-400,0],[150,0],[300,330],[950,330]]]),
  preset('ringhold','Ringhold','Four self-powered districts around a cross-shaped vehicle court. Two rear service centers support forward defenses and rear-facing coverage.',[
    {center:[-450,-450],kind:'mixed',yaw:Math.PI},{center:[-450,450],kind:'mixed',yaw:Math.PI},
    {center:[450,-450],kind:'defense'},{center:[450,450],kind:'defense'},
  ],[[[-950,0],[950,0]],[[0,-950],[0,950]]]),
];
export const ADVANCED_BASE_TEMPLATES=ADVANCED_BASE_PRESETS.map(p=>p.template);
