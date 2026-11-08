import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';

// Physical surface normals are derived from propagating, damped circular wave packets.
export function createWater(){
 const uniforms={tDiffuse:{value:null},color:{value:new T.Color()},textureMatrix:{value:new T.Matrix4()},time:{value:0},origin:{value:new T.Vector2()},events:{value:Array.from({length:8},()=>new T.Vector4(0,0,-100,0))},baseColor:{value:new T.Color('#a9d7d8')}};
 const shader={uniforms,vertexShader:`
 uniform mat4 textureMatrix;varying vec4 vUv;varying vec2 surface;void main(){vUv=textureMatrix*vec4(position,1.);vec4 w=modelMatrix*vec4(position,1.);surface=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}
 `,fragmentShader:`
 precision highp float;uniform sampler2D tDiffuse;varying vec4 vUv;varying vec2 surface;uniform float time;uniform vec2 origin;uniform vec4 events[8];uniform vec3 baseColor;
 float heightAt(vec2 p){
  float h=.004*sin(p.x*2.6+p.y*1.7+time*.65)+.003*sin(p.y*3.8-p.x*1.2-time*.43);
  for(int i=0;i<8;i++){
   vec4 e=events[i];float age=time-e.z;float d=length(p-e.xy);float r=d-age*1.65;
   float wave=sin(r*13.)*exp(-r*r*1.8)*exp(-age*.65)*e.w;
   if(age>0.&&age<7.)h+=wave;
  }
  return h;
 }
 void main(){
  float eps=.025;float h=heightAt(surface);
  vec3 n=normalize(vec3(-(heightAt(surface+vec2(eps,0.))-h)/eps,1.,-(heightAt(surface+vec2(0.,eps))-h)/eps));
  vec3 light=normalize(vec3(-.4,.9,.35));
  float diffuse=dot(n,light);float spec=pow(max(dot(n,normalize(vec3(-.12,1.,.14))),0.),180.);
  vec2 q=(surface-origin)/vec2(.90,1.0);float contact=exp(-dot(q,q)*1.7);
  vec3 color=baseColor*(.94+(diffuse-.87)*.35-contact*.25)+vec3(.78,.95,.92)*spec*.22;
  vec2 uv=vUv.xy/vUv.w+n.xz*.012;
  vec3 reflection=texture2D(tDiffuse,uv).rgb*.28;
  reflection+=(texture2D(tDiffuse,uv+vec2(.003,0.)).rgb+texture2D(tDiffuse,uv-vec2(.003,0.)).rgb+texture2D(tDiffuse,uv+vec2(0.,.003)).rgb+texture2D(tDiffuse,uv-vec2(0.,.003)).rgb)*.18;
  color=mix(color,reflection,.22);
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
 `};
 const mesh=new Reflector(new T.PlaneGeometry(2000,2000),{shader,textureWidth:768,textureHeight:768,multisample:0,clipBias:.003});
 const material=mesh.material as T.ShaderMaterial;material.toneMapped=false;const live=material.uniforms;mesh.rotation.x=-Math.PI/2;mesh.position.y=.28;
 let index=0;
 return {mesh,dispose(){mesh.getRenderTarget().dispose()},update(time:number,x:number,z:number){live.time.value=time;live.origin.value.set(x,z)},ripple(x:number,z:number,time:number,strength=.035){live.events.value[index%8].set(x,z,time,strength);index++}};
}
