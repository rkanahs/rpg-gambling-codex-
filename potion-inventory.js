(()=>{'use strict';
const KEY='our-rpg-player-profiles-v2',LEGACY='our-rpg-inventory-v1';
const rows=[
['plain-small-heal','작은 회복 물약','heal',20,'HP 20 회복'],['plain-antidote','초급 해독제','poison',1,'중독 1개 제거'],['plain-guard','견습 방어 물약','buff',{def:10},'전투 종료까지 방어력 +10%'],['plain-agility','민첩 물약','buff',{spd:10},'전투 종료까지 이속 +10%'],
['continent-medium-heal','중형 회복 물약','healPercent',25,'최대 HP 25% 회복'],['continent-cleanse','종합 해독제','cleanse',1,'해제 가능한 일반 상태이상 1개 제거'],['continent-power','전투 강화 물약','buff',{atk:15,mag:15},'전투 종료까지 공격력·마력 +15%'],['continent-guard','수호 물약','buff',{def:20},'전투 종료까지 방어력 +20%'],['continent-speed','신속 물약','buff',{spd:20},'전투 종료까지 이속 +20%'],
['border-large-heal','대형 회복 물약','healPercent',45,'최대 HP 45% 회복'],['border-cleanse','고급 정화 물약','cleanse',Infinity,'해제 가능한 일반 상태이상 전부 제거'],['border-hero','영웅의 물약','buff',{atk:25,mag:25},'전투 종료까지 공격력·마력 +25%'],['border-fortress','철벽 물약','buff',{def:30},'전투 종료까지 방어력 +30%'],['border-ultraspeed','초신속 물약','buff',{spd:30},'전투 종료까지 이속 +30%'],['border-full-heal','완전 회복 물약','fullHeal',100,'HP를 최대치까지 회복 · 부활 불가 · 전투당 1회'],
['p1','초급 회복 물약','healPercent',20,'최대 HP 20% 회복'],['p2','중급 회복 물약','healPercent',40,'최대 HP 40% 회복'],['p3','상급 회복 물약','healPercent',70,'최대 HP 70% 회복'],['clean','상태 회복 물약','cleanse',1,'해제 가능한 일반 상태이상 1개 제거'],['codex-heal','회복 물약','heal',100,'HP 100 회복'],['codex-large-heal','큰 회복 물약','heal',500,'HP 500 회복'],['codex-antidote','해독 물약','poison',1,'중독 1개 제거'],['codex-cleanse','정화 물약','cleanse',1,'해제 가능한 일반 상태이상 1개 제거']];
rows.push(
['return','초급 귀환서','return',4,'4턴 준비 후 근처 마을 귀환 · 스턴 시 취소 · 1회용'],
['continent-return','중급 귀환서','return',3,'3턴 준비 후 근처 마을 귀환 · 스턴 시 취소 · 1회용'],
['border-return','상급 귀환서','return',2,'2턴 준비 후 근처 마을 귀환 · 스턴 시 취소 · 1회용'],
['void-teleport','공허 순간이동서','return',1,'공허족 특성과 같은 1턴 귀환 · 스턴 시 취소 · 1회용'], ['crafted-cleanse','완전 해제 영약','cleanse',2,'해제 가능한 일반 상태이상 2개 제거']);
const catalog=Object.fromEntries(rows.map(([id,name,kind,value,effect])=>[id,{id,name,kind,value,effect}]));
function read(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}}
function amount(n){return Number.isSafeInteger(Number(n))&&Number(n)>0?Number(n):0}
function labelItems(label){let text=String(label||'').replace(/(?<!초급 |중급 |상급 )귀환서/g,'초급 귀환서'),items=[];for(const item of Object.values(catalog).sort((a,b)=>b.name.length-a.name.length)){if(text.includes(item.name)){const tail=text.slice(text.indexOf(item.name)+item.name.length),quantity=amount(tail.match(/^\s*[×x]\s*(\d+)/)?.[1]||1);items.push({id:item.id,quantity});text=text.split(item.name).join('')}}return items}
function restoreBossPotionNames(chest){const reward=chest.reward;if(!chest.opened||reward?.type!=='consumable'||reward.items?.length)return;const pool=['continent-medium-heal','continent-cleanse','continent-power','continent-guard','continent-speed'];let seed=2166136261;for(const c of String(chest.id)){seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0}const items=[];for(let i=0;i<Math.min(Number(reward.quantity)||2,pool.length);i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;items.push({id:pool.splice(seed%pool.length,1)[0],quantity:1})}reward.originalLabel=reward.label;reward.items=items;reward.label=items.map(x=>catalog[x.id].name+' ×'+x.quantity).join(' / ')}
function bagFor(profile){const d=profile.data;if(!d.potionBag||d.potionBag.version!==1){const legacy=read(LEGACY,{})[profile.id||d.characterName]||{};d.potionBag={version:1,items:{...(legacy.items||{})},logs:Array.isArray(legacy.logs)?legacy.logs.slice():[],chestImports:{}}}const bag=d.potionBag;bag.items=bag.items||{};bag.logs=Array.isArray(bag.logs)?bag.logs:[];bag.chestImports=bag.chestImports||{};bag.chestAwards=bag.chestAwards||{};
 const names={normal:'일반 보물상자',rare:'희귀 보물상자',legend:'전설 보물상자'},events=[];for(const r of Array.isArray(d.ordinaryChestReceipts)?d.ordinaryChestReceipts:[])if(r.id&&r.reward?.kind==='consumable')events.push({id:r.id,label:r.reward.label,line:'['+(names[r.type]||'일반 보물상자')+'] '+r.reward.label+' · '+r.id});for(const chest of Array.isArray(d.bossChests)?d.bossChests:[]){restoreBossPotionNames(chest);if(chest.reward?.originalLabel)d.consumables=String(d.consumables||'').replace('[보스 상자] '+chest.reward.originalLabel+' · '+chest.id,'[보스 상자] '+chest.reward.label+' · '+chest.id);if(chest.id&&chest.opened&&chest.reward?.type==='consumable')events.push({id:chest.id,label:chest.reward.label,items:chest.reward.items,line:'[보스 상자] '+chest.reward.label+' · '+chest.id})}
 const lines={};for(const line of String(d.consumables||'').split('\n'))if(/^\[(?:일반 보물상자|희귀 보물상자|전설 보물상자|보스 상자)\]/.test(line)&&!events.some(x=>line.includes(x.id)))lines[line]=(lines[line]||0)+1;
 for(const e of events){if(bag.chestAwards[e.id])continue;const items=e.items||labelItems(e.label);if(!items.length)continue;const imported=Object.entries(bag.chestImports).some(([line,n])=>amount(n)>0&&line.includes(e.id)&&labelItems(line).length>0);if(!imported){for(const x of items)if(catalog[x.id])bag.items[x.id]=amount(bag.items[x.id])+amount(x.quantity);bag.logs.unshift({type:'상자 획득',item:e.label,sourceId:e.id,at:new Date().toISOString()})}bag.chestAwards[e.id]=true;bag.chestImports[e.line]=Math.max(1,amount(bag.chestImports[e.line]))}
 for(const [line,count]of Object.entries(lines)){const fresh=count-amount(bag.chestImports[line]);if(fresh>0){for(const x of labelItems(line))bag.items[x.id]=amount(bag.items[x.id])+x.quantity*fresh;bag.chestImports[line]=count}}
 bag.logs=bag.logs.slice(0,100);return bag}
let repairing=false;
function repairChests(){if(repairing)return false;repairing=true;try{const store=read(KEY,null);if(!Array.isArray(store?.profiles))return false;let changed=false;for(const p of store.profiles){const d=p.data;if(!d||!(d.ordinaryChestReceipts?.some(x=>x.reward?.kind==='consumable')||d.bossChests?.some(x=>x.opened&&x.reward?.type==='consumable')||/^\[(?:일반 보물상자|희귀 보물상자|전설 보물상자|보스 상자)\]/m.test(d.consumables||'')))continue;const before=JSON.stringify(d);bagFor(p);if(JSON.stringify(d)!==before){p.updatedAt=new Date().toISOString();changed=true}}if(changed)save(store);return changed}catch(_){return false}finally{repairing=false}}

// Explicit inventory lines are live quantities. Chest receipt lines are imported by bagFor.
function recordedItems(data) {
  return String(data.consumables || '').split('\n').flatMap((line, index) => {
    const match = line.trim().match(/^(?:\[제작\]\s*)?(.+?)\s*(?:[×x]\s*(\d+)|(\d+)\s*개)?$/);
    if (!match) return [];
    const item = Object.values(catalog).find(item => item.name === (match[1].trim() === '귀환서' ? '초급 귀환서' : match[1].trim()));
    const quantity = amount(match[2] || match[3] || 1);
    return item && quantity ? [{...item, id: 'record:' + encodeURIComponent(line), catalogId: item.id, quantity, line, index}] : [];
  });
}
function ownedItems(profile) {
  const bag = bagFor(profile);
  const stored = Object.entries(bag.items).filter(([, n]) => amount(n)).map(([id, n]) => ({
    ...(catalog[id] || {id, name: id, kind: 'unsupported', effect: '사용 효과가 아직 등록되지 않은 소모품이야.'}), quantity: amount(n)
  }));
  return [...stored, ...recordedItems(profile.data)];
}
const safeTowns = [
  ['해오름뜰', '평원 · 해오름뜰', 0], ['큰길마루', '대륙 · 큰길마루', 5000], ['끝빛보루', '경계 · 끝빛보루', 15000],
  ['이슬고개', '평원 · 해오름뜰', 700], ['바람씨앗 마을', '평원 · 해오름뜰', 3100],
  ['은뿌리 마을', '대륙 · 큰길마루', 6300], ['달그늘 나루', '대륙 · 큰길마루', 11100],
  ['잿빛초소', '경계 · 끝빛보루', 16000], ['별잠 마을', '경계 · 끝빛보루', 21000]
];
function nearestTown(data) {
  const distance = Number(data.distance || 0);
  if (!Number.isSafeInteger(distance) || distance < 0) throw Error('현황표 이동거리를 확인해 줘.');
  const region = distance >= 15000 ? safeTowns[2] : distance >= 5000 ? safeTowns[1] : safeTowns[0];
  const discovered = Array.isArray(data.subVillageExploration?.discovered) ? data.subVillageExploration.discovered : [];
  const saved = data.lastSafeTown;
  const options = safeTowns.filter(town => town[1] === region[1] &&
    (town === region || discovered.some(x => x.name === town[0]))).map(town => {
      const history = discovered.find(x => x.name === town[0]);
      const stored = Number(saved?.name === town[0] ? saved.distance : history?.distance);
      const nextRegion = region === safeTowns[0] ? 5000 : region === safeTowns[1] ? 15000 : Infinity;
      const coordinate = safeTowns.indexOf(town) >= 3 && Number.isSafeInteger(stored) && stored >= town[2] && stored < nextRegion ? stored : town[2];
      return {name:town[0], region:town[1], distance:coordinate, subVillage:safeTowns.indexOf(town)>=3};
    });
  return options.sort((a,b) => Math.abs(a.distance-distance)-Math.abs(b.distance-distance) || a.distance-b.distance)[0];
}
function returnToTown(data) {
  const before = Number(data.distance || 0), target = nearestTown(data);
  data.distance = String(target.distance);
  data.region = target.region;
  data.expNeeded = String(target.distance >= 15000 ? 15000 : target.distance >= 5000 ? 1000 : 500);
  data.lastMovement = new Date().toISOString() + ' · 귀환 · ' + target.name;
  data.lastSafeTown = {name:target.name, region:target.region, distance:target.distance};
  if (data.subVillageExploration) data.subVillageExploration.currentVisit = target.subVillage ? {name:target.name, at:new Date().toISOString()} : null;
  return {message:target.name+' 귀환 · 누적 거리 '+before+' → '+target.distance, town:target.name};
}
function context(owner){const store=read(KEY,null),p=store?.profiles?.find(x=>x.id===store.activeId)||store?.profiles?.[0];if(!p||owner&&p.id!==owner)throw Error('소모품을 사용할 캐릭터를 현황표에서 선택해 줘.');return{store,profile:p,bag:bagFor(p)}}
function save(store){localStorage.setItem(KEY,JSON.stringify(store));try{globalThis.dispatchEvent?.(new CustomEvent('our-rpg:profiles-updated'));globalThis.dispatchEvent?.(new StorageEvent('storage',{key:KEY,newValue:JSON.stringify(store)}))}catch(_){}}
function consume(owner, id, apply) {
  const c = context(owner);
  const item = ownedItems(c.profile).find(item => item.id === id);
  if (!item) throw Error('보유한 소모품이 없어. 목록을 새로고침해 줘.');
  if (item.kind === 'unsupported') throw Error(item.effect);
  const result = apply(c.profile.data, item);
  if (item.line != null) {
    const lines = String(c.profile.data.consumables || '').split('\n');
    if (item.quantity > 1) lines[item.index] = item.name + ' ×' + (item.quantity - 1);
    else lines.splice(item.index, 1);
    c.profile.data.consumables = lines.join('\n');
  } else c.bag.items[id] = item.quantity - 1;
  c.bag.logs.unshift({type:'사용', item:item.name, quantity:1, at:new Date().toISOString()});
  c.bag.logs = c.bag.logs.slice(0,100);
  c.profile.updatedAt = new Date().toISOString();
  save(c.store);
  return {item, result};
}
function useOutsideBattle(owner,id){const item=ownedItems(context(owner).profile).find(x=>x.id===id);if(item?.kind==='return')return consume(owner,id,data=>{if(Number(data.hpCurrent??data.hpMax)<=0)throw Error('전투 불능 상태에서는 귀환서를 사용할 수 없어.');const before=Number(data.distance||0),result=returnToTown(data);if(before===Number(data.distance))throw Error('이미 가장 가까운 마을에 있어. 소모하지 않았어.');return result});if(!item)throw Error('이 소모품은 전용 사용 화면에서 사용해 줘. 소모하지 않았어.');if(!['heal','healPercent','fullHeal'].includes(item.kind))throw Error('해독·전투 강화 물약은 몬스터 전투장에서 사용해 줘. 소모하지 않았어.');return consume(owner,id,(data,potion)=>{const max=Number(data.hpMax),raw=data.hpCurrent,hp=raw==null||raw===''?max:Number(raw);if(!Number.isSafeInteger(max)||max<=0||!Number.isSafeInteger(hp)||hp<0||hp>max)throw Error('현황표의 현재 HP와 최대 HP를 확인해 줘.');if(hp===0)throw Error('HP가 0인 캐릭터는 회복 물약으로 부활할 수 없어.');if(hp===max)throw Error('HP가 이미 가득 차 있어. 물약은 소모하지 않았어.');const heal=potion.kind==='fullHeal'?max:potion.kind==='healPercent'?Math.max(1,Math.floor(max*(potion.value/100))):potion.value,next=hp+Math.min(max-hp,heal);if(!Number.isSafeInteger(next)||next<=hp)throw Error('회복량을 확인해 줘. 물약은 소모하지 않았어.');data.hpCurrent=String(next);return{before:hp,after:next,max,healed:next-hp}})}
globalThis.RpgPotionInventory=Object.freeze({catalog,context,bagFor,ownedItems,nearestTown,returnToTown,save,consume,useOutsideBattle,repairChests});
globalThis.addEventListener?.('our-rpg:profiles-updated',repairChests);globalThis.addEventListener?.('storage',e=>{if(e.key===KEY)repairChests()});repairChests();
})();
