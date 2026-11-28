// Status cleanup produces a constant colour down each column. Filter that 1D
// profile once instead of repeating both Gaussian passes for every row.
export function cleanStatusProfile(pixels,width,height,kernel,weight){
  const profile=new Uint8Array(width*3),histogram=new Uint32Array(256),radius=(kernel.length-1)/2;
  for(let col=0;col<width;col++)for(let channel=0;channel<3;channel++){
    histogram.fill(0);let count=0;
    for(let row=0;row<height;row++)for(const offset of [-2,0,2]){const at=(row*width+Math.max(0,Math.min(width-1,col+offset)))*4;if(pixels[at+3]>240){histogram[pixels[at+channel]]++;count++;}}
    if(count){const middle=Math.floor(count/2);let total=0;for(let value=0;value<256;value++){total+=histogram[value];if(total>middle){profile[col*3+channel]=value;break;}}}
  }
  const blurred=new Uint8Array(width*3);
  for(let col=0;col<width;col++)for(let channel=0;channel<3;channel++){
    let sum=0;for(let tap=-radius;tap<=radius;tap++)sum+=profile[Math.max(0,Math.min(width-1,col+tap))*3+channel]*kernel[tap+radius];
    // Preserve the previous Float32 intermediate and vertical-pass rounding.
    const horizontal=Math.fround(sum/weight);let vertical=0;for(const value of kernel)vertical+=horizontal*value;
    blurred[col*3+channel]=Math.round(vertical/weight);
  }
  for(let row=0;row<height;row++)for(let col=0;col<width;col++){const at=(row*width+col)*4,index=col*3;pixels[at]=blurred[index];pixels[at+1]=blurred[index+1];pixels[at+2]=blurred[index+2];pixels[at+3]=255;}
}

// Row-aware cleanup: rows holding glyphs, text or icons are rebuilt per column by
// interpolating between the nearest plain rows above and below, so a coloured status bar
// keeps its colour, the app's header keeps its own, and nothing is averaged across them.
// Returns false when there are no plain rows to rebuild from.
export function inpaintStatusRows(pixels,width,height,busy){
  const quiet=[];for(let y=0;y<height;y++)if(!busy[y])quiet.push(y);
  if(!quiet.length)return false;
  const above=new Int32Array(height).fill(-1),below=new Int32Array(height).fill(-1);
  for(let y=0,last=-1;y<height;y++){if(!busy[y])last=y;above[y]=last;}
  for(let y=height-1,next=-1;y>=0;y--){if(!busy[y])next=y;below[y]=next;}
  const row=new Float32Array(width*3);
  for(let y=0;y<height;y++){
    if(!busy[y])continue;
    const a=above[y],b=below[y];let t=a<0?1:b<0?0:(y-a)/(b-a);
    // A clear colour change between the plain rows (a toolbar edge) stays a crisp edge
    // halfway through the glyph rows instead of becoming a smudged gradient.
    if(a>=0&&b>=0){let diff=0;for(let x=0;x<width;x+=4){const p=(a*width+x)*4,q=(b*width+x)*4;diff+=Math.abs(.2126*(pixels[p]-pixels[q])+.7152*(pixels[p+1]-pixels[q+1])+.0722*(pixels[p+2]-pixels[q+2]));}if(diff/Math.ceil(width/4)>40)t=t<.5?0:1;}
    for(let x=0;x<width;x++)for(let c=0;c<3;c++){
      const top=a<0?0:pixels[(a*width+x)*4+c],bottom=b<0?0:pixels[(b*width+x)*4+c];
      row[x*3+c]=a<0?bottom:b<0?top:top+(bottom-top)*t;
    }
    // Soften across the row so stray specks in the source rows don't streak down.
    for(let x=0;x<width;x++)for(let c=0;c<3;c++){let sum=0,n=0;for(let k=Math.max(0,x-4);k<=Math.min(width-1,x+4);k++){sum+=row[k*3+c];n++;}pixels[(y*width+x)*4+c]=Math.round(sum/n);}
    for(let x=0;x<width;x++)pixels[(y*width+x)*4+3]=255;
  }
  return true;
}

// Busy rows plus one row either side, so anti-aliased edges of text and icons are rebuilt too.
export function widenRows(busy){const out=new Uint8Array(busy.length);for(let y=0;y<busy.length;y++)if(busy[y]||busy[y-1]||busy[y+1])out[y]=1;return out;}
// Detailed backgrounds (photos) have no plain rows to rebuild from: frost them instead.
export function frostSample(pixels,width,height,radius=10){
  // Two passes of a separable box blur with running sums: linear time however wide the radius
  // (it runs on every video frame), same result as averaging each clamped window.
  const temp=new Float32Array(pixels.length);
  for(let pass=0;pass<2;pass++){
    for(let y=0;y<height;y++)for(let c=0;c<3;c++){
      const row=y*width;let sum=0,lo=0,hi=-1;
      for(let x=0;x<width;x++){
        const from=Math.max(0,x-radius),to=Math.min(width-1,x+radius);
        while(hi<to){hi++;sum+=pixels[(row+hi)*4+c];}
        while(lo<from){sum-=pixels[(row+lo)*4+c];lo++;}
        temp[(row+x)*4+c]=sum/(to-from+1);
      }
    }
    for(let x=0;x<width;x++)for(let c=0;c<3;c++){
      let sum=0,lo=0,hi=-1;
      for(let y=0;y<height;y++){
        const from=Math.max(0,y-radius),to=Math.min(height-1,y+radius);
        while(hi<to){hi++;sum+=temp[(hi*width+x)*4+c];}
        while(lo<from){sum-=temp[(lo*width+x)*4+c];lo++;}
        pixels[(y*width+x)*4+c]=Math.round(sum/(to-from+1));
      }
    }
  }
  for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
}
