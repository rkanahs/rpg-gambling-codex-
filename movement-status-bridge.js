(function () {
  "use strict";

  function regionLevelExp(region){const r=String(region||'');return r.includes('경계')||r==='boundary'?30000:r.includes('대륙')||r==='continent'?1000:500}


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

  function ownedPets(profile) {
    let pets = profile?.data?.petsOwned;
    try { if (typeof pets === "string") pets = JSON.parse(pets); } catch (_) { pets = []; }
    const seen = new Set();
    return (Array.isArray(pets) ? pets : []).filter(pet => {
      if (!pet || typeof pet.name !== "string" || !pet.name.trim() || seen.has(pet.name)) return false;
      seen.add(pet.name); return true;
    });
  }

  function movementPetData(profile) {
    const data = profile?.data || {};
    if (!Object.hasOwn(data, "movementPetName")) return data;
    const name = String(data.movementPetName || ""), pet = ownedPets(profile).find(pet => pet.name === name);
    if (!pet && name && name === data.petName) return data;
    return { ...data, petName: pet?.name || "", petGrade: pet ? pet.rarity || pet.grade || "" : "", petType: pet?.type || "", petEffect: pet?.effect || "" };
  }

  function escapePet(value) {
    return String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function petSwitchMessage(doc, text, bad = false) {
    const box = doc.getElementById("movementPetSwitchNotice");
    if (box) { box.textContent = text; box.style.color = bad ? "#f09595" : "#7dd5a5"; }
  }

  function petSwitchButton(doc, profile) {
    const select = doc.getElementById("movementPetSelect"), button = doc.getElementById("movementPetChange");
    if (!select || !button) return;
    const chosen = select.value;
    button.disabled = !profile?.data || select.dataset.ownerId !== profile.id || chosen === (movementPetData(profile).petName || "") || (chosen !== "" && !ownedPets(profile).some(pet => pet.name === chosen));
  }

  function renderPetChoices(doc, profile) {
    const select = doc.getElementById("movementPetSelect");
    if (!select) return;
    const pets = ownedPets(profile), current = movementPetData(profile).petName || "";
    select.innerHTML = '<option value="">동행 해제</option>' +
      (current && !pets.some(pet => pet.name === current) ? '<option value="'+escapePet(current)+'" disabled>'+escapePet(current)+' · 기존 동행</option>' : '') +
      pets.map(pet => '<option value="'+escapePet(pet.name)+'">'+escapePet(pet.name)+(pet.rarity || pet.grade ? ' · '+escapePet(pet.rarity || pet.grade) : '')+'</option>').join('');
    select.value = current;
    select.dataset.ownerId = profile?.id || "";
    select.disabled = !profile;
    petSwitchButton(doc, profile);
  }

  function switchMovementPet(doc) {
    const select = doc.getElementById("movementPetSelect");
    if (!select) return;
    let saved = false;
    try {
      const store = read(PROFILE_KEY, null), profile = activeProfile(store);
      if (!profile?.data || select.dataset.ownerId !== profile.id) throw Error("캐릭터가 바뀌었어. 펫을 다시 선택해 줘.");
      const name = select.value, chosen = name ? ownedPets(profile).find(pet => pet.name === name) : null;
      if (name && !chosen) throw Error("이 캐릭터가 보유한 펫만 선택할 수 있어.");
      if ((movementPetData(profile).petName || "") === name) return;
      const data = profile.data;
      if (!Object.hasOwn(data, "battlePetName")) data.battlePetName = data.petName || "";
      data.movementPetName = chosen?.name || "";
      profile.updatedAt = new Date().toISOString();
      write(PROFILE_KEY, store);
      saved = true;
      doc.movementPetSwitchSaving = true;
      doc.movementPetSignature = "";
      loadProfile(doc, true);
      window.dispatchEvent(new StorageEvent("storage", { key: PROFILE_KEY, newValue: JSON.stringify(store) }));
      if (typeof CustomEvent === "function") window.dispatchEvent(new CustomEvent("our-rpg:profiles-updated", { detail: { characterId: profile.id, source: "movement-pet-switch" } }));
      petSwitchMessage(doc, name ? "✓ " + name + " 이동용 설정 · 전투용 펫은 유지 · 다음 이동부터 적용돼." : "✓ 이동용 동행 해제 · 전투용 펫은 그대로야.");
    } catch (error) {
      petSwitchMessage(doc, saved ? "펫은 저장됐어. 이동 결과판을 다시 열어 확인해 줘." : (error.message || "펫 변경을 저장하지 못했어. 다시 시도해 줘."), true);
      if (!saved) { doc.movementPetSignature = ""; loadProfile(doc, true); }
    } finally { doc.movementPetSwitchSaving = false; }
  }

  function loadPet(doc, profile) {
    const data = movementPetData(profile);
    const name = String(data.petName || "").trim();
    const effect = name ? String(data.petEffect || "") : "";
    const signature = JSON.stringify([profile?.id || "", name, effect, data.petGrade || "", data.petType || "", data.petsOwned || []]);
    if (doc.movementPetSignature === signature) return;
    doc.movementPetSignature = signature;
    renderPetChoices(doc, profile);
    const active = doc.getElementById("petActive");
    const fields = doc.getElementById("petFields");
    const petName = doc.getElementById("petName");
    const petEffect = doc.getElementById("petEffect");
    const rate = doc.getElementById("petRate");
    if (active) active.checked = !!name;
    if (fields) fields.hidden = !name;
    if (petName) petName.value = name;
    if (petEffect) petEffect.value = effect;
    const match = effect.match(/(?:이동거리|이동 거리|이동)(?:\s*(?:증가|보정))?\s*\+\s*(\d+(?:\.\d+)?)\s*%/);
    if (rate) rate.value = String(match ? 100 + Number(match[1]) : 100);
    const randomNames = new Set(['행운 햄스터','도굴 두더지','동전 고양이','보물 미믹 새끼','장난꾸러기 여우','무지개 새','운명의 슬라임','황금 고블린 새끼','신비한 알','무지개 정령','운명의 정령','보물 정령','행운의 용','혼돈의 정령왕','기적의 별짐승','운명을 굴리는 자']);
    const grade = String(data.petGrade || '').trim().toUpperCase();
    const extras = name && !randomNames.has(name) && !String(data.petType || '').includes('랜덤') ? Math.min(2, ({N:1,B:2,A:3,S:5,SS:10,SSS:20})[grade] || 0) : 0;
    doc.movementPet = { name, effect, extras, rate: match ? 100 + Number(match[1]) : 100 };
    const summary = doc.getElementById('petMovementSummary');
    doc.defaultView?.renderOdds?.();
    if (summary) summary.textContent = !name ? '동행 펫 없음 · 추가 이동 없음' : name + ' · 추가 이동 D100 ' + extras + '회 · 이동 보정 ' + (match ? 100 + Number(match[1]) : 100) + '%' + (/발견|확률|판정|랜덤|보조/.test(effect) ? ((globalThis.RpgPetMovement?.rules[name]||globalThis.RpgPetMovement?.encounterRows?.([['일반 몬스터',30],['아무 일 없음',70]],true).ability)?' · 고유 능력 자동 판정':' · 수치 없는 고유 효과는 운영자 판정 필요') : '');
  }

  function loadProfile(doc, preserveRegion = false) {
    const store = read(PROFILE_KEY, null);
    const profile = activeProfile(store);
    loadPet(doc, profile);
    const speed = Number(profile?.data?.speed);
    doc.movementSpeed = Number.isFinite(speed) && speed >= 0 ? speed : 0;
    const speedNotice = doc.getElementById("movementSpeedNotice");
    if (speedNotice) speedNotice.textContent = "현황표 이속 " + doc.movementSpeed.toLocaleString("ko-KR") + (doc.movementSpeed > 500 ? " · 기본 이동 D100 2회 · 입력한 1회 + 자동 추가 1회 합산 (펫 추가 이동은 별도)" : " · 기본 이동 D100 1회 · 이속 500 초과 시 2회");
    if (!profile || !profile.data) {
      notice(doc, "현황표에 저장된 캐릭터가 없어. 먼저 플레이어 현황표에서 캐릭터를 저장해 줘.", false);
      return null;
    }
    const data = profile.data;
    const name = doc.getElementById("name");
    const total = doc.getElementById("total");
    const region = doc.getElementById("region");
    if (name) name.value = data.characterName || data.playerName || "";
    if (total) total.value = String(number(data.distance));
    if (region && (!preserveRegion || doc.movementProfileId !== profile.id)) {
      region.value = formRegion(data.region);
      region.dispatchEvent(new Event("change", { bubbles: true }));
    }
    doc.movementProfileId = profile.id;
    notice(doc, (data.characterName || data.playerName || "현재 캐릭터") + "의 현황을 불러왔어. 이동 판정이 끝나면 누적 거리와 지역이 자동 저장돼.", true);
    return profile;
  }

  function saveMovement(doc, previousId, ownerId) {
    const move = read(MOVE_KEY, null);
    if (!move || !move.id || move.id === previousId) return;
    const applied = read(APPLIED_KEY, []);
    if (Array.isArray(applied) && applied.includes(move.id)) {
      notice(doc, "이 이동은 이미 현황표에 기록되어 있어. 중복으로 더하지 않았어.", false);
      return;
    }
    const store = read(PROFILE_KEY, null);
    const profile = store?.profiles?.find(p => p && p.id === ownerId);
    if (!profile || !profile.data) {
      notice(doc, "이동 결과는 나왔지만 저장할 캐릭터 현황표가 없어.", false);
      return;
    }
    const data = profile.data;
    const previous = number(data.distance);
    const resultTotal = number(move.currentCoordinate);
    const moved = number(move.distance != null ? move.distance : move.moved);
    data.distance = Number.isFinite(Number(move.currentCoordinate)) ? resultTotal : (previous + moved);
    data.region = statusRegion(move.region);
    data.expNeeded = String(regionLevelExp(data.region));
    data.lastMovement = [move.at || new Date().toISOString(), "+" + moved, move.encounter || "결과 미기록"].join(" · ");
    move.characterId = profile.id;
    move.character = data.characterName || data.playerName || move.character || "";
    try {
    globalThis.RpgPetMovement?.apply(profile, move);
    write(PROFILE_KEY, store);
    write(MOVE_KEY, move);
    write(APPLIED_KEY, [...(Array.isArray(applied) ? applied : []), move.id].slice(-100));
    } catch (_) {
      notice(doc, "이동 현황 저장에 실패했어. 저장 공간을 확인해 줘.", false);
      return;
    }
    const total = doc.getElementById("total");
    if (total) total.value = String(data.distance);
    window.dispatchEvent(new StorageEvent("storage", { key: PROFILE_KEY, newValue: JSON.stringify(store) }));
    notice(doc, "✓ " + (move.character || "현재 캐릭터") + " 현황에 기록 완료 · 누적 이동거리 " + data.distance.toLocaleString("ko-KR") + " · " + data.region, true);
  }

  function bind(doc) {
    const judge = doc && doc.getElementById("judge");
    if (!judge || judge.dataset.statusBridge === "1") return;
    judge.dataset.statusBridge = "1";
    loadProfile(doc);
    const petSelect = doc.getElementById("movementPetSelect"), petChange = doc.getElementById("movementPetChange");
    if (petSelect) petSelect.addEventListener("change", () => petSwitchButton(doc, activeProfile(read(PROFILE_KEY, null))));
    if (petChange) petChange.addEventListener("click", () => switchMovementPet(doc));
    judge.addEventListener("click", function (event) {
      const profile = loadProfile(doc, true);
      if (!profile) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const previousId = read(MOVE_KEY, null)?.id;
      setTimeout(function () { saveMovement(doc, previousId, profile.id); }, 0);
    }, true);
    window.addEventListener("storage", function (event) {
      if (event.key === PROFILE_KEY && doc.defaultView && !doc.defaultView.closed) loadProfile(doc, !!doc.movementPetSwitchSaving);
    });
    window.addEventListener("our-rpg:profiles-updated", function () {
      if (doc.defaultView && !doc.defaultView.closed) loadProfile(doc, !!doc.movementPetSwitchSaving);
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


