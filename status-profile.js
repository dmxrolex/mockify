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
