import {operationScope,type OperationContext} from '@/lib/operation-scope';
export function OperationScope({context}:{context:OperationContext}){
  const scope=operationScope(context);
  return <details className={`operation-scope operation-scope-${scope.kind}`} aria-label="Current operation scope">
    <summary>{scope.label}</summary><p>{scope.detail}</p>
  </details>;
}
