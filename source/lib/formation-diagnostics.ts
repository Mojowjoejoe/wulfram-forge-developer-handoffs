export interface FormationOverlay { routes: Array<Array<[number,number]>>; blocked: Array<{x:number;y:number;message:string}> }
export class FormationDiagnosticError extends Error {
  overlay:FormationOverlay;
  constructor(message:string,overlay:FormationOverlay){super(message);this.name='FormationDiagnosticError';this.overlay=overlay;}
}
