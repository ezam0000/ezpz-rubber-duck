import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createDuck} from './duck-model';
import {createWater} from './water';

export interface RubberDuckProps{color?:string;sound?:boolean;className?:string;initialYaw?:number}
/** Standalone direct-manipulation toy. No visible controls or typography. */
export function RubberDuck({color='#ffd000',sound=true,className='',initialYaw=-.52}:RubberDuckProps){
 const host=useRef<HTMLDivElement>(null);const [failed,setFailed]=useState(false);
 useEffect(()=>{
  const el=host.current!;let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true})}catch{setFailed(true);return}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=.95;
  const canvas=renderer.domElement;el.appendChild(canvas);canvas.tabIndex=0;canvas.setAttribute('role','button');canvas.setAttribute('aria-label','Rubber duck. Hold to squeeze, drag to float, release to bounce. Space squeezes. Arrow keys move.');
  const scene=new T.Scene();scene.background=new T.Color('#a9d7d8');
  const camera=new T.PerspectiveCamera(32,1,.1,1000);
  const envGenerator=new T.PMREMGenerator(renderer);const room=new RoomEnvironment();const env=envGenerator.fromScene(room,.12);room.dispose();envGenerator.dispose();scene.environment=env.texture;scene.environmentIntensity=.5;
  const key=new T.DirectionalLight('#fff5d9',1.65);key.position.set(-3,6,5);scene.add(key,new T.HemisphereLight('#efffff','#739c94',.55));
  const {root:duck,deform,dispose:disposeDuck}=createDuck(color,()=>setFailed(true),wake);scene.add(duck);
  const water=createWater();scene.add(water.mesh);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let active=true,visible=!document.hidden,frame=0,last=0,time=0,accumulator=0;
  let compression=0,cv=0,heave=0,hv=0,roll=0,rv=0,pitch=0,pv=0;
  let x=0,z=0,vx=0,vz=0,targetX=0,targetZ=0,yaw=initialYaw,targetYaw=initialYaw,yawVelocity=0;
  let held=false,dragging=false,pointer:number|null=null,startX=0,startY=0,lastRipple=-2;
  let audio:AudioContext|null=null;
  const ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),-.28),intersection=new T.Vector3(),offset=new T.Vector3();
  function squeak(){if(!sound)return;try{audio??=new AudioContext();void audio.resume();const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain(),f=audio.createBiquadFilter();o.type='triangle';o.frequency.setValueAtTime(790,t);o.frequency.exponentialRampToValueAtTime(1320,t+.045);o.frequency.exponentialRampToValueAtTime(510,t+.2);f.type='bandpass';f.frequency.value=1600;f.Q.value=2;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.12,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.22);o.connect(f).connect(g).connect(audio.destination);o.start(t);o.stop(t+.23)}catch{/* Audio is optional. */}}
  function emitRipple(strength=.035){water.ripple(x,z,time,strength);lastRipple=time}
  function press(){held=true;wake()}
  function release(){if(!held)return;held=false;dragging=false;hv+=.72+compression*.5;rv+=.16;pv-=.13;emitRipple(.055);squeak();wake()}
  function movementLimit(){return camera.aspect<.8?.40:1.25}
  function physics(dt:number){
   const compressTarget=held?(dragging?.22:.88):0;
   cv+=((compressTarget-compression)*105-cv*16)*dt;compression=T.MathUtils.clamp(compression+cv*dt,0,1);
   // The equilibrium drops under finger pressure and rises when the force is removed.
   const waterline=held?-.16*compression:0;
   hv+=((waterline-heave)*32-hv*5)*dt;heave+=hv*dt;
   if(dragging){vx+=((targetX-x)*28-vx*8)*dt;vz+=((targetZ-z)*28-vz*8)*dt}else{vx*=Math.exp(-1.8*dt);vz*=Math.exp(-1.8*dt)}
   x+=vx*dt;z+=vz*dt;
   // Soft bounds keep a tossed toy within reach on desktop and phones.
   if(Math.abs(x)>movementLimit()){vx-=Math.sign(x)*(Math.abs(x)-movementLimit())*32*dt}if(Math.abs(z)>.85){vz-=Math.sign(z)*(Math.abs(z)-.85)*16*dt}
   rv+=((-vx*.10-roll)*25-rv*5)*dt;roll+=rv*dt;pv+=((vz*.08-pitch)*22-pv*5)*dt;pitch+=pv*dt;
   yawVelocity+=((targetYaw-yaw)*12-yawVelocity*4)*dt;yaw+=yawVelocity*dt;
  }
  function tick(now:number){frame=0;if(!active||!visible)return;const elapsed=Math.min((now-last)/1000,.05);last=now;time+=elapsed;accumulator+=elapsed;while(accumulator>=1/120){physics(1/120);accumulator-=1/120}
   deform(compression);duck.position.set(x,heave+(reduced.matches?0:Math.sin(time*1.45)*.012),z);duck.rotation.set(pitch+(reduced.matches?0:Math.sin(time*.93)*.009),yaw,roll);
   if(Math.hypot(vx,vz)>.13&&time-lastRipple>.23)emitRipple(.013);
   if(!reduced.matches&&!held&&time-lastRipple>2.8)emitRipple(.018);
   water.update(time,x,z);renderer.render(scene,camera);
   if(!reduced.matches||held||Math.abs(hv)+Math.abs(cv)+Math.abs(vx)+Math.abs(vz)+Math.abs(yawVelocity)+Math.abs(rv)+Math.abs(pv)>.001)frame=requestAnimationFrame(tick);
  }
  function wake(){if(active&&visible&&!frame){last=performance.now();frame=requestAnimationFrame(tick)}}
  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;const distance=Math.max(6.0,2.8/(2*Math.tan(T.MathUtils.degToRad(16))*camera.aspect));camera.position.set(distance*.38,1.05+distance*.29,distance*.84);camera.lookAt(0,.95,0);camera.updateProjectionMatrix();wake()};
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(el);
  function setRay(e:PointerEvent){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(ndc,camera)}
  const onDown=(e:PointerEvent)=>{if(pointer!==null)return;setRay(e);const hits=ray.intersectObject(duck,true);if(!hits.length){if(ray.ray.intersectPlane(plane,intersection)){water.ripple(intersection.x,intersection.z,time,.04);const distance=intersection.distanceTo(duck.position);hv+=.12/(1+distance);rv+=.04/(1+distance);wake()}return}
   pointer=e.pointerId;startX=e.clientX;startY=e.clientY;dragging=false;canvas.setPointerCapture(pointer);canvas.style.cursor='grabbing';ray.ray.intersectPlane(plane,intersection);offset.copy(intersection).sub(new T.Vector3(x,0,z));press();
  };
  const onMove=(e:PointerEvent)=>{setRay(e);if(e.pointerId!==pointer){canvas.style.cursor=ray.intersectObject(duck,true).length?'grab':'default';return}
   if(Math.hypot(e.clientX-startX,e.clientY-startY)>7)dragging=true;
   if(dragging&&ray.ray.intersectPlane(plane,intersection)){targetX=T.MathUtils.clamp(intersection.x-offset.x,-movementLimit(),movementLimit());targetZ=T.MathUtils.clamp(intersection.z-offset.z,-1.1,1.1);targetYaw=initialYaw+(targetX-x)*.45;wake()}
  };
  const onUp=(e:PointerEvent)=>{if(e.pointerId!==pointer)return;pointer=null;release();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);canvas.style.cursor='grab'};
  const cancel=()=>{pointer=null;held=false;dragging=false;wake()};
  const keyDown=(e:KeyboardEvent)=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();press()}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();vx+=e.code==='ArrowLeft'?-.3:e.code==='ArrowRight'?.3:0;vz+=e.code==='ArrowUp'?-.3:e.code==='ArrowDown'?.3:0;targetYaw+=e.code==='ArrowLeft'?-.08:e.code==='ArrowRight'?.08:0;emitRipple(.02);wake()}};
  const keyUp=(e:KeyboardEvent)=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();release()}};
  const visibility=()=>{visible=!document.hidden;if(!visible){cancelAnimationFrame(frame);frame=0;held=false;dragging=false}else wake()};
  canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);canvas.addEventListener('lostpointercapture',cancel);canvas.addEventListener('blur',cancel);canvas.addEventListener('keydown',keyDown);canvas.addEventListener('keyup',keyUp);document.addEventListener('visibilitychange',visibility);resize();wake();
  return()=>{active=false;disposeDuck();water.dispose();cancelAnimationFrame(frame);resizeObserver.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('pointercancel',onUp);canvas.removeEventListener('lostpointercapture',cancel);canvas.removeEventListener('blur',cancel);canvas.removeEventListener('keydown',keyDown);canvas.removeEventListener('keyup',keyUp);const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());env.dispose();renderer.dispose();canvas.remove();void audio?.close()};
 },[color,sound,initialYaw]);
 return <div className={'rubber-duck '+className} ref={host}>{failed?<p className="fallback">This browser cannot display the 3D duck</p>:null}</div>;
}
