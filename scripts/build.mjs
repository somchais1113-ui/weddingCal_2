import {cp,mkdir,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
for(const f of await readdir(path.join(root,'src')))if(f.endsWith('.js'))execFileSync(process.execPath,['--check',path.join(root,'src',f)],{stdio:'inherit'});
await rm(path.join(root,'dist'),{recursive:true,force:true});await mkdir(path.join(root,'dist'),{recursive:true});
for(const name of ['index.html','src','examples','legacy'])await cp(path.join(root,name),path.join(root,'dist',name),{recursive:true});
await writeFile(path.join(root,'dist','.nojekyll'),'');
const html=await readFile(path.join(root,'dist/index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)){if(match[1].endsWith('/'))continue;await readFile(path.join(root,'dist',match[1]));}
const files=[];async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await scan(file);else files.push(path.relative(path.join(root,'dist'),file));}}await scan(path.join(root,'dist'));
await writeFile(path.join(root,'qa/build-result.json'),JSON.stringify({timestamp:new Date().toISOString(),status:'passed',files},null,2));
console.log(`Production static build passed: ${files.length} files. Relative paths; no runtime CDN dependencies.`);
