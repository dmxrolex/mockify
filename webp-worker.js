import encode,{init} from '@jsquash/webp/encode.js';
import standard from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import simd from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url';

self.onmessage=async({data:{pixels,width,height}})=>{
  try{
    await init({locateFile:path=>path.includes('simd')?simd:standard});
    const buffer=await encode({data:new Uint8ClampedArray(pixels),width,height},{quality:98,method:4});
    self.postMessage({buffer},[buffer]);
  }catch(error){self.postMessage({error:error.message||'WebP encoding failed.'});}
};
