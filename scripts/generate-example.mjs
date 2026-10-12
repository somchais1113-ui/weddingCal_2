import {writeFile,readFile} from 'node:fs/promises';import path from 'node:path';import {newProject,newLayer} from '../src/model.js';
const dir=path.resolve(import.meta.dirname,'../examples'),p=newProject(),truth=JSON.parse(await readFile(path.join(dir,'calibration-ground-truth.json')));
p.name='ตัวอย่างถอดแบบ · ภาพสังเคราะห์ 500 × 270 ซม.';
p.reference={image:'data:image/png;base64,'+(await readFile(path.join(dir,'reference-oblique.png'))).toString('base64'),quad:truth.quad,calibrated:true,width:500,height:270};
p.layers=[newLayer({id:'example-base',name:'ผ้าขาวพื้นหลัง',color:'#f3f5f8',widthCm:500,heightCm:270,z:0,band:'back'}),newLayer({id:'example-trace',name:'ผ้าฟ้า · Trace จากภาพ',shape:'trace',widthCm:500,heightCm:270,z:25,color:'#aac9e6',band:'front',fullness:1.7,source:{kind:'manual-trace',synthetic:true,confirmedDepth:false},anchors:{top:[{x:.05,y:.08,role:'hang',out:{x:.35,y:.30}},{x:.95,y:.08,role:'hang',in:{x:.65,y:.30}}],bottom:[{x:.05,y:.55,role:'release',out:{x:.35,y:.80}},{x:.95,y:.55,role:'release',in:{x:.65,y:.80}}]}})];
await writeFile(path.join(dir,'traced-project.json'),JSON.stringify(p,null,2));
await writeFile(path.join(dir,'default-project.json'),JSON.stringify(newProject(),null,2));
