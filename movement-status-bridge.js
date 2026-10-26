(function () {
  "use strict";

  function regionLevelExp(region){const r=String(region||'');return r.includes('경계')||r==='boundary'?5900:r.includes('대륙')||r==='continent'?1000:500}


  const PROFILE_KEY = "our-rpg-player-profiles-v2";
  const MOVE_KEY = "our-rpg-last-movement-result-v1";
  const APPLIED_KEY = "our-rpg-movement-profile-applied-v1";
  const REGION_TO_FORM = { "평원": "plain", "대륙": "continent", "경계": "boundary" };
  const REGION_TO_STATUS = {
    "평원": "평원 · 해오름뜰",
    "대륙": "대륙 · 큰길마루",
    "경계": "경계 · 끝빛보루"
  };

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "") || fallback; }
    catch (_) { return fallback; }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function activeProfile(store) {
    if (!store || !Array.isArray(store.profiles) || !store.profiles.length) return null;
    return store.profiles.find(profile => profile && profile.id === store.activeId) || store.profiles[0];
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
  }

  function statusRegion(region) {
    return REGION_TO_STATUS[region] || region || "평원 · 해오름뜰";
  }

  function formRegion(region) {
    const name = String(region || "").split(" · ")[0];
    return REGION_TO_FORM[name] || "plain";
  }

  function notice(doc, message, success) {
    let box = doc.getElementById("movementStatusNotice");
    if (!box) {
      box = doc.createElement("p");
      box.id = "movementStatusNotice";
      box.style.cssText = "margin:10px 0 0;padding:10px 12px;border-left:3px solid #d8ac55;background:#171910;color:#d7e5de;font-weight:800;line-height:1.55";
      doc.getElementById("judge")?.closest(".actions")?.insertAdjacentElement("afterend", box);
    }
    box.style.borderLeftColor = success ? "#6dc59b" : "#d8ac55";
    box.textContent = message;
  }

  function loadProfile(doc) {
    const store = read(PROFILE_KEY, null);
    const profile = activeProfile(store);
    if (!profile || !profile.data) {
      notice(doc, "현황표에 저장된 캐릭터가 없어. 먼저 플레이어 현황표에서 캐릭터를 저장해 줘.", false);
      return null;
    }
    const data = profile.data;
    const name = doc.getElementById("name");
    const total = doc.getElementById("total");
    const region = doc.getElementById("region");
    if (name && !name.value.trim()) name.value = data.characterName || data.playerName || "";
    if (total) total.value = String(number(data.distance));
    if (region) {
      region.value = formRegion(data.region);
      region.dispatchEvent(new Event("change", { bubbles: true }));
    }
    notice(doc, (data.characterName || data.playerName || "현재 캐릭터") + "의 현황을 불러왔어. 이동 판정이 끝나면 누적 거리와 지역이 자동 저장돼.", true);
    return profile;
  }

  function saveMovement(doc) {
    const move = read(MOVE_KEY, null);
    if (!move || !move.id) return;
    const applied = read(APPLIED_KEY, []);
    if (Array.isArray(applied) && applied.includes(move.id)) {
      notice(doc, "이 이동은 이미 현황표에 기록되어 있어. 중복으로 더하지 않았어.", false);
      return;
    }
    const store = read(PROFILE_KEY, null);
    const profile = activeProfile(store);
    if (!profile || !profile.data) {
      notice(doc, "이동 결과는 나왔지만 저장할 캐릭터 현황표가 없어.", false);
      return;
    }
    const data = profile.data;
    const previous = number(data.distance);
    const resultTotal = number(move.currentCoordinate);
    const moved = number(move.distance != null ? move.distance : move.moved);
    data.distance = resultTotal || (previous + moved);
    data.region = statusRegion(move.region);
    data.expNeeded = String(regionLevelExp(data.region));
    data.lastMovement = [move.at || new Date().toISOString(), "+" + moved, move.encounter || "결과 미기록"].join(" · ");
    move.characterId = profile.id;
    move.character = data.characterName || data.playerName || move.character || "";
    write(PROFILE_KEY, store);
    write(MOVE_KEY, move);
    write(APPLIED_KEY, [...(Array.isArray(applied) ? applied : []), move.id].slice(-100));
    window.dispatchEvent(new StorageEvent("storage", { key: PROFILE_KEY, newValue: JSON.stringify(store) }));
    notice(doc, "✓ " + (move.character || "현재 캐릭터") + " 현황에 기록 완료 · 누적 이동거리 " + data.distance.toLocaleString("ko-KR") + " · " + data.region, true);
  }

  function bind(doc) {
    const judge = doc && doc.getElementById("judge");
    if (!judge || judge.dataset.statusBridge === "1") return;
    judge.dataset.statusBridge = "1";
    loadProfile(doc);
    judge.addEventListener("click", function () {
      setTimeout(function () { saveMovement(doc); }, 0);
    });
  }

  function run() {
    const frame = document.getElementById("embeddedFrame");
    if (!frame) return;
    const doc = frame.contentDocument;
    if (doc && doc.getElementById("judge")) bind(doc);
  }

  function attach() {
    const frame = document.getElementById("embeddedFrame");
    if (!frame) return;
    if (frame.dataset.movementStatusBridge !== "1") {
      frame.dataset.movementStatusBridge = "1";
      frame.addEventListener("load", function () { setTimeout(run, 0); });
    }
    run();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", attach, { once: true });
  else attach();
})();


// Pet encounter odds upgrade: plain 12%, continent 12%, boundary 25%.
(()=>{'use strict';const R={plain:[['아무 일 없음',30],['일반 몬스터',33],['일반 보물상자',12],['희귀 보물상자',4],['전설 보물상자',.5],['희귀 몬스터',6],['야생 펫 등장',12],['일반 보스',1],['???',1],['중간보스 등장',.4],['최종보스 등장',.1]],continent:[['아무 일 없음',22],['일반 몬스터',31],['일반 보물상자',10],['희귀 보물상자',6],['전설 보물상자',1],['희귀 몬스터',10],['야생 펫 등장',12],['일반 보스',4],['???',2],['중간보스 등장',1.5],['최종보스 등장',.5]],boundary:[['아무 일 없음',5],['전설 보물상자',10],['희귀 야생 펫 등장',25],['???',5],['중간보스 등장',30],['최종보스 등장',25]]};function rnd(n){const a=new Uint32Array(1),l=Math.floor(4294967296/n)*n;do crypto.getRandomValues(a);while(a[0]>=l);return a[0]%n}function patch(){if(typeof activeSlug!=='undefined'&&activeSlug!=='our-rpg-movement-results')return;const f=typeof embeddedFrame!=='undefined'?embeddedFrame:document.querySelector('.embedded-frame'),d=f&&f.contentDocument,w=f&&f.contentWindow;if(!d||!w||!d.querySelector('#region')||!d.querySelector('#odds'))return;w.encounter=r=>{const roll=rnd(1000)+1;let e=0;for(const[n,p]of R[r]){e+=p*10;if(roll<=e)return{name:n,roll}}return{name:R[r].at(-1)[0],roll}};const paint=()=>{const a=R[d.querySelector('#region').value];if(a)d.querySelector('#odds').innerHTML=a.map(x=>'<tr><td>'+x[0]+'</td><td>'+x[1]+'%</td></tr>').join('')};if(!d.documentElement.dataset.petOddsUpgrade){d.documentElement.dataset.petOddsUpgrade='12-12-25';d.querySelector('#region').addEventListener('change',()=>setTimeout(paint,0))}paint()}const f=document.querySelector('.embedded-frame');if(f)f.addEventListener('load',()=>setTimeout(patch,0));setTimeout(patch,0)})();
