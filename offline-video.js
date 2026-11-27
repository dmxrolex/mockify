import {keptVideoSegments} from './video-edits.js';
import {Input,ALL_FORMATS,BlobSource,Output,Mp4OutputFormat,BufferTarget,CanvasSource,VideoSampleSink,AudioBufferSink,AudioBufferSource,Quality,canEncodeVideo,canEncodeAudio} from 'mediabunny';
import {createRenderer,loadWatermarkBadge} from './render.js';
import {loadTextFonts} from './text-fonts.js';
import {recordingsInScene,recordingInScene,videoPlan,clipTime,MAX_VIDEO_BYTES,timelineMediaSchedule} from './video-plan.js';
import {evaluateTimeline,timelineFor} from './timeline-model.js';

export async function offlineVideo(settings,sources,photo,quality,signal,report){
  const timeline=timelineFor(settings,sources);
  if(timeline)return offlineTimelineVideo({...settings,timeline},sources,photo,quality,signal,report);
  const primary=recordingInScene(settings,sources),plan=videoPlan(primary.settings,primary.source,quality);
  if(!await canEncodeVideo('avc',{width:plan.width,height:plan.height}))return null;
  const inputs=[],states=[];let output,paint,videoSource,audioSource;
  let disposed=false;
  const disposeInputs=()=>{if(disposed)return;disposed=true;for(const input of inputs)input.dispose();};
  const abort=()=>{if(output&&output.state!=='finalized')void output.cancel().catch(()=>{});disposeInputs();};
  signal.addEventListener('abort',abort,{once:true});
  const check=()=>{if(signal.aborted)throw new DOMException('Export canceled','AbortError');};
  try{
    check();if(plan.estimatedBytes>MAX_VIDEO_BYTES)throw new Error(quality==='high'?'Choose Standard quality for this recording.':'This recording is too long to send in one file.');
    let fps=30;
    for(const clip of recordingsInScene(settings,sources)){
      const input=new Input({formats:ALL_FORMATS,source:new BlobSource(clip.source.blob)});inputs.push(input);
      const track=await input.getPrimaryVideoTrack();if(!track||!await track.canDecode())return null;
      check();const metrics=await track.computeFrameRateMetrics({targetPacketCount:100});
      if(clip.source===primary.source)fps=Number.isFinite(metrics.bestGuessFrameRate)&&metrics.bestGuessFrameRate>0?metrics.bestGuessFrameRate:30;
      const audio=await input.getPrimaryAudioTrack();if(audio&&!await audio.canDecode())return null;
      states.push({clip,input,track,audio});
    }
    if(states.some(state=>state.audio)&&!await canEncodeAudio('aac',{sampleRate:48000,numberOfChannels:2}))return null;
    const count=Math.ceil(plan.seconds*fps-1e-7),canvas=document.createElement('canvas');canvas.width=plan.width;canvas.height=plan.height;
    // Export never uses the interactive low-resolution texture path.
    paint=createRenderer(canvas,{cacheScene:false});await Promise.all([loadTextFonts(settings),loadWatermarkBadge(settings.watermarkBadge)]);
    const target=new BufferTarget();output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target});
    videoSource=new CanvasSource(canvas,{codec:'avc',quality:new Quality({bitrate:plan.videoBitsPerSecond}),latencyMode:'quality',bitrateMode:'constant',keyFrameInterval:2,contentHint:'detail'});output.addVideoTrack(videoSource,{frameRate:fps});
    const audioStates=states.filter(state=>state.audio);
    if(audioStates.length){audioSource=new AudioBufferSource({codec:'aac',quality:new Quality({bitrate:128000})});output.addAudioTrack(audioSource);}
    for(const state of states){
      state.segments=keptVideoSegments(state.clip.settings,state.clip.source.element.duration);
      function* times(){for(let i=0;i<count;i++)yield clipTime(state.clip,i/fps,state.segments);}
      state.frames=new VideoSampleSink(state.track).samplesAtTimestamps(times());
      state.canvas=document.createElement('canvas');state.canvas.width=state.clip.source.width;state.canvas.height=state.clip.source.height;
      state.context=state.canvas.getContext('2d');state.canvas.readyState=4;state.canvas.currentTime=0;state.canvas.duration=state.clip.source.element.duration;state.media={...state.clip.source,element:state.canvas};
      if(state.audio){
        const sink=new AudioBufferSink(state.audio);
        let elapsed=0;
        state.audioSpans=state.segments.map(({start,end})=>{
          const span={start,end,outputStart:elapsed,outputEnd:elapsed+end-start};
          elapsed=span.outputEnd;
          return span;
        });
        async function* buffers(){
          for(const span of state.audioSpans){
            for await(const wrapped of sink.buffers(span.start,span.end))yield {span,wrapped};
          }
        }
        state.buffers=buffers();
        state.next=await state.buffers.next();
      }
    }
    await output.start();let audioSample=0,lastYield=performance.now();
    async function writeAudio(until){
      const sampleRate=48000;
      while(audioSource&&audioSample<Math.round(until*sampleRate)){
        check();
        const length=Math.min(sampleRate/2,Math.round(plan.seconds*sampleRate)-audioSample);
        if(!length)break;
        const from=audioSample/sampleRate,to=(audioSample+length)/sampleRate;
        const mixed=new AudioBuffer({length,numberOfChannels:2,sampleRate});
        for(const state of audioStates){
          while(!state.next.done){
            const {span,wrapped}=state.next.value,buffer=wrapped.buffer;
            const offset=span.outputStart-span.start;
            const start=Math.max(span.outputStart,wrapped.timestamp+offset);
            const stop=Math.min(span.outputEnd,wrapped.timestamp+wrapped.duration+offset);
            if(start>=to)break;
            if(stop>from){
              const first=Math.max(0,Math.ceil((start-from)*sampleRate));
              const last=Math.min(length,Math.ceil((stop-from)*sampleRate));
              for(let channel=0;channel<2;channel++){
                const data=buffer.getChannelData(Math.min(channel,buffer.numberOfChannels-1)),dest=mixed.getChannelData(channel);
                for(let i=first;i<last;i++){
                  const position=(from+i/sampleRate-wrapped.timestamp-offset)*buffer.sampleRate;
                  const index=Math.max(0,Math.min(data.length-1,Math.floor(position)));
                  const fraction=Math.max(0,Math.min(1,position-index));
                  dest[i]+=(data[index]+((data[index+1]??data[index])-data[index])*fraction)/audioStates.length;
                }
              }
            }
            if(stop>to+.000001)break;
            state.next=await state.buffers.next();
          }
        }
        await audioSource.add(mixed);audioSample+=length;
      }
    }
    const sourceMap=new Map(states.map(state=>[state.clip.source,state.media]));
    for(let i=0;i<count;i++){
      check();for(const state of states){const next=await state.frames.next(),sample=next.value;if(!sample)throw new Error('A video frame could not be decoded.');try{state.canvas.currentTime=clipTime(state.clip,i/fps,state.segments);state.context.clearRect(0,0,state.canvas.width,state.canvas.height);sample.draw(state.context,0,0,state.canvas.width,state.canvas.height);}finally{sample.close();}}
      const media=Array.isArray(sources)?sources.map(source=>sourceMap.get(source)??source):sourceMap.get(sources)??sources;
      paint(settings,media,photo,(i/fps)/plan.seconds);if(settings.background==='transparent'){const ctx=canvas.getContext('2d');ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-over';}
      await videoSource.add(i/fps,Math.min(1/fps,plan.seconds-i/fps));await writeAudio(Math.min(plan.seconds,(i+1)/fps));report(.95*(i+1)/count);
      if(performance.now()-lastYield>25){await(globalThis.scheduler?.yield?.()??new Promise(resolve=>setTimeout(resolve,0)));lastYield=performance.now();}
    }
    videoSource.close();audioSource?.close();check();await output.finalize();check();const blob=new Blob([target.buffer],{type:'video/mp4'});if(blob.size>MAX_VIDEO_BYTES)throw new Error('This file is too large. Choose Standard quality.');report(1);return blob;
  }catch(error){if(signal.aborted)throw new DOMException('Export canceled','AbortError');throw error;}finally{
    signal.removeEventListener('abort',abort);
    if(output&&output.state!=='finalized')await output.cancel().catch(()=>{});
    for(const state of states){await state.frames?.return().catch(()=>{});await state.buffers?.return().catch(()=>{});if(state.canvas)state.canvas.width=state.canvas.height=1;}
    disposeInputs();paint?.dispose();
  }
}

// Resolve every video and audio sample on project time. Each clip instance owns
// its decoder iterator and draw surface, even when several instances reuse a file.
async function offlineTimelineVideo(settings,sources,photo,quality,signal,report){
  const primary=recordingInScene(settings,sources);
  if(!primary)return null;
  const plan=videoPlan(settings,primary.source,quality,sources);
  if(!(plan.seconds>0))throw new Error('Add a clip before exporting.');
  if(!await canEncodeVideo('avc',{width:plan.width,height:plan.height}))return null;
  const schedule=timelineMediaSchedule(settings,sources),inputs=[],states=[];
  let output,paint,videoSource,audioSource,canvas,disposed=false;
  const disposeInputs=()=>{if(disposed)return;disposed=true;for(const input of inputs)input.dispose();};
  const abort=()=>{if(output&&output.state!=='finalized')void output.cancel().catch(()=>{});disposeInputs();};
  const check=()=>{if(signal.aborted)throw new DOMException('Export canceled','AbortError');};
  signal.addEventListener('abort',abort,{once:true});
  try{
    check();
    if(plan.estimatedBytes>MAX_VIDEO_BYTES)throw new Error(quality==='high'?'Choose Standard quality for this recording.':'This recording is too long to send in one file.');
    let fps=primary.source.frameRate??30,foundPrimary=false;
    // Decode each uploaded file once for metadata; per-instance sinks below
    // still provide independent frame positions for simultaneous overlays.
    const files=new Map();
    for(const item of schedule){
      if(item.source.kind!=='video')continue;
      let file=files.get(item.source.blob??item.source);
      if(!file){
        const input=new Input({formats:ALL_FORMATS,source:new BlobSource(item.source.blob)});inputs.push(input);
        const track=await input.getPrimaryVideoTrack();if(!track||!await track.canDecode())return null;
        const audio=await input.getPrimaryAudioTrack();
        file={input,track,audio};files.set(item.source.blob??item.source,file);
      }
      if(item.source===primary.source&&!foundPrimary){
        const metrics=await file.track.computeFrameRateMetrics({targetPacketCount:100});
        fps=Number.isFinite(metrics.bestGuessFrameRate)&&metrics.bestGuessFrameRate>0?metrics.bestGuessFrameRate:30;
        foundPrimary=true;
      }
      const audio=item.volume>0?file.audio:null;
      if(audio&&!await audio.canDecode())return null;
      states.push({...item,...file,audio});check();
    }
    fps=Number.isFinite(fps)&&fps>0?fps:30;
    const audioStates=states.filter(state=>state.audio);
    if(audioStates.length&&!await canEncodeAudio('aac',{sampleRate:48000,numberOfChannels:2}))return null;
    const count=Math.ceil(plan.seconds*fps-1e-7);
    canvas=document.createElement('canvas');canvas.width=plan.width;canvas.height=plan.height;
    paint=createRenderer(canvas,{cacheScene:false});
    await Promise.all([loadTextFonts(settings),loadWatermarkBadge(settings.watermarkBadge)]);
    const target=new BufferTarget();
    output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target});
    videoSource=new CanvasSource(canvas,{codec:'avc',quality:new Quality({bitrate:plan.videoBitsPerSecond}),latencyMode:'quality',bitrateMode:'constant',keyFrameInterval:2,contentHint:'detail'});
    output.addVideoTrack(videoSource,{frameRate:fps});
    if(audioStates.length){audioSource=new AudioBufferSource({codec:'aac',quality:new Quality({bitrate:plan.audioBitsPerSecond})});output.addAudioTrack(audioSource);}
    for(const state of states){
      function* times(){
        const first=Math.max(0,Math.ceil(state.start*fps-1e-7)),last=Math.min(count,Math.ceil(state.end*fps-1e-7));
        for(let frame=first;frame<last;frame++)yield Math.min(state.out-.000001,state.in+frame/fps-state.start);
      }
      state.frames=new VideoSampleSink(state.track).samplesAtTimestamps(times());
      state.canvas=document.createElement('canvas');state.canvas.width=state.source.width;state.canvas.height=state.source.height;
      state.context=state.canvas.getContext('2d');state.canvas.readyState=4;state.canvas.currentTime=state.in;
      state.canvas.duration=state.source.element?.duration??state.source.duration??state.out;
      state.media={...state.source,element:state.canvas};
      if(state.audio){
        state.audioSpan={start:state.in,end:state.in+state.end-state.start,outputStart:state.start,outputEnd:state.end};
        state.buffers=new AudioBufferSink(state.audio).buffers(state.audioSpan.start,state.audioSpan.end);
        state.nextAudio=await state.buffers.next();
      }
    }
    const byId=new Map(states.map(state=>[state.id,state]));
    await output.start();let audioSample=0,lastYield=performance.now();
    async function writeAudio(until){
      const sampleRate=48000;
      while(audioSource&&audioSample<Math.round(until*sampleRate)){
        check();
        const length=Math.min(sampleRate/4,Math.round(plan.seconds*sampleRate)-audioSample);
        if(!length)break;
        const from=audioSample/sampleRate,to=(audioSample+length)/sampleRate;
        const mixed=new AudioBuffer({length,numberOfChannels:2,sampleRate});
        for(const state of audioStates){
          const span=state.audioSpan,offset=span.outputStart-span.start;
          while(!state.nextAudio.done){
            const wrapped=state.nextAudio.value,buffer=wrapped.buffer;
            const start=Math.max(span.outputStart,wrapped.timestamp+offset),stop=Math.min(span.outputEnd,wrapped.timestamp+wrapped.duration+offset);
            if(start>=to)break;
            if(stop>from){
              const first=Math.max(0,Math.ceil((start-from)*sampleRate)),last=Math.min(length,Math.ceil((stop-from)*sampleRate));
              for(let channel=0;channel<2;channel++){
                const data=buffer.getChannelData(Math.min(channel,buffer.numberOfChannels-1)),dest=mixed.getChannelData(channel);
                for(let i=first;i<last;i++){
                  const position=(from+i/sampleRate-wrapped.timestamp-offset)*buffer.sampleRate,index=Math.max(0,Math.min(data.length-1,Math.floor(position))),fraction=Math.max(0,Math.min(1,position-index));
                  dest[i]+=(data[index]+((data[index+1]??data[index])-data[index])*fraction)*state.volume;
                }
              }
            }
            if(stop>to+.000001)break;
            state.nextAudio=await state.buffers.next();
          }
        }
        // Summing enabled tracks keeps solo-track volume intact; clip only the
        // final mixed signal instead of dividing by the number of audio files.
        for(let channel=0;channel<2;channel++){const data=mixed.getChannelData(channel);for(let i=0;i<data.length;i++)data[i]=Math.max(-1,Math.min(1,data[i]));}
        await audioSource.add(mixed);audioSample+=length;
      }
    }
    for(let frame=0;frame<count;frame++){
      check();const time=frame/fps,resolved=evaluateTimeline(settings,sources,time),media=Array.isArray(sources)?[...sources]:[sources];
      const replacements=new Map();
      for(const entry of resolved.entries){
        if(entry.source?.kind!=='video')continue;
        const state=byId.get(entry.id);if(!state)throw new Error('A video clip is missing from the timeline.');
        const sample=(await state.frames.next()).value;if(!sample)throw new Error('A video frame could not be decoded.');
        try{state.canvas.currentTime=entry.sourceTime;state.context.clearRect(0,0,state.canvas.width,state.canvas.height);sample.draw(state.context,0,0,state.canvas.width,state.canvas.height);}finally{sample.close();}
        const index=media.push(state.media)-1;
        replacements.set(entry.renderObjectId??entry.objectId,index);
      }
      const scene={...resolved.settings,_timelineTime:time,_timelineEvaluated:true,pageObjects:resolved.settings.pageObjects?.map(object=>replacements.has(object.id)?{...object,index:replacements.get(object.id)}:object)};
      paint(scene,media,photo,time/plan.seconds);
      if(settings.background==='transparent'){const ctx=canvas.getContext('2d');ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-over';}
      await videoSource.add(time,Math.min(1/fps,plan.seconds-time));
      await writeAudio(Math.min(plan.seconds,(frame+1)/fps));report(.95*(frame+1)/count);
      if(performance.now()-lastYield>25){await(globalThis.scheduler?.yield?.()??new Promise(resolve=>setTimeout(resolve,0)));lastYield=performance.now();}
    }
    videoSource.close();audioSource?.close();check();await output.finalize();check();
    const blob=new Blob([target.buffer],{type:'video/mp4'});if(blob.size>MAX_VIDEO_BYTES)throw new Error('This file is too large. Choose Standard quality.');report(1);return blob;
  }catch(error){if(signal.aborted)throw new DOMException('Export canceled','AbortError');throw error;}
  finally{
    signal.removeEventListener('abort',abort);
    if(output&&output.state!=='finalized')await output.cancel().catch(()=>{});
    for(const state of states){await state.frames?.return().catch(()=>{});await state.buffers?.return().catch(()=>{});if(state.canvas)state.canvas.width=state.canvas.height=1;}
    disposeInputs();paint?.dispose();if(canvas)canvas.width=canvas.height=1;
  }
}
