export function encodeWebP(canvas,signal){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new DOMException('Export canceled','AbortError'));return;}
    const worker=new Worker(new URL('./webp-worker.js',import.meta.url),{type:'module'});
    const cleanup=()=>{worker.terminate();signal?.removeEventListener('abort',abort);};
    const abort=()=>{cleanup();reject(new DOMException('Export canceled','AbortError'));};
    worker.onmessage=({data})=>{cleanup();if(data.error)reject(new Error(data.error));else resolve(new Blob([data.buffer],{type:'image/webp'}));};
    worker.onerror=()=>{cleanup();reject(new Error('Could not encode the image. Try Full HD.'));};
    signal?.addEventListener('abort',abort,{once:true});
    try{const image=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);worker.postMessage({pixels:image.data.buffer,width:image.width,height:image.height},[image.data.buffer]);}
    catch(error){cleanup();reject(error);}
  });
}
