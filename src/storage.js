const DB='wedding-fabric-studio-v6';
async function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('projects');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function loadDraft(){const db=await open();try{return await new Promise((res,rej)=>{const r=db.transaction('projects').objectStore('projects').get('draft');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}finally{db.close();}}
export async function saveDraft(project){const db=await open();try{await new Promise((res,rej)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(project,'draft');tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}finally{db.close();}}
