import {DeviceSlotVault} from './device-slot-vault.mjs?v=20261108-backup-space';
import {collectSnapshot,validateSnapshot,isProgressKey,PROFILE_KEY} from './cloud-sync-protocol.mjs';
export const SAVES_KEY='RPG_DEVICE_MANUAL_SAVES_V1',SAFETY_KEY='RPG_DEVICE_RESTORE_SAFETY_V1',SESSION_KEY='RPG_CLOUD_DEVICE_SESSION_V1';
export const SLOT_COUNT=20;
export class DeviceSaves{
 constructor(storage,vault=new DeviceSlotVault()){this.storage=storage;this.vault=vault}
 async ready(){
  if(!this.migration)this.migration=this.migrate().catch(error=>{this.migration=null;throw error});
  await this.migration;
 }
 async migrate(){
  const old=this.storage.getItem(SAVES_KEY),safety=this.storage.getItem(SAFETY_KEY);
  const automaticKey='RPG_CLOUD_LOCAL_BACKUPS_V1';
  const automaticRaw=this.storage.getItem(automaticKey);
  let automatic;
  try{const parsed=JSON.parse(automaticRaw);if(Array.isArray(parsed))automatic=parsed}catch{}
  const entries=[];
  if(old!==null){
   let list;
   try{list=JSON.parse(old)}catch{throw Error('기존 기기 저장 목록을 읽지 못했어.')}
   if(!Array.isArray(list)||list.length>3)throw Error('기존 저장 슬롯을 확인해 줘.');
   list.forEach((record,i)=>{if(record)entries.push(['manual-slot:'+i,record])});
  }
  if(safety!==null)entries.push(['manual-safety',this.parse(safety)]);
  if(entries.length||automatic?.length)await this.vault.migrate(entries,automatic);
  if(automatic&&this.storage.getItem(automaticKey)===automaticRaw)this.storage.removeItem(automaticKey);
  if(old!==null&&this.storage.getItem(SAVES_KEY)===old)this.storage.removeItem(SAVES_KEY);
  if(safety!==null&&this.storage.getItem(SAFETY_KEY)===safety)this.storage.removeItem(SAFETY_KEY);
 }
 async slots(){await this.ready();return this.vault.read(Array.from({length:SLOT_COUNT},(_,i)=>'manual-slot:'+i))}
 current(){return collectSnapshot(this.storage)}
 async save(index){
  if(!Number.isInteger(index)||index<0||index>=SLOT_COUNT)throw Error('저장 슬롯을 확인해 줘.');
  await this.ready();
  const record={format:'our-rpg-device-save',version:1,savedAt:new Date().toISOString(),snapshot:this.current()};
  await this.vault.put('manual-slot:'+index,record);
  return record;
 }
 parse(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>2000000)throw Error('저장 파일은 2MB 이하만 불러올 수 있어.');let record;try{record=JSON.parse(text)}catch{throw Error('JSON 저장 파일을 읽지 못했어.')}return {format:'our-rpg-device-save',version:1,savedAt:record.savedAt||record.at||null,snapshot:validateSnapshot(record.snapshot||record)}}
 async restore(record){await this.ready();const snapshot=validateSnapshot(record?.snapshot),before=this.current(),session=this.storage.getItem(SESSION_KEY),keys=new Set([...Object.keys(before.entries),...Object.keys(snapshot.entries)]),manualKey='RPG_DEVICE_MANUAL_RESTORE_V1',manualBefore=this.storage.getItem(manualKey);if(!Object.keys(snapshot.entries).length||before.entries[PROFILE_KEY]&&!snapshot.entries[PROFILE_KEY])throw Error('캐릭터 진행 기록이 없는 파일로 현재 기록을 바꿀 수 없어.');await this.vault.put('manual-safety',{format:'our-rpg-device-save',version:1,savedAt:new Date().toISOString(),snapshot:before});
 if(JSON.stringify(this.current())!==JSON.stringify(before)||this.storage.getItem(SESSION_KEY)!==session)throw Error('백업 중에 현재 진행 기록이 바뀌었어. 다시 확인해 줘.');
 try{this.storage.setItem(manualKey,JSON.stringify({at:new Date().toISOString()}));if(session){const s=JSON.parse(session);this.storage.setItem(SESSION_KEY,JSON.stringify({...s,enabled:false}))}for(const key of keys){if(!isProgressKey(key))continue;if(Object.hasOwn(snapshot.entries,key))this.storage.setItem(key,snapshot.entries[key]);else this.storage.removeItem(key)}}catch(error){let rollbackFailed=false;try{if(manualBefore!==null)this.storage.setItem(manualKey,manualBefore);else this.storage.removeItem(manualKey)}catch{rollbackFailed=true}for(const key of keys){try{if(Object.hasOwn(before.entries,key))this.storage.setItem(key,before.entries[key]);else this.storage.removeItem(key)}catch{rollbackFailed=true}}try{if(session!==null)this.storage.setItem(SESSION_KEY,session);else this.storage.removeItem(SESSION_KEY)}catch{rollbackFailed=true}if(rollbackFailed)throw Error('기기 저장 공간 오류가 있어. 불러오기 전 안전 백업은 보관했으니 안전 백업 파일을 내려받아 줘.');throw error}return snapshot}
 async safety(){await this.ready();return (await this.vault.read(['manual-safety']))[0]}
}
