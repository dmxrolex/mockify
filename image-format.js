const png={mime:'image/png',extension:'png'};
export async function formatForMedia(media) {
  if(Array.isArray(media))media=media[0];
  if(!media?.blob||media.kind==='video')return png;
  const bytes=new Uint8Array(await media.blob.slice(0,12).arrayBuffer());
  if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return {mime:'image/jpeg',extension:/\.jpeg$/i.test(media.name??'')?'jpeg':'jpg'};
  if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return {mime:'image/webp',extension:'webp'};
  return png;
}
