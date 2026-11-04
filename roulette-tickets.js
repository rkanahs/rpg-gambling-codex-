(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.OurRpgRouletteTickets=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const PROFILE_KEY='our-rpg-player-profiles-v2',STATE_FIELD='fateRouletteState';
  const COST=2000;
  const OUTCOMES=[
    {name:'노멀 재료권',tier:'노멀',field:'normalTickets',quantity:1},
    {name:'노멀 꾸러미',tier:'노멀',field:'normalTickets',quantity:2},
    {name:'노멀 큰 꾸러미',tier:'노멀',field:'normalTickets',quantity:3},
    {name:'중간 재료권',tier:'중간',field:'middleTickets',quantity:1},
    {name:'중간 꾸러미',tier:'중간',field:'middleTickets',quantity:2},
    {name:'상급 재료권',tier:'상급',field:'advancedTickets',quantity:1},
    {name:'상급 꾸러미',tier:'상급',field:'advancedTickets',quantity:2},
    {name:'전설 재료권',tier:'전설',field:'legendaryTickets',quantity:1}
  ].map(Object.freeze);
  const fields=['normalTickets','middleTickets','advancedTickets','legendaryTickets'];
  function count(value,label){
    const n=value==null||value===''?0:Number(value);
    if(!Number.isSafeInteger(n)||n<0)throw Error(label+' 수량을 현황표에서 확인해 주세요.');
    return n;
  }
  function profileStore(storage){
    let s;try{s=JSON.parse(storage.getItem(PROFILE_KEY)||'null');}catch{throw Error('현황표 저장 기록을 읽지 못했습니다.');}
    if(!s||!Array.isArray(s.profiles))throw Error('먼저 현황표에서 캐릭터를 선택하고 저장해 주세요.');
    const p=s.profiles.find(x=>x.id===s.activeId);
    if(!p?.id||!p.data)throw Error('먼저 현황표에서 캐릭터를 선택하고 저장해 주세요.');
    return {s,p};
  }
  function state(data){
    if(data[STATE_FIELD]==null||data[STATE_FIELD]==='')return {sequence:0,last:null};
    let v;try{v=JSON.parse(data[STATE_FIELD]);}catch{throw Error('룰렛 지급 기록을 읽지 못했습니다. 기존 기록을 확인해 주세요.');}
    if(v?.schema!==1||!Number.isSafeInteger(v.sequence)||v.sequence<1||!v.last||v.last.sequence!==v.sequence||!Number.isInteger(v.last.roll)||v.last.roll<1||v.last.roll>8||typeof v.last.id!=='string')throw Error('룰렛 지급 기록이 올바르지 않습니다.');
    return v;
  }
  function current(storage){
    const {p}=profileStore(storage),history=state(p.data);
    return {id:p.id,name:p.data.characterName||p.data.playerName||'이름 미정',sequence:history.sequence,last:history.last,
      tickets:Object.fromEntries(fields.map(k=>[k,count(p.data[k],'재료권')]))};
  }
  function settle(storage,input){
    const {s,p}=profileStore(storage);
    if(p.id!==input.profileId)throw Error('선택된 캐릭터가 바뀌었습니다. 다시 확인해 주세요.');
    if(!/^[a-zA-Z0-9_-]{16,100}$/.test(input.id||'')||!Number.isSafeInteger(input.sequence)||!Number.isInteger(input.roll)||input.roll<1||input.roll>8)throw Error('룰렛 판정 정보를 확인해 주세요.');
    const prior=state(p.data);
    if(prior.last?.id===input.id){
      if(prior.last.sequence!==input.sequence||prior.last.roll!==input.roll)throw Error('이미 저장된 룰렛 결과와 다른 요청입니다.');
      return {duplicate:true,receipt:prior.last};
    }
    if(input.sequence!==prior.sequence+1)throw Error('이미 처리되었거나 다른 창에서 룰렛을 진행했습니다. 현재 기록을 확인해 주세요.');
    const reward=OUTCOMES[input.roll-1],beforeTickets=count(p.data[reward.field],'재료권'),afterTickets=beforeTickets+reward.quantity;
    if(!Number.isSafeInteger(afterTickets))throw Error('재료권 수량이 저장 범위를 초과했습니다.');
    const units=[['diamond',1000000],['gold',10000],['silver',100],['copper',1]];
    const beforeMoney=units.reduce((sum,[key,rate])=>sum+count(p.data[key],'화폐')*rate,0);
    if(!Number.isSafeInteger(beforeMoney))throw Error('현황표 화폐 수량을 확인해 주세요.');
    if(beforeMoney<COST)throw Error('룰렛에 필요한 20실버가 부족합니다.');
    const at=input.at||new Date().toISOString();
    const receipt={id:input.id,sequence:input.sequence,profileId:p.id,character:p.data.characterName||p.data.playerName||'이름 미정',roll:input.roll,
      ...reward,beforeTickets,afterTickets,cost:COST,beforeMoney,afterMoney:beforeMoney-COST,at};
    let remaining=receipt.afterMoney;
    for(const [key,rate]of units){p.data[key]=String(Math.floor(remaining/rate));remaining%=rate;}
    p.data[reward.field]=String(afterTickets);
    p.data[STATE_FIELD]=JSON.stringify({schema:1,sequence:input.sequence,last:receipt});p.updatedAt=at;
    // Cost, award and replay guard share one atomic localStorage write.
    try{storage.setItem(PROFILE_KEY,JSON.stringify(s));}catch{throw Error('저장 공간 또는 기기 저장 오류로 룰렛을 완료하지 못했습니다. 비용과 재료권은 변경하지 않았습니다.');}
    return {duplicate:false,receipt};
  }
  return Object.freeze({PROFILE_KEY,STATE_FIELD,COST,OUTCOMES:Object.freeze(OUTCOMES),current,settle});
});
