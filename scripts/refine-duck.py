"""Smooth the licensed source with seam-aware Loop subdivision; retain its original UV paint."""
from pathlib import Path
import json, struct, numpy as np
root=Path(__file__).resolve().parents[1]
b=(root/'src/assets/duck-original.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);blob=b[28+n:]
def array(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];cols={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']];dtype={5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']];return np.frombuffer(blob,dtype=dtype,count=a['count']*cols,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],cols).copy()
prim=j['meshes'][0]['primitives'][0];pos=array(prim['attributes']['POSITION']);uv=array(prim['attributes']['TEXCOORD_0']);tri=array(prim['indices']).reshape(-1,3)
# Weld positions only. UVs remain independent per triangle corner across texture seams.
weld={};mapping=[];vertices=[]
for p in pos:
 key=tuple(np.round(p,3));idx=weld.get(key)
 if idx is None:idx=len(vertices);weld[key]=idx;vertices.append(p)
 mapping.append(idx)
faces=np.array(mapping)[tri];uvfaces=uv[tri];vertices=np.array(vertices,dtype=float)
for iteration in range(2):
 edges={};neighbors=[set() for _ in vertices]
 for f in faces:
  for a,c,op in [(f[0],f[1],f[2]),(f[1],f[2],f[0]),(f[2],f[0],f[1])]:
   key=tuple(sorted((a,c)));edges.setdefault(key,[]).append(op);neighbors[a].add(c);neighbors[c].add(a)
 boundary=[[] for _ in vertices]
 for (a,c),ops in edges.items():
  if len(ops)==1:boundary[a].append(c);boundary[c].append(a)
 new=[]
 for i,v in enumerate(vertices):
  if len(boundary[i])==2:new.append(.75*v+.125*vertices[boundary[i]].sum(axis=0))
  else:
   k=len(neighbors[i]);beta=3/(8*k) if k>3 else 3/16
   new.append((1-k*beta)*v+beta*vertices[list(neighbors[i])].sum(axis=0))
 mids={}
 for (a,c),ops in edges.items():
  mids[a,c]=len(new)
  new.append(.375*(vertices[a]+vertices[c])+.125*vertices[ops].sum(axis=0) if len(ops)==2 else (vertices[a]+vertices[c])*.5)
 out=[];outuv=[]
 for f,uvf in zip(faces,uvfaces):
  a,c,d=f;ab=mids[tuple(sorted((a,c)))];bc=mids[tuple(sorted((c,d)))];ca=mids[tuple(sorted((d,a)))];u,v,w=uvf;u1=(u+v)/2;u2=(v+w)/2;u3=(w+u)/2
  out.extend([(a,ab,ca),(ab,c,bc),(ca,bc,d),(ab,bc,ca)]);outuv.extend([(u,u1,u3),(u1,v,u2),(u3,u2,w),(u1,u2,u3)])
 vertices=np.array(new);faces=np.array(out);uvfaces=np.array(outuv)
normals=np.zeros_like(vertices)
for f in faces:
 n=np.cross(vertices[f[1]]-vertices[f[0]],vertices[f[2]]-vertices[f[0]])
 for v in f:normals[v]+=n
normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-12)
# Rebuild vertices by position and UV pair, reusing smooth welded normals.
lookup={};pout=[];nout=[];uout=[];indices=[]
for f,uvf in zip(faces,uvfaces):
 for vi,u in zip(f,uvf):
  key=(int(vi),*np.round(u,7));idx=lookup.get(key)
  if idx is None:idx=len(pout);lookup[key]=idx;pout.append(vertices[vi]);nout.append(normals[vi]);uout.append(u)
  indices.append(idx)
img=j['images'][0];iv=j['bufferViews'][img['bufferView']];image=blob[iv.get('byteOffset',0):iv.get('byteOffset',0)+iv['byteLength']]
chunks=[];views=[];accessors=[]
def add(data,target=None):
 offset=sum(len(c) for c in chunks);views.append({'buffer':0,'byteOffset':offset,'byteLength':len(data),**({'target':target} if target else {})});chunks.append(data+b'\0'*((-len(data))%4));return len(views)-1
def acc(data,typ,component,target):
 view=add(data.tobytes(),target);accessors.append({'bufferView':view,'componentType':component,'count':len(data),'type':typ,'min':np.min(data,axis=0).reshape(-1).tolist(),'max':np.max(data,axis=0).reshape(-1).tolist()});return len(accessors)-1
pi=acc(np.array(pout,dtype='<f4'),'VEC3',5126,34962);ni=acc(np.array(nout,dtype='<f4'),'VEC3',5126,34962);ui=acc(np.array(uout,dtype='<f4'),'VEC2',5126,34962);ii=acc(np.array(indices,dtype='<u4'),'SCALAR',5125,34963)
img['bufferView']=add(image);prim['attributes']={'POSITION':pi,'NORMAL':ni,'TEXCOORD_0':ui};prim['indices']=ii
j['accessors']=accessors;j['bufferViews']=views;binary=b''.join(chunks);j['buffers']=[{'byteLength':len(binary)}];j['asset']['generator']='EZPZ seam-aware Loop refinement of SCEA Duck';jsondata=json.dumps(j,separators=(',',':')).encode();jsondata+=b' '*((-len(jsondata))%4)
out=struct.pack('<III',0x46546c67,2,12+8+len(jsondata)+8+len(binary))+struct.pack('<II',len(jsondata),0x4e4f534a)+jsondata+struct.pack('<II',len(binary),0x004e4942)+binary
(root/'src/assets/duck.glb').write_bytes(out);print(len(pout),'vertices',len(faces),'triangles',len(out),'bytes')
