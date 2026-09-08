// Source evidence only: conditional visibility, generated lists and runtime
// accessibility still require native inspection. No editor is opened or edited.
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'components/editor');
const controls=new Set(['button','Button','input','select','textarea','summary','output','NumberField','RangeField','EditorMenuBar']);
const files=[];
for(const name of (await fs.readdir(directory)).filter(n=>n.endsWith('.tsx')).sort()){
  const file=path.join(directory,name),source=await fs.readFile(file,'utf8');
  const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const entries=[];
  const visit=node=>{
    if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
      const tag=node.tagName.getText(tree);
      if(controls.has(tag)||node.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText(tree)==='aria-live')){
        const attributes={};
        for(const attribute of node.attributes.properties){
          if(ts.isJsxAttribute(attribute)){
            const key=attribute.name.getText(tree);
            if(['label','aria-label','aria-live','role','title','placeholder','type','disabled','className','onClick','onChange','onSubmit','value','groups'].includes(key))attributes[key]=attribute.initializer?.getText(tree)??true;
          }
        }
        const parent=node.parent;
        const content=ts.isJsxElement(parent)?parent.children.map(child=>ts.isJsxText(child)?child.text.trim():ts.isJsxExpression(child)?child.getText(tree):'').filter(Boolean).join(' '):'';
        entries.push({line:tree.getLineAndCharacterOfPosition(node.getStart(tree)).line+1,tag,attributes,content});
      }
    }
    ts.forEachChild(node,visit);
  };
  visit(tree);
  files.push({file:'components/editor/'+name,sha256:createHash('sha256').update(source).digest('hex'),controls:entries});
}
const report={generatedAt:new Date().toISOString(),scope:'Static JSX controls, explicit output and aria-live regions; not every plain-text statistic, rendered control count, native coverage or accessibility acceptance. Dynamic menu groups and mapped entries require source/runtime review.',fileCount:files.length,sourceControlCount:files.reduce((sum,f)=>sum+f.controls.length,0),files};
const output=path.resolve(process.argv[2]??path.join(root,'outputs/editor-control-inventory-current.json'));
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({output,fileCount:report.fileCount,sourceControlCount:report.sourceControlCount}));
