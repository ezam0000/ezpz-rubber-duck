import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import duckUrl from './assets/duck.glb?url';

/** Modified SCEA Duck mesh. See licenses/SCEA.txt and THIRD_PARTY.md. */
export function createDuck(color:string,onError:()=>void,onReady:()=>void){
 const root=new T.Group();let mesh:T.Mesh|null=null,disposed=false,compression=0;
 const textures=new Set<T.Texture>();
 new GLTFLoader().load(duckUrl,gltf=>{
  if(disposed){gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();const m=o.material as T.MeshStandardMaterial;m.map?.dispose();m.dispose()}});return}
  gltf.scene.updateMatrixWorld(true);
  let source:T.Mesh|undefined;
  gltf.scene.traverse(o=>{if(o instanceof T.Mesh)source=o});
  if(!source){onError();return}
  const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);
  // Source faces +X; interaction convention faces +Z. Center the broad flotation body.
  geometry.rotateY(-Math.PI/2);geometry.computeBoundingBox();
  const box=geometry.boundingBox!,height=box.max.y-box.min.y,scale=1.93/height;
  geometry.translate(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);
  geometry.scale(scale,scale,scale);geometry.translate(0,.085,0);
  const original=source.material as T.MeshStandardMaterial;
  const map=original.map!;textures.add(map);map.anisotropy=4;
  const material=new T.MeshPhysicalMaterial({map,color:'white',roughness:.40,metalness:0,clearcoat:.04,clearcoatRoughness:.4});
  const bodyColor=new T.Color(color);
  material.onBeforeCompile=shader=>{
   shader.uniforms.bodyColor={value:bodyColor};
   shader.fragmentShader='uniform vec3 bodyColor;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float yellowMask=smoothstep(.22,.48,diffuseColor.g)*smoothstep(.55,.8,diffuseColor.r)*(1.-smoothstep(.08,.22,diffuseColor.b));
    float moldShade=.78+.22*clamp(diffuseColor.g/.72,0.,1.);
    diffuseColor.rgb=mix(diffuseColor.rgb,bodyColor*moldShade,yellowMask);
   `);
  };
  const deformed=geometry.clone(),p=deformed.attributes.position,normals=deformed.attributes.normal;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),belly=Math.exp(-(((y-.62)/.50)**2));
   p.setXYZ(i,x*(1+.15*belly),y-.28*T.MathUtils.smoothstep(y,.20,1.22),z*(1+.09*belly));
   const derivative=-2*(y-.62)/(.50*.50)*belly,t=T.MathUtils.clamp((y-.20)/1.02,0,1);
   const nx=normals.getX(i)/(1+.15*belly),nz=normals.getZ(i)/(1+.09*belly);
   const ny=(normals.getY(i)-x*.15*derivative*nx-z*.09*derivative*nz)/(1-.28*6*t*(1-t)/1.02);
   const length=Math.hypot(nx,ny,nz);normals.setXYZ(i,nx/length,ny/length,nz/length);
  }
  geometry.morphAttributes.position=[deformed.attributes.position.clone()];geometry.morphAttributes.normal=[deformed.attributes.normal.clone()];deformed.dispose();
  mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.morphTargetInfluences![0]=compression;root.add(mesh);onReady();
  source.geometry.dispose();original.dispose();
 },undefined,()=>{if(!disposed)onError()});
 return {root,deform(value:number){compression=value;if(mesh)mesh.morphTargetInfluences![0]=value},dispose(){disposed=true;textures.forEach(t=>t.dispose())}};
}
