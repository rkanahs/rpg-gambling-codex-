import {DeviceBackupVault} from './device-backup-vault.mjs';

export class DeviceSlotVault extends DeviceBackupVault {
 async transaction(mode, action){
  const db=await this.open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction('backups',mode);
   const store=tx.objectStore('backups');
   let result;
   tx.oncomplete=()=>{db.close();resolve(result)};
   tx.onabort=tx.onerror=()=>{db.close();reject(tx.error||Error('기기 저장소 작업을 완료하지 못했어.'))};
   try{action(store,value=>{result=value})}
   catch(error){tx.abort();reject(error)}
  });
 }
 read(keys){
  return this.transaction('readonly',(store,finish)=>{
   const values=keys.map(()=>null);
   keys.forEach((key,i)=>{const request=store.get(key);request.onsuccess=()=>{values[i]=request.result??null}});
   finish(values);
  });
 }
 put(key,record){
  return this.transaction('readwrite',store=>store.put(record,key));
 }
 migrate(entries){
  return this.transaction('readwrite',store=>{
   for(const [key,record] of entries){
    const request=store.get(key);
    request.onsuccess=()=>{if(request.result===undefined)store.put(record,key)};
   }
  });
 }
}
