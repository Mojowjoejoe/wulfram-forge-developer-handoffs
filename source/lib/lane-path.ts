export type LanePoint = [number, number];

/** Display and terrain editing share the exact sampled centerline. */
export function lanePath(points:LanePoint[],bend=0):LanePoint[]{
 if(!bend||points.length!==2)return points;
 const [a,b]=points,dx=b[0]-a[0],dy=b[1]-a[1];
 return Array.from({length:33},(_,i)=>{
   const t=i/32,offset=2*bend*t*(1-t);
   return [a[0]+dx*t-dy*offset,a[1]+dy*t+dx*offset];
 });
}

export function bendAtPoint(points:LanePoint[],point:LanePoint):number{
 if(points.length!==2)throw new Error('A bend handle requires two endpoints.');
 const [a,b]=points,dx=b[0]-a[0],dy=b[1]-a[1],length2=dx*dx+dy*dy;
 if(length2<1)return 0;
 return Math.max(-1,Math.min(1,2*(-dy*(point[0]-(a[0]+b[0])/2)+dx*(point[1]-(a[1]+b[1])/2))/length2));
}

export function insertLanePoint(points:LanePoint[],after:number):LanePoint[]{
 if(points.length>=32||after<0||after>=points.length-1||!Number.isInteger(after))throw new Error('Choose a segment in a lane with fewer than 32 points.');
 const a=points[after],b=points[after+1];
 return [...points.slice(0,after+1),[(a[0]+b[0])/2,(a[1]+b[1])/2],...points.slice(after+1)];
}
