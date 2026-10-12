const finite=(n,min=0)=>Number.isFinite(Number(n))&&Number(n)>=min;
export function sectionArea(s){
 const w=Number(s.w),h=Number(s.h),t=Number(s.t);
 if(!finite(w,.01))throw new Error('ขนาดหน้าตัดต้องมากกว่า 0');
 if(s.type==='ROUND')return Math.PI*w*w/4;
 if(s.type==='SHS'&&w!==h)throw new Error('SHS ต้องมีความกว้างและสูงเท่ากัน');
 if(!finite(h,.01))throw new Error('ความสูงหน้าตัดต้องมากกว่า 0');
 if(s.type==='SOLID')return w*h;
 if(!['SHS','RHS'].includes(s.type)||!finite(t,.01)||2*t>=Math.min(w,h))throw new Error('ความหนาหน้าตัดไม่ถูกต้อง');
 return w*h-(w-2*t)*(h-2*t);
}
export function steelKey(s){return [s.type,s.grade||'unspecified',Number(s.w),s.type==='ROUND'?0:Number(s.h),['ROUND','SOLID'].includes(s.type)?0:Number(s.t)].join('|');}
/** Best-fit decreasing; deterministic feasible plan, NOT guaranteed global optimum. One kerf per requested piece, except an exact uncut full stock. */
export function optimizeSteel(items,kerf=3,stock=6000){
 if(!finite(kerf)||kerf>100||!finite(stock,1))throw new Error('Kerf ต้องอยู่ระหว่าง 0–100 มม.');
 const groups=new Map(),errors=[];
 for(const item of items){
  sectionArea(item);if(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>2000||!finite(item.length,1)||!finite(item.price))throw new Error('รายการเหล็ก: ความยาว จำนวน หรือราคาไม่ถูกต้อง');
  const key=steelKey(item);if(!groups.has(key))groups.set(key,{key,spec:{...item},price:Number(item.price),pieces:[],bars:[],warnings:[]});
  const g=groups.get(key);if(g.price!==Number(item.price)){g.warnings.push('หน้าตัดเดียวกันมีหลายราคา: ใช้ราคาสูงสุด');g.price=Math.max(g.price,Number(item.price));}
  for(let n=0;n<item.quantity;n++){
   if(item.length>stock){errors.push(`${item.name}: ${item.length} มม. เกิน ${stock} มม. — ไม่สมมติการต่อเหล็ก`);continue;}
   if(item.length<stock&&item.length+kerf>stock){errors.push(`${item.name}: ความยาวรวม Kerf เกินเส้นมาตรฐาน`);continue;}
   g.pieces.push({id:item.id,name:item.name,length:Number(item.length),kerf:item.length===stock?0:Number(kerf)});
  }
 }
 for(const g of groups.values()){
  for(const piece of g.pieces.sort((a,b)=>b.length-a.length)){
   const needed=piece.length+piece.kerf;let best=null;
   for(const bar of g.bars)if(bar.remaining>=needed&&(!best||bar.remaining<best.remaining))best=bar;
   if(!best){best={cuts:[],remaining:stock};g.bars.push(best);}
   best.cuts.push(piece);best.remaining-=needed;
  }
  g.stockCount=g.bars.length;g.cost=g.stockCount*g.price;g.offcut=g.bars.reduce((s,b)=>s+b.remaining,0);g.kerfLoss=g.pieces.reduce((s,p)=>s+p.kerf,0);
  g.wastePercent=g.stockCount?(g.offcut+g.kerfLoss)/(g.stockCount*stock)*100:0;
  g.lowerBound=Math.ceil(g.pieces.reduce((s,p)=>s+p.length+p.kerf,0)/stock);
  g.optimalProven=g.lowerBound===g.stockCount;
  g.usedWeight=g.pieces.reduce((s,p)=>s+p.length/1000,0)*sectionArea(g.spec)*.00785;
 }
 const list=[...groups.values()];return {groups:list,errors,complete:errors.length===0,stock,kerf,totalBars:list.reduce((s,g)=>s+g.stockCount,0),cost:list.reduce((s,g)=>s+g.cost,0),weight:list.reduce((s,g)=>s+g.usedWeight,0)};
}
