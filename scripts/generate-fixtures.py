"""Deterministic synthetic reference with known geometry, not a wedding photograph."""
from PIL import Image, ImageDraw
import numpy as np, json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'examples'
w,h=1400,756
im=Image.new('RGB',(w,h),'#edf2f8');d=ImageDraw.Draw(im)
# White background curtain and intentionally identifiable drape edges.
for x in range(w):
    t=x/w;tone=int(240+9*np.cos(t*2*np.pi*35));d.line((x,0,x,h),fill=(tone,min(255,tone+2),min(255,tone+6)))
pts=[]
for k in range(501):
 t=k/500;pts.append((w*(.05+.90*(3*t*t-2*t*t*t)),h*(.08+.66*t*(1-t))))
# Use x handles .35/.65: evaluate the true cubic explicitly.
def bx(t):return (1-t)**3*.05+3*(1-t)**2*t*.35+3*(1-t)*t*t*.65+t**3*.95
pts=[(w*bx(t),h*(.08+.66*t*(1-t))) for t in np.linspace(0,1,501)]
pts += [(w*bx(t),h*(.55+.75*t*(1-t))) for t in np.linspace(1,0,501)]
d.polygon(pts,fill='#aac9e6')
# Fine pleats follow the same two exact boundaries.
for t in np.linspace(.01,.99,110):
 x=w*bx(t);ya=h*(.08+.66*t*(1-t));yb=h*(.55+.75*t*(1-t));d.line((x,ya,x,yb),fill='#9fbfdf',width=2)
d.line(pts+[pts[0]],fill='#6891b8',width=3)
im.save(root/'reference-front.png')
quad=[{'x':.13,'y':.09},{'x':.86,'y':.16},{'x':.94,'y':.91},{'x':.05,'y':.82}]
src=np.array([[0,0],[1,0],[1,1],[0,1]],float);dst=np.array([[p['x'],p['y']] for p in quad]);A=[];B=[]
for (x,y),(u,v) in zip(dst,src):A.extend([[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]);B.extend([u,v])
inv=np.r_[np.linalg.solve(A,B),1].reshape(3,3)
# Destination bitmap normalized coordinates -> source pixel coordinates.
ow,oh=1600,1000
m=np.diag([w-1,h-1,1])@inv@np.diag([1/(ow-1),1/(oh-1),1]);m=m/m[2,2]
oblique=im.transform((ow,oh),Image.Transform.PERSPECTIVE,tuple(m.flatten()[:8]),Image.Resampling.BICUBIC,fillcolor='#dce4ee')
od=ImageDraw.Draw(oblique)
for i,p in enumerate(quad):
 x=p['x']*(ow-1);y=p['y']*(oh-1);od.ellipse((x-7,y-7,x+7,y+7),fill='#ecab47',outline='#163d62',width=2)
oblique.save(root/'reference-oblique.png')
(root/'calibration-ground-truth.json').write_text(json.dumps({'description':'Synthetic planar reference, exact known corners; not a real photo accuracy claim','widthCm':500,'heightCm':270,'quad':quad,'sourceWidth':w,'sourceHeight':h,'imageWidth':ow,'imageHeight':oh},indent=2))
