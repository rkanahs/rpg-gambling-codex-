(function(root){'use strict';
const KEY='our-rpg-player-profiles-v2',BACKUPS='RPG_CLOUD_LOCAL_BACKUPS_V1',ID='b9d23c2d-4ab6-4112-b7c1-d31733e3c8d0',FIX='jin-sync-backup-recovery-20261027-01',CUTOFF='2026-10-27T09:23:11.415133Z',SAFE='RPG_JIN_RECOVERY_SAFETY_BACKUP_V1';
const parse=(raw,fallback)=>{try{return JSON.parse(raw)||fallback}catch{return fallback}},jin=store=>store?.profiles?.find(x=>x.id===ID);
function recover(storage,now=Date.now()){
 const current=parse(storage.getItem(KEY),null),existing=jin(current);if(existing?.data?.syncRecoveryReceipts?.some(x=>x.id===FIX))return{state:'done',sourceAt:existing.data.syncRecoveryReceipts.find(x=>x.id===FIX).sourceAt};
 const backups=parse(storage.getItem(BACKUPS),[]);if(!Array.isArray(backups))return{state:'missing'};
 const candidates=backups.filter(b=>b?.label==='서버 기록을 이어받기 전 기기 기록'&&Date.parse(b.at)>=Date.parse('2026-10-27T00:00:00Z')&&Date.parse(b.at)<=Math.min(now,Date.parse(CUTOFF))).map(b=>({backup:b,store:parse(b.snapshot?.entries?.[KEY],null)})).filter(x=>jin(x.store)).sort((a,b)=>Date.parse(b.backup.at)-Date.parse(a.backup.at));
 const chosen=candidates[0];if(!chosen)return{state:'missing'};const source=jin(chosen.store);if(!source?.data||Array.isArray(source.data))return{state:'invalid'};
 const store=current||{version:2,profiles:[]};if(!Array.isArray(store.profiles))return{state:'invalid'};const i=store.profiles.findIndex(x=>x.id===ID);if(i<0&&store.profiles.length>=3)return{state:'full'};
 const before=JSON.stringify(store),restored=JSON.parse(JSON.stringify(source));restored.updatedAt=new Date(now).toISOString();restored.data.syncRecoveryReceipts=[...(restored.data.syncRecoveryReceipts||[]),{id:FIX,sourceAt:chosen.backup.at,at:restored.updatedAt}];
 if(i<0)store.profiles.push(restored);else store.profiles[i]=restored;if(!store.activeId)store.activeId=ID;
 // Keep an independent safety copy; never consume or replace the original sync backups.
 storage.setItem(SAFE,JSON.stringify({id:FIX,at:restored.updatedAt,sourceAt:chosen.backup.at,before,source:chosen.backup}));
 const writes={[KEY]:JSON.stringify(store)},entries=chosen.backup.snapshot.entries;
 const moveKey='our-rpg-last-movement-result-v1',oldMove=parse(storage.getItem(moveKey),null),sourceMove=parse(entries[moveKey],null);if(sourceMove?.characterId===ID&&(!oldMove||oldMove.characterId===ID))writes[moveKey]=JSON.stringify(sourceMove);
 const petKey='our-rpg-growth-open:pet-roulette-results',oldPets=parse(storage.getItem(petKey),[]),sourcePets=parse(entries[petKey],[]);if(Array.isArray(oldPets)&&Array.isArray(sourcePets)){const own=sourcePets.filter(x=>x.characterId===ID);if(own.length)writes[petKey]=JSON.stringify([...own,...oldPets.filter(x=>x.characterId!==ID)])}
 const appliedKey='our-rpg-movement-profile-applied-v1',oldApplied=parse(storage.getItem(appliedKey),[]),sourceApplied=parse(entries[appliedKey],[]);if(Array.isArray(oldApplied)&&Array.isArray(sourceApplied))writes[appliedKey]=JSON.stringify([...new Set([...sourceApplied,...oldApplied])]);
 const original=Object.fromEntries(Object.keys(writes).map(k=>[k,storage.getItem(k)]));try{for(const[k,v]of Object.entries(writes))storage.setItem(k,v)}catch(error){for(const[k,v]of Object.entries(original)){try{if(v===null)storage.removeItem(k);else storage.setItem(k,v)}catch{}}throw error}return{state:'restored',sourceAt:chosen.backup.at,name:restored.data.characterName||'Jin',level:restored.data.level,pets:restored.data.petsOwned?.length||0};
}
root.RpgJinSyncRecovery=Object.freeze({recover,ID,FIX});
if(root.document&&root.localStorage){let result;try{result=recover(root.localStorage)}catch{result={state:'failed'}}root.RpgJinSyncRecoveryResult=result;
 const show=()=>{if(!['restored','done'].includes(result.state)&&!jin(parse(root.localStorage.getItem(KEY),null)))return;const box=document.createElement('p');box.id='jinSyncRecoveryNotice';box.style.cssText='padding:14px;border:1px solid #78c89c;background:#10291e;color:#dcf4e5;line-height:1.6';box.textContent=['restored','done'].includes(result.state)?'✓ Jin 동기화 전 백업 복구 완료 · '+new Date(result.sourceAt).toLocaleString('ko-KR')+' 기록. 연동 중인 기기는 복구한 진행 상황을 서버에 저장해. 다른 기기에서 예전 기록으로 서버를 덮어쓰지 말고 최신 서버 기록을 이어받아 줘.':result.state==='full'?'Jin 복구 공간이 부족해. 다른 캐릭터는 삭제하지 않았어.':result.state==='failed'?'Jin 백업 복구 저장에 실패했어. 기존 백업은 보관 중이야.':'이 기기에는 초기화 직전 Jin 백업이 없어. 잘못 동기화했던 기기에서 최신본을 다시 불러와 줘.';(document.querySelector('main')||document.body).prepend(box)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();}
})(globalThis);
