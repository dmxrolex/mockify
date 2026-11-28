// Rows of a status-bar sample that hold glyphs or app content, judged by local contrast so
// smooth gradients and photos' soft areas do not count as content.
export function busyRows(pixels,width,height){
  const busy=new Uint8Array(height),lum=new Float32Array(width),radius=6;
  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){const i=(y*width+x)*4;lum[x]=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];}
    let count=0;
    for(let x=0;x<width;x++){let sum=0,n=0;for(let k=Math.max(0,x-radius);k<=Math.min(width-1,x+radius);k++){sum+=lum[k];n++;}if(Math.abs(lum[x]-sum/n)>14)count++;}
    busy[y]=count/width>.012?1:0;
  }
  return busy;
}
// First run of quiet rows starting at or after `from` (in rows), at least `need` long.
export function quietRun(busy,from,need){
  let y=Math.max(0,Math.floor(from));
  while(y<busy.length){
    while(y<busy.length&&busy[y])y++;
    let k=0;while(y+k<busy.length&&!busy[y+k])k++;
    if(k>=need||(y+k>=busy.length&&k>=2))return {start:y,end:y+k};
    y+=k;
  }
  return null;
}
// The quiet gap right under the old status glyphs.
export function statusGap(pixels,width,height){
  const busy=busyRows(pixels,width,height);let y=0;
  while(y<height&&!busy[y])y++;if(y>=height)return null;
  while(y<height&&busy[y])y++;
  return quietRun(busy,y,Math.max(2,Math.round(height*.06)));
}
