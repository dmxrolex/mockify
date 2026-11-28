// Rows of the status sample that hold glyphs or app content, judged by local contrast so smooth
// gradients under the bar do not count. Returns the first quiet run after the glyph rows.
export function statusGap(pixels,width,height){
  const busy=new Uint8Array(height),lum=new Float32Array(width),need=Math.max(2,Math.round(height*.06)),radius=6;
  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){const i=(y*width+x)*4;lum[x]=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];}
    let count=0;
    for(let x=0;x<width;x++){let sum=0,n=0;for(let k=Math.max(0,x-radius);k<=Math.min(width-1,x+radius);k++){sum+=lum[k];n++;}if(Math.abs(lum[x]-sum/n)>14)count++;}
    busy[y]=count/width>.012?1:0;
  }
  let y=0;while(y<height&&!busy[y])y++;
  if(y>=height)return null;
  while(y<height&&busy[y])y++;
  while(y<height){let k=0;while(y+k<height&&!busy[y+k])k++;if(k>=need||y+k>=height&&k>=2)return {start:y,end:y+k};y+=k;while(y<height&&busy[y])y++;}
  return null;
}
