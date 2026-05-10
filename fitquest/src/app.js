import {
  RARITY_COLORS,
  FALLBACK_BOSS,
  FALLBACK_WEAPON,
  FALLBACK_MAT,
  FALLBACK_ING,
  TYPE_ICON,
  TYPE_LABEL,
  TYPE_CSS,
  COUNTER_TYPE,
  RARITY_VALUE,
  UPGRADE_COST,
  RARITY_ORDER,
  POTION_PRICE,
  SELL_MATERIAL,
  SELL_INGREDIENT,
  MAX_COMB_LEVEL,
  COMB_BONUS_PER_LEVEL,
  SLOT_LABEL,
  SUGGESTED_REPS,
} from './data/constants.js';
import {
  ELEMENTS,
  ELEMENT_OPTIONS,
  elementMultiplier,
  elementTag,
} from './data/elements.js';
import { GAME_DATA } from './data/gameData.js';
import { ZONE_SVG } from './data/zones.js';
import { defaultState } from './core/state.js';
import { loadGame, saveGame, resetGame, replaceStoredSave } from './core/storage.js';

/* DATA WRAPPERS - Phase 6B */
function _isDisabled(id){return state&&state.player&&state.player.custom&&state.player.custom.disabledIds.includes(id);}
function allZones(){if(!state||!state.player||!state.player.custom)return GAME_DATA.zones;return [...GAME_DATA.zones,...state.player.custom.zones].filter(z=>!_isDisabled(z.id));}
function allExercises(){if(!state||!state.player||!state.player.custom)return GAME_DATA.exercises;return [...GAME_DATA.exercises,...state.player.custom.exercises].filter(e=>!_isDisabled(e.id));}
function allBosses(){if(!state||!state.player||!state.player.custom)return GAME_DATA.bosses;return [...GAME_DATA.bosses,...state.player.custom.bosses].filter(b=>!_isDisabled(b.id));}
function allEquipment(){if(!state||!state.player||!state.player.custom)return GAME_DATA.weapons;return [...GAME_DATA.weapons,...state.player.custom.equipment].filter(w=>!_isDisabled(w.id));}
function allMaterials(){if(!state||!state.player||!state.player.custom)return GAME_DATA.materials;return [...GAME_DATA.materials,...state.player.custom.materials].filter(m=>!_isDisabled(m.id));}
function allIngredients(){if(!state||!state.player||!state.player.custom)return GAME_DATA.ingredients;return [...GAME_DATA.ingredients,...state.player.custom.ingredients].filter(i=>!_isDisabled(i.id));}
function allBlacksmithRecipes(){if(!state||!state.player||!state.player.custom)return GAME_DATA.recipes_blacksmith;return [...GAME_DATA.recipes_blacksmith,...(state.player.custom.blacksmith||[])];}
function allWitchRecipes(){if(!state||!state.player||!state.player.custom)return GAME_DATA.recipes_witch;return [...GAME_DATA.recipes_witch,...(state.player.custom.witch||[])];}
function allSpells(){if(!state||!state.player||!state.player.custom)return GAME_DATA.spells;return [...GAME_DATA.spells,...(state.player.custom.spells||[])].filter(s=>!_isDisabled(s.id));}
function getSpellById(id){return allSpells().find(s=>s.id===id);}
function isBuiltIn(id,type){
  const map={zones:GAME_DATA.zones,exercises:GAME_DATA.exercises,bosses:GAME_DATA.bosses,equipment:GAME_DATA.weapons,materials:GAME_DATA.materials,ingredients:GAME_DATA.ingredients};
  return (map[type]||[]).some(x=>x.id===id);
}

/* ICONS */
function iconUrl(name,color){const c=encodeURIComponent(color||'#FFFFFF');return `https://api.iconify.design/game-icons:${name}.svg?color=${c}`;}
function buildIconImg(iconName,color,sizeClass,fallbackEmoji){
  const url=iconUrl(iconName,color);
  return `<img src="${url}" class="${sizeClass}" alt="" onerror="this.outerHTML='<span class=&quot;${sizeClass.replace('-img','-emoji')} boss-emoji&quot;>${fallbackEmoji}</span>'">`;
}
/* customImage en priorité, sinon Game-icons, sinon emoji */
function imgFor(item,sizeClass,fallbackEmoji){
  const color=item&&item.rarity?(RARITY_COLORS[item.rarity]||'#fff'):'#fff';
  if(item&&item.customImage){
    return `<img src="${item.customImage}" class="${sizeClass}" alt="" style="object-fit:cover;border-radius:6px;">`;
  }
  if(item&&item.icon){
    return buildIconImg(item.icon,color,sizeClass,fallbackEmoji);
  }
  return `<span class="${sizeClass.replace('-img','-emoji')} boss-emoji">${fallbackEmoji}</span>`;
}

/* STATE */
let state=null;
let currentExerciseId=null;
let invTypeFilter='all';
let activeInvTab='inventory';
let activeMerchantTab='buy';

function saveState(){
  saveGame(state,{onPersistError:()=>showToast('⚠ Erreur de sauvegarde')});
}
function resetState(){
  resetGame();
  state=null;
}

/* HELPERS */
function $(id){return document.getElementById(id);}
function showToast(message,duration=2500){const t=$('toast');t.innerHTML=message;t.classList.add('show');clearTimeout(t._timeout);t._timeout=setTimeout(()=>t.classList.remove('show'),duration);}
function openModal(id){$(id).classList.add('active');}
function closeModal(id){$(id).classList.remove('active');}
function rarityLabel(r){return({common:'Commun',rare:'Rare',epic:'Épique',legendary:'Légendaire'})[r]||r;}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}

const EQUIP_SLOTS=[
  {key:'weapon_main',icon:'⚔️',label:'Arme'},{key:'weapon_secondary',icon:'🏹',label:'Sec.'},
  {key:'armor',icon:'🛡️',label:'Plastron'},{key:'helmet',icon:'⛑',label:'Casque'},
  {key:'legs',icon:'👖',label:'Jambes'},{key:'cape',icon:'🧥',label:'Cape'},
  {key:'accessory_1',icon:'💍',label:'Bague 1'},{key:'accessory_2',icon:'📿',label:'Bague 2'}
];

/* PROGRESSION */
function xpForNextLevel(level){return 200*(level+1);}
function getEffectiveStats(item){
  if(!item||!item.stats)return{};
  const lvl=item.combLevel||0;
  const mult=1+COMB_BONUS_PER_LEVEL*lvl;
  const out={};
  Object.entries(item.stats).forEach(([k,v])=>{out[k]=Math.round(v*mult);});
  return out;
}
function computeEquipmentBonus(){
  const bonus={force:0,defense:0,agility:0,constitution:0};
  Object.values(state.player.equipment).forEach(item=>{
    if(item){const eff=getEffectiveStats(item);Object.entries(eff).forEach(([k,v])=>{bonus[k]=(bonus[k]||0)+v;});}
  });
  return bonus;
}
function getDifficultyTier(level){
  if(level<=10)return{tier:'easy',numEx:3,sets:3,reps:10,seconds:30};
  if(level<=30)return{tier:'medium',numEx:4,sets:3,reps:12,seconds:40};
  if(level<=50)return{tier:'hard',numEx:5,sets:4,reps:14,seconds:50};
  return{tier:'extreme',numEx:6,sets:4,reps:16,seconds:60};
}
function isGoodMatchup(exerciseType,bossType){return COUNTER_TYPE[bossType]===exerciseType;}
function matchupMultiplier(exerciseType,bossType){return isGoodMatchup(exerciseType,bossType)?1.5:1.0;}

/* DAMAGE - Nouvelle formule rééquilibrée */
function computeExerciseDamage(exerciseId,sets,repsOrSec,weight,options={}){
  const ex=allExercises().find(e=>e.id===exerciseId);
  if(!ex)return 0;
  const recordBonus=state.player.records_bonus[exerciseId]||0;
  const bonus=computeEquipmentBonus();
  const forceMult=1+(bonus.force/200); // +0.5% par point de force d'équip
  // Volume normalisé : 10 reps ou 30s = baseline (×1)
  const baseUnit=ex.unit==='seconds'?30:10;
  const volumeMult=repsOrSec/baseUnit;
  let dmg=(ex.baseDamage+recordBonus)*sets*volumeMult;
  if(ex.hasWeight&&weight>0)dmg+=weight*0.3;
  dmg*=forceMult;
  if(state.boss.current){
    dmg*=matchupMultiplier(ex.type,state.boss.current.type);
    // Matchup élémentaire (arme principale équipée vs élément du boss)
    const weapon=state.player.equipment.weapon_main;
    if(weapon&&weapon.element&&state.boss.current.element){
      dmg*=elementMultiplier(weapon.element,state.boss.current.element);
    }
    // Réduction par défense du boss
    const defReduction=100/(100+(state.boss.current.defense||0));
    dmg*=defReduction;
  }
  if(options.skill)dmg*=2;
  return Math.max(1,Math.round(dmg));
}

function computeBossCounterAttack(boss){
  const bonus=computeEquipmentBonus();
  const totalDef=state.player.stats.defense+(bonus.defense||0);
  const reduction=Math.min(0.7,totalDef/(totalDef+50));
  const raw=boss.attack*(0.85+Math.random()*0.3);
  return Math.max(1,Math.round(raw*(1-reduction)));
}
function getZoneById(id){return allZones().find(z=>z.id===id);}
function getCurrentZone(){return getZoneById(state.player.currentZone)||GAME_DATA.zones[0];}

function isZoneUnlocked(zoneId){
  if(state.player.unlockedZones.includes(zoneId))return true;
  const z=getZoneById(zoneId);if(!z)return false;
  if(state.player.level<z.requiredLevel)return false;
  if(z.requiredRegionalBoss&&!state.player.defeatedRegionalBosses.includes(z.requiredRegionalBoss))return false;
  return true;
}
function tryUnlockZones(){
  allZones().forEach(z=>{
    if(!state.player.unlockedZones.includes(z.id)&&isZoneUnlocked(z.id)){
      state.player.unlockedZones.push(z.id);
    }
  });
}

function pickBossForLevel(playerLevel){
  const zone=getCurrentZone();
  // Filtrer les boss de la zone (hors boss régional + hors boss régionaux déjà battus)
  const pool=allBosses().filter(b=>{
    if(b.region!==zone.id)return false;
    if(b.isRegionalBoss)return false; // boss régional géré séparément
    return true;
  });
  if(pool.length===0){
    // Fallback : tous les boss de la zone même régionaux non battus
    const fb=allBosses().filter(b=>b.region===zone.id&&!state.player.defeatedRegionalBosses.includes(b.id));
    if(fb.length>0)return fb[Math.floor(Math.random()*fb.length)];
    return allBosses()[0];
  }
  // Préférer les boss proches du niveau joueur
  const close=pool.filter(b=>Math.abs(b.level-playerLevel)<=8);
  const final=close.length>0?close:pool;
  return final[Math.floor(Math.random()*final.length)];
}

function getRegionalBossOfCurrentZone(){
  const zone=getCurrentZone();
  if(!zone.regionalBossId)return null;
  if(state.player.defeatedRegionalBosses.includes(zone.regionalBossId))return null;
  return allBosses().find(b=>b.id===zone.regionalBossId)||null;
}
function generateProposedExercises(boss){
  const tier=getDifficultyTier(boss.level);
  const counterT=COUNTER_TYPE[boss.type];
  const counterCount=Math.ceil(tier.numEx*2/3);
  const otherCount=tier.numEx-counterCount;
  const counterPool=allExercises().filter(e=>e.type===counterT);
  const otherPool=allExercises().filter(e=>e.type!==counterT);
  const picked=[];
  shuffle(counterPool).slice(0,counterCount).forEach(e=>picked.push(e));
  shuffle(otherPool).slice(0,otherCount).forEach(e=>picked.push(e));
  return shuffle(picked);
}
function applyXp(amount){
  state.player.xp+=amount;
  let lvl=0;
  while(state.player.xp>=xpForNextLevel(state.player.level)){
    state.player.xp-=xpForNextLevel(state.player.level);
    state.player.level+=1;lvl+=1;
    state.meta.total_levelups+=1;
    state.player.stats.force+=5;state.player.stats.defense+=3;
    state.player.stats.agility+=2;state.player.stats.constitution+=10;
    state.player.stats.mana=(state.player.stats.mana||100)+10;
    state.player.stats.hp_current=state.player.stats.constitution;
    state.player.stats.mp_current=state.player.stats.mana;
  }
  return lvl;
}

/* VIEWS */
function showView(name){
  $('app').style.display='none';
  $('viewPreSession').classList.remove('active');
  $('viewSession').classList.remove('active');
  $('viewInventory').classList.remove('active');
  $('viewAdmin').classList.remove('active');
  $('actionBar').style.display='none';
  if(name==='dashboard'){$('app').style.display='block';$('actionBar').style.display='block';renderAll();}
  else if(name==='pre-session'){$('viewPreSession').classList.add('active');renderPreSessionView();}
  else if(name==='session'){$('viewSession').classList.add('active');renderSessionView();}
  else if(name==='inventory'){$('viewInventory').classList.add('active');renderInventoryView();}
  else if(name==='admin'){$('viewAdmin').classList.add('active');renderAdmin();}
  window.scrollTo({top:0,behavior:'instant'});
}

/* ZONE BANNER */
function renderZoneBanner(){
  const zone=getCurrentZone();
  const banner=$('zoneBanner');
  if(!banner)return;
  // Apply zone theme to root
  document.documentElement.style.setProperty('--zone-accent',zone.accent||'#D4AF37');
  document.documentElement.style.setProperty('--zone-glow',(zone.themeColor||'#D4AF37')+'33');
  // Custom URL or built-in SVG
  const customBg=zone.bgImage;
  const svg=ZONE_SVG[zone.svgKey]||ZONE_SVG.default;
  const bgHtml=customBg
    ?`<img src="${customBg}" alt="" onerror="this.parentNode.innerHTML='${svg.replace(/"/g,'&quot;').replace(/\n/g,'')}'">`
    :svg;
  // Particles
  const particleCount=8;
  let particles='';
  for(let i=0;i<particleCount;i++){
    const left=Math.floor(Math.random()*95);
    const dur=4+Math.random()*4;
    const delay=Math.random()*4;
    const size=2+Math.random()*3;
    particles+=`<div class="zone-particle" style="left:${left}%;width:${size}px;height:${size}px;background:${zone.accent};opacity:0.6;animation-duration:${dur}s;animation-delay:-${delay}s;"></div>`;
  }
  const elTag=zone.element?elementTag(zone.element):'';
  banner.innerHTML=`<div class="zone-banner-bg">${bgHtml}</div><div class="zone-banner-overlay"></div><div class="zone-particles">${particles}</div><div class="zone-banner-content"><div class="zone-banner-row"><div><div class="zone-banner-title">${zone.name}</div><div class="zone-banner-meta">Niveau ${zone.levelMin}-${zone.levelMax} · ${state.player.unlockedZones.length}/${allZones().length} zones ${elTag}</div></div><button class="zone-banner-action" id="btnTravel">🗺 Voyager</button></div></div>`;
  $('btnTravel').addEventListener('click',openZoneTravel);
}

function openZoneTravel(){
  const list=$('zoneTravelList');
  list.innerHTML=allZones().map(z=>{
    const isActive=z.id===state.player.currentZone;
    const isUnlocked=state.player.unlockedZones.includes(z.id);
    let canUnlock=false;
    if(!isUnlocked){canUnlock=isZoneUnlocked(z.id);if(canUnlock)state.player.unlockedZones.push(z.id);}
    const status=isActive?'⭐ Zone actuelle':(isUnlocked?'✓ Débloquée':'🔒 Verrouillée');
    const cls=isActive?'active':(isUnlocked?'unlocked':'locked');
    const customBg=z.bgImage;
    const svg=ZONE_SVG[z.svgKey]||ZONE_SVG.default;
    const bgHtml=customBg?`<img src="${customBg}" alt="" onerror="this.parentNode.innerHTML='${svg.replace(/"/g,'&quot;').replace(/\n/g,'')}'">`:svg;
    let req='';
    if(!isUnlocked){
      const issues=[];
      if(state.player.level<z.requiredLevel)issues.push(`niveau ${z.requiredLevel} requis (vous : ${state.player.level})`);
      if(z.requiredRegionalBoss&&!state.player.defeatedRegionalBosses.includes(z.requiredRegionalBoss)){
        const rb=allBosses().find(b=>b.id===z.requiredRegionalBoss);
        issues.push(`vaincre ${rb?rb.name:'le boss régional précédent'}`);
      }
      req=`<div class="req">⚠ ${issues.join(' · ')}</div>`;
    }
    return `<div class="zone-list-item ${cls}" data-zone="${z.id}"><div class="zone-mini">${bgHtml}<div class="zone-mini-overlay"></div><div class="zone-mini-name">${z.name}</div></div><div class="status">${status}</div><div class="desc">« ${z.desc} »</div><div class="req" style="font-size:11px;color:var(--text-faint);">Niveau monstres : ${z.levelMin}-${z.levelMax}</div>${req}</div>`;
  }).join('');
  list.querySelectorAll('.zone-list-item').forEach(div=>{
    div.addEventListener('click',()=>{
      const zid=div.dataset.zone;
      if(div.classList.contains('locked')){showToast('🔒 Zone verrouillée');return;}
      if(zid===state.player.currentZone){showToast('⭐ Vous êtes déjà ici');return;}
      travelToZone(zid);
    });
  });
  saveState();
  openModal('zoneTravelModal');
}

function travelToZone(zid){
  state.player.currentZone=zid;
  // Boss en cours est remis à zéro lors du voyage
  state.boss.current=null;
  saveState();
  closeModal('zoneTravelModal');
  renderAll();
  const z=getZoneById(zid);
  showToast(`🗺 Vous voyagez vers ${z.name}`);
}

function renderRegionalBoss(){
  const container=$('regionalBossSlot');if(!container)return;
  if(state.player.recovering){
    container.innerHTML=`<div class="regional-boss-card" style="border-color:var(--success);box-shadow:0 0 25px rgba(34,197,94,0.3);"><div class="title" style="color:var(--success);">⚕ Convalescence</div><div class="desc">Vous êtes affaibli après votre dernière défaite. Lancez une séance pour effectuer vos exercices de récupération et revenir avec 50% PV.</div></div>`;
    return;
  }
  const rb=getRegionalBossOfCurrentZone();
  if(!rb||state.player.level<rb.level-3){container.innerHTML='';return;}
  const color=RARITY_COLORS[rb.rarity]||RARITY_COLORS.legendary;
  container.innerHTML=`<div class="regional-boss-card"><div class="title">⭐ Boss régional ⭐</div><div class="name" style="color:${color}">${rb.name}</div><div class="meta">Niveau ${rb.level} · PV ${rb.hp_max} · Att ${rb.attack} · Déf ${rb.defense}</div><div class="desc">« ${rb.desc} »</div><button class="action" id="btnFightRegional">⚔ Affronter le boss régional</button></div>`;
  $('btnFightRegional').addEventListener('click',()=>{
    if(!confirm(`Affronter ${rb.name} (niveau ${rb.level}) ? C'est un combat unique. Vainqueur, vous débloquerez la zone suivante.`))return;
    startRegionalBossEncounter(rb.id);
  });
}

function startRegionalBossEncounter(bossId){
  const bd=allBosses().find(b=>b.id===bossId);
  if(!bd)return;
  state.boss.current={...bd,hp:bd.hp_max,_isRegionalEncounter:true};
  saveState();
  showView('pre-session');
}

/* DASHBOARD */
function renderAll(){tryUnlockZones();renderZoneBanner();renderRegionalBoss();renderHero();renderStats();renderEquipment();renderRecords();renderBoss();}
function renderHero(){
  $('heroName').textContent=(state.player.name||'Champion').toUpperCase();
  $('heroLevel').textContent=state.player.level;
  const hpMax=state.player.stats.constitution,hp=state.player.stats.hp_current;
  $('hpText').textContent=`${hp} / ${hpMax}`;
  $('hpBar').style.width=`${Math.max(0,Math.min(100,(hp/hpMax)*100))}%`;
  const xpNeeded=xpForNextLevel(state.player.level);
  $('xpText').textContent=`${state.player.xp} / ${xpNeeded}`;
  $('xpBar').style.width=`${Math.max(0,Math.min(100,(state.player.xp/xpNeeded)*100))}%`;
  // MP
  if($('mpText')){
    const mpMax=state.player.stats.mana||100;
    const mp=state.player.stats.mp_current||0;
    $('mpText').textContent=`${mp} / ${mpMax}`;
    $('mpBar').style.width=`${Math.max(0,Math.min(100,(mp/mpMax)*100))}%`;
  }
  if($('dashPotionCount'))$('dashPotionCount').textContent=state.player.potions;
  if($('dashEtherCount'))$('dashEtherCount').textContent=state.player.ethers;
  // Bouton "Commencer" change si convalescent
  const btnStart=$('btnStartSession');
  if(btnStart){
    if(state.player.recovering){btnStart.textContent='⚕ Récupérer';}
    else{btnStart.textContent='Commencer';}
  }
  if($('btnDrinkPotionDash')){
    const noPotion=state.player.potions<=0;
    const fullHp=state.player.stats.hp_current>=state.player.stats.constitution;
    $('btnDrinkPotionDash').disabled=noPotion||fullHp;
    $('btnDrinkPotionDash').style.opacity=(noPotion||fullHp)?'0.4':'1';
  }
  if($('btnDrinkEtherDash')){
    const noEther=state.player.ethers<=0;
    const fullMp=state.player.stats.mp_current>=state.player.stats.mana;
    $('btnDrinkEtherDash').disabled=noEther||fullMp;
    $('btnDrinkEtherDash').style.opacity=(noEther||fullMp)?'0.4':'1';
  }
}
function renderStats(){
  const bonus=computeEquipmentBonus();
  $('statForce').innerHTML=`${state.player.stats.force}${bonus.force?` <span class="stat-bonus">+${bonus.force}</span>`:''}`;
  $('statDefense').innerHTML=`${state.player.stats.defense}${bonus.defense?` <span class="stat-bonus">+${bonus.defense}</span>`:''}`;
  $('statAgility').innerHTML=`${state.player.stats.agility}${bonus.agility?` <span class="stat-bonus">+${bonus.agility}</span>`:''}`;
  $('statGold').textContent=state.player.gold;
}
function renderEquipment(){
  const grid=$('equipmentGrid');grid.innerHTML='';
  EQUIP_SLOTS.forEach(slot=>{
    const item=state.player.equipment[slot.key];
    const div=document.createElement('div');div.className='equip-slot';
    div.style.cursor='pointer';
    div.dataset.slot=slot.key;
    if(item){
      div.classList.add('filled',`rarity-${item.rarity||'common'}`);
      const color=RARITY_COLORS[item.rarity]||RARITY_COLORS.common;
      const fallback=FALLBACK_WEAPON[item.id]||FALLBACK_WEAPON.default;
      const iconHtml=item.icon?buildIconImg(item.icon,color,'equip-img',fallback):`<span class="equip-icon-emoji">${slot.icon}</span>`;
      div.innerHTML=`${iconHtml}<div class="equip-name">${item.name}${item.combLevel?' +'+item.combLevel:''}</div>`;
    }else{
      div.innerHTML=`<div class="equip-empty-icon">${slot.icon}</div><div class="equip-empty-label">${slot.label}</div>`;
    }
    div.addEventListener('click',()=>openEquipPicker(slot.key));
    grid.appendChild(div);
  });
}

function openEquipPicker(slotKey){
  const slot=EQUIP_SLOTS.find(s=>s.key===slotKey);
  $('equipPickerTitle').textContent=`Équiper : ${slot.label}`;
  $('equipPickerIcon').textContent=slot.icon;
  $('equipPickerSubtitle').textContent=`Choisis l'arme à placer dans ce slot.`;
  // Currently equipped
  const cur=state.player.equipment[slotKey];
  if(cur){
    const color=RARITY_COLORS[cur.rarity];
    const fb=FALLBACK_WEAPON[cur.id]||FALLBACK_WEAPON.default;
    const iconHtml=`<img src="${iconUrl(cur.icon,color)}" style="width:36px;height:36px;" alt="" onerror="this.outerHTML='<span style=&quot;font-size:30px;&quot;>${fb}</span>'">`;
    const eff=getEffectiveStats(cur);
    const stats=Object.entries(eff).map(([k,v])=>`+${v} ${({force:'F',defense:'D',agility:'A',constitution:'PV'})[k]||k}`).join(' · ');
    $('equipPickerCurrent').innerHTML=`<div class="section-label"><span>Actuellement équipé</span></div><div class="shop-item"><div class="shop-icon" style="border:2px solid ${color}">${iconHtml}</div><div class="shop-info"><div class="shop-name" style="color:${color}">${cur.name}${cur.combLevel?' +'+cur.combLevel:''}</div><div class="shop-desc">${stats}</div></div><button class="shop-buy" id="equipPickerUnequip" style="background:rgba(196,30,58,0.2);color:var(--blood-bright);border:1px solid var(--blood-bright);">📤 Retirer</button></div>`;
    setTimeout(()=>{$('equipPickerUnequip').addEventListener('click',()=>{unequipItem(slotKey);closeModal('equipPickerModal');renderAll();showToast('📤 Objet déséquipé');});},0);
  }else{
    $('equipPickerCurrent').innerHTML=`<div class="empty-state" style="padding:14px;font-size:12px;">Aucun objet équipé sur ce slot.</div>`;
  }
  // Available items
  const compatible=state.player.weapons.filter(w=>w.slot===slotKey);
  if(compatible.length===0){
    $('equipPickerList').innerHTML=`<div class="empty-state" style="padding:14px;font-size:12px;">Aucune arme compatible dans ton sac.<br><small>Visite le ⚒ Forgeron pour en forger.</small></div>`;
  }else{
    $('equipPickerList').innerHTML=compatible.map((w,i)=>{
      const color=RARITY_COLORS[w.rarity];
      const fb=FALLBACK_WEAPON[w.id]||FALLBACK_WEAPON.default;
      const iconHtml=`<img src="${iconUrl(w.icon,color)}" style="width:36px;height:36px;" alt="" onerror="this.outerHTML='<span style=&quot;font-size:30px;&quot;>${fb}</span>'">`;
      const eff=getEffectiveStats(w);
      const stats=Object.entries(eff).map(([k,v])=>`+${v} ${({force:'F',defense:'D',agility:'A',constitution:'PV'})[k]||k}`).join(' · ');
      return `<div class="shop-item" data-pick-uid="${w.uid}"><div class="shop-icon" style="border:2px solid ${color}">${iconHtml}</div><div class="shop-info"><div class="shop-name" style="color:${color}">${w.name}${w.combLevel?' +'+w.combLevel:''}</div><div class="shop-desc">${stats}</div></div><button class="shop-buy">⚔ Équiper</button></div>`;
    }).join('');
    $('equipPickerList').querySelectorAll('[data-pick-uid]').forEach(div=>{
      div.addEventListener('click',()=>{
        equipItem(div.dataset.pickUid);closeModal('equipPickerModal');renderAll();showToast('⚔ Objet équipé');
      });
    });
  }
  openModal('equipPickerModal');
}
function renderRecords(){
  const container=$('recordsContainer');
  const records=state.player.records||{};
  const keys=Object.keys(records);
  if(keys.length===0){container.innerHTML=`<div class="empty-state"><span class="icon">🏆</span>Aucun record encore.<br><small>Battez vos limites pour gagner +5 dégâts permanents.</small></div>`;return;}
  container.innerHTML=keys.map(k=>{
    const ex=allExercises().find(e=>e.id===k);
    const label=ex?ex.name:k;
    const bonus=state.player.records_bonus[k]||0;
    return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span style="color:var(--text-dim);">${label}${bonus?` <small style="color:var(--rarity-rare);">+${bonus} dég.</small>`:''}</span><span style="color:var(--gold);font-family:'Cinzel',serif;font-weight:700;">${records[k]} kg</span></div>`;
  }).join('');
}
function renderBoss(){
  const container=$('bossContainer');
  if(!state.boss.current){container.innerHTML=`<div class="empty-state"><span class="icon">🐉</span>Aucun adversaire à l'horizon.<br><small>Lancez une séance pour faire émerger un boss.</small></div>`;return;}
  const b=state.boss.current;
  const hpPct=Math.max(0,Math.min(100,(b.hp/b.hp_max)*100));
  const color=RARITY_COLORS[b.rarity]||RARITY_COLORS.common;
  const fallback=FALLBACK_BOSS[b.id]||FALLBACK_BOSS.default;
  const iconHtml=buildIconImg(b.icon,color,'boss-img',fallback);
  const damageNote=b.hp<b.hp_max?`<div style="font-size:11px;color:var(--blood-bright);margin-top:6px;">⚔ Déjà blessé (${b.hp_max-b.hp} dégâts encaissés)</div>`:'';
  const typeTag=`<span class="type-tag ${TYPE_CSS[b.type]}">${TYPE_ICON[b.type]} ${TYPE_LABEL[b.type]}</span>`;
  container.innerHTML=`<div class="boss-display"><div class="boss-portrait rarity-${b.rarity}">${iconHtml}</div><div class="boss-name rarity-${b.rarity}">${b.name}</div><div class="boss-meta">Niveau ${b.level} · <span class="rarity-tag" style="color:${color}">${rarityLabel(b.rarity)}</span> · ${typeTag} ${b.element?elementTag(b.element):''}</div><div class="boss-hp"><div class="bar-label" style="justify-content:center;gap:8px;"><span>❤️ ${b.hp} / ${b.hp_max}</span></div><div class="bar"><div class="bar-fill hp" style="width:${hpPct}%"></div></div></div><div class="boss-desc">« ${b.desc} »</div>${damageNote}<div class="boss-rewards"><span class="reward">⚔️ ${b.attack}</span><span class="reward">🛡 ${b.defense}</span><span class="reward">💰 ${b.gold}</span><span class="reward">✨ ${b.xp} XP</span></div></div>`;
}

/* PRE-SESSION */
function renderPreSessionView(){
  let boss=state.boss.current;
  if(!boss){const pick=pickBossForLevel(state.player.level);boss={...pick,hp:pick.hp_max};state.boss.current=boss;saveState();}
  const tier=getDifficultyTier(boss.level);
  const proposed=generateProposedExercises(boss);
  const counterT=COUNTER_TYPE[boss.type];
  const color=RARITY_COLORS[boss.rarity]||RARITY_COLORS.common;
  const fallback=FALLBACK_BOSS[boss.id]||FALLBACK_BOSS.default;
  const iconHtml=`<img src="${iconUrl(boss.icon,color)}" alt="" onerror="this.outerHTML='<span class=&quot;boss-emoji&quot;>${fallback}</span>'">`;
  const exHtml=proposed.map(ex=>{
    const isGood=isGoodMatchup(ex.type,boss.type);
    const recordBonus=state.player.records_bonus[ex.id]||0;
    const unitLabel=ex.unit==='seconds'?'sec':'reps';
    const suggestedVol=ex.unit==='seconds'?tier.seconds:tier.reps;
    return `<div class="exercise-card ${isGood?'good-matchup':''}"><div class="exercise-icon">${TYPE_ICON[ex.type]}</div><div class="exercise-info"><div class="exercise-name">${ex.name} <span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span> ${isGood?'<span class="matchup-good">🟢 +50%</span>':''}</div><div class="exercise-meta">${ex.baseDamage}${recordBonus?'+'+recordBonus:''} dégâts · ${tier.sets}×${suggestedVol} ${unitLabel} suggéré${ex.hasWeight?' · 🏋':''}</div></div></div>`;
  }).join('');
  $('preSessionContent').innerHTML=`<div class="combat-banner"><div class="combat-boss-row"><div class="combat-boss-portrait-mid rarity-${boss.rarity}">${iconHtml}</div><div class="combat-boss-info"><div class="name" style="color:${color}">${boss.name}</div><div class="meta">Niveau ${boss.level} · ${rarityLabel(boss.rarity)} · <span class="type-tag ${TYPE_CSS[boss.type]}">${TYPE_ICON[boss.type]} ${TYPE_LABEL[boss.type]}</span></div><div class="bar"><div class="bar-fill hp" style="width:${(boss.hp/boss.hp_max)*100}%"></div></div><div style="font-size:10px;color:var(--text-dim);margin-top:4px;">❤️ ${boss.hp} / ${boss.hp_max} · ⚔ ${boss.attack} · 🛡 ${boss.defense}</div></div></div><div style="font-size:12px;color:var(--text-dim);font-style:italic;text-align:center;padding-top:10px;border-top:1px dashed var(--border);">« ${boss.desc} »</div></div><div style="background:rgba(34,197,94,0.1);border:1px solid var(--success);border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;color:var(--text-dim);text-align:center;">💡 Ce boss craint les exercices de type <strong style="color:var(--success);">${TYPE_ICON[counterT]} ${TYPE_LABEL[counterT]}</strong> (+50% dégâts)</div><div class="section-label"><span>Programme proposé · ${tier.numEx} exercices</span></div>${exHtml}`;
  $('btnLaunchSession').dataset.proposed=JSON.stringify(proposed.map(e=>e.id));
  $('btnLaunchSession').dataset.bossId=boss.id;
}

/* SESSION */
function startSession(exerciseIds,bossId){
  if(!state.boss.current||state.boss.current.id!==bossId){
    const bd=allBosses().find(b=>b.id===bossId);
    state.boss.current={...bd,hp:bd.hp_max};
  }
  state.player.stats.hp_current=state.player.stats.constitution;
  const tier=getDifficultyTier(state.boss.current.level);
  // heroSkillUsed est par adversaire : on l'initialise sur le boss s'il n'existe pas
  if(typeof state.boss.current.heroSkillUsed!=='boolean')state.boss.current.heroSkillUsed=false;
  state.session_current={
    startedAt:new Date().toISOString(),
    exercises:exerciseIds.map(id=>{
      const ex=allExercises().find(e=>e.id===id);
      return{id,name:ex.name,type:ex.type,baseDamage:ex.baseDamage,group:ex.group,hasWeight:ex.hasWeight,unit:ex.unit||'reps',completed:false,sets:0,reps:0,weight:0,damageDealt:0,recordBeaten:false};
    }),
    totalDamage:0,totalReceived:0,xpEarned:0,
    suggestedSets:tier.sets,suggestedReps:tier.reps,suggestedSec:tier.seconds
  };
  saveState();showView('session');
}

function renderSessionView(){
  if(!state.session_current){showView('dashboard');return;}
  if(state.session_current.isRecovery){return renderRecoverySession();}
  if(!state.boss.current){showView('dashboard');return;}
  const b=state.boss.current;
  const color=RARITY_COLORS[b.rarity]||RARITY_COLORS.common;
  const fallback=FALLBACK_BOSS[b.id]||FALLBACK_BOSS.default;
  const hpPct=(b.hp/b.hp_max)*100;
  const playerHpPct=(state.player.stats.hp_current/state.player.stats.constitution)*100;
  const skillUsed=!!(state.boss.current&&state.boss.current.heroSkillUsed);
  // Token déjà utilisé ce tour : frappe armée OU sort lancé
  const tokenUsed=!!(state.session_current.skillArmed||state.session_current.spellUsedThisTurn);
  const mpMax=state.player.stats.mana||100,mp=state.player.stats.mp_current||0;
  const mpPct=(mp/mpMax)*100;
  // Sorts équipés
  const equippedSpells=(state.player.equippedSpells||[]).map(id=>id?getSpellById(id):null);
  const spellsUsedOnce=state.boss.current.spellsUsedThisFight||{};
  const spellButtons=equippedSpells.map((s,i)=>{
    if(!s)return `<button class="action-btn" disabled style="opacity:0.3;"><div class="ico">·</div>Vide<div class="sub">Slot ${i+1}</div></button>`;
    const noMana=mp<s.manaCost;
    const usedOnce=s.oncePerCombat&&spellsUsedOnce[s.id];
    const disabled=tokenUsed||noMana||usedOnce;
    const elIcon=ELEMENTS[s.element]?ELEMENTS[s.element].icon:'🪄';
    const subLine=usedOnce?'1×/combat utilisé':(noMana?`Manque ${s.manaCost-mp} MP`:`${s.manaCost} MP`);
    return `<button class="action-btn spell" data-spell-idx="${i}" ${disabled?'disabled':''} style="border-color:${ELEMENTS[s.element]?ELEMENTS[s.element].color:'var(--gold)'};"><div class="ico">${elIcon}</div>${s.name}<div class="sub">${subLine}</div></button>`;
  }).join('');
  $('combatBanner').innerHTML=`<div class="combat-boss-row"><div class="combat-boss-portrait-mid rarity-${b.rarity}" id="bossPortraitInBanner"><img src="${iconUrl(b.icon,color)}" alt="" onerror="this.outerHTML='<span class=&quot;boss-emoji&quot;>${fallback}</span>'"></div><div class="combat-boss-info"><div class="name" style="color:${color}">${b.name}</div><div class="meta">Niveau ${b.level} · <span class="type-tag ${TYPE_CSS[b.type]}">${TYPE_ICON[b.type]} ${TYPE_LABEL[b.type]}</span> ${b.element?elementTag(b.element):''}</div><div class="bar"><div class="bar-fill hp" id="bossHpBar" style="width:${hpPct}%"></div></div><div style="font-size:10px;color:var(--text-dim);margin-top:4px;" id="bossHpText">❤️ ${b.hp} / ${b.hp_max}</div></div></div><div class="combat-player-row"><div class="label"><span>❤️ ${state.player.name||'Champion'}</span><span id="playerHpText">${state.player.stats.hp_current} / ${state.player.stats.constitution}</span></div><div class="bar"><div class="bar-fill hp" id="playerHpBar" style="width:${playerHpPct}%"></div></div><div class="label" style="margin-top:6px;"><span>💧 Mana</span><span id="playerMpText">${mp} / ${mpMax}</span></div><div class="bar"><div class="bar-fill mp" id="playerMpBar" style="width:${mpPct}%"></div></div><div class="combat-actions-inline" style="grid-template-columns:1fr 1fr;margin-top:10px;"><button class="action-btn skill ${tokenUsed||skillUsed?'':'active'}" id="actSkill" ${skillUsed||tokenUsed?'disabled':''}><div class="ico">⚡</div>Frappe Héroïque<div class="sub">${skillUsed?'Déjà utilisée':(tokenUsed?'Tour pris':'×2 sur le prochain coup')}</div></button><button class="action-btn potion" id="actPotion" ${state.player.potions<=0?'disabled':''}><div class="ico">🧪</div>Potion<div class="sub">+50 PV (${state.player.potions} restantes)</div></button></div><div class="combat-actions-inline" style="grid-template-columns:repeat(3,1fr);margin-top:6px;">${spellButtons}</div></div>`;
  const remaining=state.session_current.exercises.filter(e=>!e.completed).length;
  const total=state.session_current.exercises.length;
  $('exerciseCount').textContent=`${total-remaining} / ${total} fait${total-remaining>1?'s':''}`;
  const list=$('sessionExerciseList');
  list.innerHTML=state.session_current.exercises.map(ex=>{
    const recordBonus=state.player.records_bonus[ex.id]||0;
    const isGood=isGoodMatchup(ex.type,b.type);
    const matchupBadge=isGood?'<span class="matchup-good">🟢 +50%</span>':'';
    const unitLabel=ex.unit==='seconds'?'sec':'reps';
    return `<div class="exercise-card ${ex.completed?'completed':''} ${isGood&&!ex.completed?'good-matchup':''}" data-id="${ex.id}"><div class="exercise-icon">${ex.completed?'✓':TYPE_ICON[ex.type]}</div><div class="exercise-info"><div class="exercise-name">${ex.name} <span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span> ${matchupBadge}</div><div class="exercise-meta">${ex.completed?`${ex.sets}×${ex.reps} ${unitLabel}${ex.hasWeight?' @ '+ex.weight+'kg':''} · ${ex.damageDealt} dégâts${ex.recordBeaten?' · 🏆':''}`:`${ex.baseDamage}${recordBonus?'+'+recordBonus:''} dégâts · ${unitLabel}${ex.hasWeight?' · 🏋':''}`}</div></div><div class="exercise-arrow">${ex.completed?'':'›'}</div></div>`;
  }).join('');
  list.querySelectorAll('.exercise-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const id=card.dataset.id;
      const ex=state.session_current.exercises.find(e=>e.id===id);
      if(!ex||ex.completed)return;
      openExerciseModal(id);
    });
  });
  $('actSkill').addEventListener('click',()=>{
    if(state.boss.current&&state.boss.current.heroSkillUsed)return;
    if(state.session_current.skillArmed||state.session_current.spellUsedThisTurn){showToast('⚠ Action déjà utilisée ce tour');return;}
    showToast('⚡ Frappe Héroïque chargée ! Le prochain exercice infligera ×2 dégâts.',3000);
    state.session_current.skillArmed=true;saveState();
    renderSessionView();
  });
  // Listeners sorts
  document.querySelectorAll('[data-spell-idx]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const idx=parseInt(btn.dataset.spellIdx);
      castSpell(idx);
    });
  });
  $('actPotion').addEventListener('click',()=>{
    if(state.player.potions<=0){showToast('⚠ Plus de potions');return;}
    state.player.potions--;
    const before=state.player.stats.hp_current;
    state.player.stats.hp_current=Math.min(state.player.stats.constitution,before+50);
    const heal=state.player.stats.hp_current-before;
    showFloatingDmg(`+${heal}`,'heal','playerHpBar');
    showToast(`🧪 Potion bue : +${heal} PV`);
    saveState();renderSessionView();
  });
  // Listener sorts (réactiver)
  document.querySelectorAll('#combatBanner [data-spell-idx]').forEach(btn=>{
    btn.addEventListener('click',()=>castSpell(parseInt(btn.dataset.spellIdx)));
  });
}

function openExerciseModal(exerciseId){
  currentExerciseId=exerciseId;
  const ex=allExercises().find(e=>e.id===exerciseId);
  const b=state.boss.current;
  $('exModalName').textContent=ex.name;
  $('exModalIcon').textContent=TYPE_ICON[ex.type];
  $('exModalDesc').textContent=ex.desc;
  const isGood=isGoodMatchup(ex.type,b.type);
  $('exModalMatchup').innerHTML=`<span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span>${isGood?' <span class="matchup-good">🟢 Bon matchup +50%</span>':''}`;
  $('exSets').value=state.session_current.suggestedSets||3;
  if(ex.unit==='seconds'){
    $('exRepsLabel').textContent='Secondes';
    $('exReps').value=state.session_current.suggestedSec||30;
  }else{
    $('exRepsLabel').textContent='Répétitions';
    $('exReps').value=state.session_current.suggestedReps||10;
  }
  $('exWeight').value=state.player.records[exerciseId]||0;
  $('exWeightContainer').style.display=ex.hasWeight?'':'none';
  updateDamagePreview();openModal('exerciseModal');
}
function updateDamagePreview(){
  if(!currentExerciseId)return;
  const ex=allExercises().find(e=>e.id===currentExerciseId);
  const sets=parseInt($('exSets').value)||0;
  const repsOrSec=parseInt($('exReps').value)||0;
  const weight=parseFloat($('exWeight').value)||0;
  const skillArmed=state.session_current&&state.session_current.skillArmed;
  const dmg=computeExerciseDamage(currentExerciseId,sets,repsOrSec,weight,{skill:skillArmed});
  $('damagePreviewValue').textContent=dmg;
  const isGood=isGoodMatchup(ex.type,state.boss.current.type);
  let note='';
  if(isGood)note='🟢 Bon matchup actif (+50%)';
  if(skillArmed)note+=(note?'<br>':'')+'⚡ Frappe Héroïque armée (×2)';
  $('matchupNote').innerHTML=note;
}

function showFloatingDmg(text,type,anchorId){
  const anchor=anchorId?$(anchorId):$('bossPortraitInBanner');
  if(!anchor)return;
  const banner=$('combatBanner');if(!banner)return;
  const rect=anchor.getBoundingClientRect();
  const bRect=banner.getBoundingClientRect();
  const div=document.createElement('div');
  div.className=`floating-dmg ${type}`;
  div.textContent=text;
  div.style.left=`${rect.left-bRect.left+rect.width/2}px`;
  div.style.top=`${rect.top-bRect.top+rect.height/2-20}px`;
  banner.appendChild(div);
  setTimeout(()=>div.remove(),1300);
}
function flashBossPortrait(isCrit=false){
  const portrait=$('bossPortraitInBanner');if(!portrait)return;
  portrait.classList.remove('hit','crit');
  void portrait.offsetWidth;
  portrait.classList.add(isCrit?'crit':'hit');
}
function shakeScreen(){
  document.body.classList.remove('shaking');
  void document.body.offsetWidth;
  document.body.classList.add('shaking');
  setTimeout(()=>document.body.classList.remove('shaking'),400);
}

function confirmExerciseSubmission(){
  if(!currentExerciseId||!state.session_current)return;
  // Mode récupération
  if(state.session_current.isRecovery){
    const sets=parseInt($('exSets').value);
    const reps=parseInt($('exReps').value);
    if(!sets||sets<1||!reps||reps<1){showToast('⚠ Indique au moins 1 série et 1 unité');return;}
    const ex=state.session_current.exercises.find(e=>e.id===currentExerciseId);
    ex.completed=true;ex.sets=sets;ex.reps=reps;
    closeModal('exerciseModal');
    showToast('⚕ Exercice de récupération validé',2000);
    saveState();
    // Si tous faits → fin de convalescence
    if(state.session_current.exercises.every(e=>e.completed)){
      state.player.recovering=false;
      state.player.stats.hp_current=Math.floor(state.player.stats.constitution*0.5);
      state.player.stats.mp_current=Math.floor(state.player.stats.mana*0.5);
      state.session_current=null;
      saveState();
      $('summaryLevelUp').innerHTML='';
      $('summaryContent').innerHTML=`<div style="text-align:center;padding:14px;background:rgba(34,197,94,0.15);border:1px solid var(--success);border-radius:8px;color:var(--success);font-family:'Cinzel',serif;font-weight:700;margin-bottom:12px;">⚕ Vous reprenez vos esprits !</div><div class="summary-stat"><span class="label">❤️ Vie restaurée</span><span class="value">${state.player.stats.hp_current} / ${state.player.stats.constitution}</span></div><div class="summary-stat"><span class="label">💧 Mana restaurée</span><span class="value">${state.player.stats.mp_current} / ${state.player.stats.mana}</span></div><div style="font-size:12px;color:var(--text-dim);margin-top:10px;text-align:center;font-style:italic;">Un nouvel adversaire vous attendra à la prochaine séance.</div>`;
      $('summarySubtitle').textContent='Le repos a porté ses fruits.';
      openModal('summaryModal');
      return;
    }
    renderSessionView();
    return;
  }
  const sets=parseInt($('exSets').value);
  const repsOrSec=parseInt($('exReps').value);
  const weight=parseFloat($('exWeight').value)||0;
  if(!sets||sets<1||!repsOrSec||repsOrSec<1){showToast('⚠ Indique au moins 1 série et 1 unité');return;}
  const ex=state.session_current.exercises.find(e=>e.id===currentExerciseId);
  const exData=allExercises().find(e=>e.id===currentExerciseId);
  let recordBeaten=false;
  if(exData.hasWeight&&weight>0){
    const prev=state.player.records[currentExerciseId]||0;
    if(weight>prev){state.player.records[currentExerciseId]=weight;state.player.records_bonus[currentExerciseId]=(state.player.records_bonus[currentExerciseId]||0)+5;recordBeaten=true;}
  }
  const bonus=computeEquipmentBonus();
  const totalSpeed=state.player.stats.agility+(bonus.agility||0);
  const critChance=Math.min(40,5+totalSpeed*0.5)/100;
  const isCrit=Math.random()<critChance;
  const skillUsed=!!state.session_current.skillArmed;
  let damage=computeExerciseDamage(currentExerciseId,sets,repsOrSec,weight,{skill:skillUsed});
  if(isCrit){
    // Multiplicateur de crit qui augmente avec la Vitesse (1.4 base + 0.005 par point, max 2.5)
    const critMult=Math.min(2.5,1.4+totalSpeed*0.005);
    damage=Math.round(damage*critMult);
  }
  ex.completed=true;ex.sets=sets;ex.reps=repsOrSec;ex.weight=weight;
  ex.damageDealt=damage;ex.recordBeaten=recordBeaten;
  state.boss.current.hp=Math.max(0,state.boss.current.hp-damage);
  state.session_current.totalDamage+=damage;
  state.session_current.xpEarned+=30;
  if(skillUsed){state.boss.current.heroSkillUsed=true;state.session_current.skillArmed=false;}
  // Reset du token de tour (sort/frappe par tour)
  state.session_current.spellUsedThisTurn=false;
  closeModal('exerciseModal');
  flashBossPortrait(isCrit);
  showFloatingDmg(`-${damage}${isCrit?' !':''}`,isCrit?'player-crit':'player-dmg');
  let msg=`⚔ ${ex.name} ! <strong>+${damage} dégâts</strong>`;
  if(isCrit)msg+=' <strong>(CRITIQUE)</strong>';
  if(skillUsed)msg+=' <strong>⚡</strong>';
  if(recordBeaten)msg+=`<br>🏆 <strong>RECORD BATTU !</strong> +5 dégâts permanents`;
  showToast(msg,3500);
  saveState();
  const hpPct=(state.boss.current.hp/state.boss.current.hp_max)*100;
  if($('bossHpBar'))$('bossHpBar').style.width=`${hpPct}%`;
  if($('bossHpText'))$('bossHpText').textContent=`❤️ ${state.boss.current.hp} / ${state.boss.current.hp_max}`;
  if(state.boss.current.hp<=0){setTimeout(()=>victory(),800);return;}
  setTimeout(()=>{
    const dmg=computeBossCounterAttack(state.boss.current);
    state.player.stats.hp_current=Math.max(0,state.player.stats.hp_current-dmg);
    state.session_current.totalReceived+=dmg;
    saveState();shakeScreen();
    showFloatingDmg(`-${dmg}`,'boss-dmg','playerHpBar');
    showToast(`💥 ${state.boss.current.name} riposte ! −${dmg} PV`,2000);
    const playerHpPct=(state.player.stats.hp_current/state.player.stats.constitution)*100;
    if($('playerHpBar'))$('playerHpBar').style.width=`${playerHpPct}%`;
    if($('playerHpText'))$('playerHpText').textContent=`${state.player.stats.hp_current} / ${state.player.stats.constitution}`;
    if(state.player.stats.hp_current<=0){setTimeout(()=>defeat(),800);return;}
    // Régénération auto si tous les exercices sont faits et boss vivant
    if(state.session_current.exercises.every(e=>e.completed)&&state.boss.current&&state.boss.current.hp>0){
      regenerateExerciseSet();
    }
    renderSessionView();
  },700);
}

function renderRecoverySession(){
  $('combatBanner').innerHTML=`<div style="text-align:center;padding:14px;background:linear-gradient(135deg,rgba(34,197,94,0.15) 0%,var(--bg-mid) 100%);border:2px solid var(--success);border-radius:12px;"><div style="font-family:'Cinzel',serif;font-weight:700;font-size:16px;color:var(--success);margin-bottom:6px;">⚕ Convalescence</div><div style="font-size:12px;color:var(--text-dim);">Termine ces ${state.session_current.exercises.length} exercices pour reprendre la quête à <strong style="color:var(--gold-bright);">50% PV</strong>.</div></div>`;
  const remaining=state.session_current.exercises.filter(e=>!e.completed).length;
  const total=state.session_current.exercises.length;
  $('exerciseCount').textContent=`${total-remaining} / ${total} fait${total-remaining>1?'s':''}`;
  const list=$('sessionExerciseList');
  list.innerHTML=state.session_current.exercises.map(ex=>{
    const unitLabel=ex.unit==='seconds'?'sec':'reps';
    return `<div class="exercise-card ${ex.completed?'completed':''}" data-id="${ex.id}"><div class="exercise-icon">${ex.completed?'✓':TYPE_ICON[ex.type]}</div><div class="exercise-info"><div class="exercise-name">${ex.name} <span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span></div><div class="exercise-meta">${ex.completed?`${ex.sets}×${ex.reps} ${unitLabel}`:`Récupération douce · ${unitLabel}`}</div></div><div class="exercise-arrow">${ex.completed?'':'›'}</div></div>`;
  }).join('');
  list.querySelectorAll('.exercise-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const id=card.dataset.id;
      const ex=state.session_current.exercises.find(e=>e.id===id);
      if(!ex||ex.completed)return;
      openExerciseModalRecovery(id);
    });
  });
}

function openExerciseModalRecovery(exerciseId){
  currentExerciseId=exerciseId;
  const ex=allExercises().find(e=>e.id===exerciseId);
  $('exModalName').textContent=ex.name;
  $('exModalIcon').textContent=TYPE_ICON[ex.type];
  $('exModalDesc').textContent=ex.desc;
  $('exModalMatchup').innerHTML=`<span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span> <span style="color:var(--success);font-size:11px;font-weight:700;">⚕ Convalescence</span>`;
  $('exSets').value=2;
  if(ex.unit==='seconds'){$('exRepsLabel').textContent='Secondes';$('exReps').value=20;}
  else{$('exRepsLabel').textContent='Répétitions';$('exReps').value=8;}
  $('exWeight').value=0;
  $('exWeightContainer').style.display=ex.hasWeight?'':'none';
  $('damagePreviewValue').textContent='—';
  $('matchupNote').innerHTML='<span style="color:var(--success);">Aucun dégât (récupération)</span>';
  openModal('exerciseModal');
}

function castSpell(slotIdx){
  if(!state.session_current||!state.boss.current)return;
  if(state.session_current.skillArmed||state.session_current.spellUsedThisTurn){showToast('⚠ Action déjà utilisée ce tour');return;}
  const spellId=state.player.equippedSpells[slotIdx];
  if(!spellId)return;
  const spell=getSpellById(spellId);
  if(!spell){showToast('⚠ Sort introuvable');return;}
  const mp=state.player.stats.mp_current||0;
  if(mp<spell.manaCost){showToast(`⚠ Manque ${spell.manaCost-mp} MP`);return;}
  if(!state.boss.current.spellsUsedThisFight)state.boss.current.spellsUsedThisFight={};
  if(spell.oncePerCombat&&state.boss.current.spellsUsedThisFight[spell.id]){showToast('⚠ Sort déjà utilisé ce combat');return;}
  // Consomme MP
  state.player.stats.mp_current=mp-spell.manaCost;
  // Marque le tour comme consommé
  state.session_current.spellUsedThisTurn=true;
  if(spell.oncePerCombat)state.boss.current.spellsUsedThisFight[spell.id]=true;
  // Applique l'effet
  if(spell.effect==='damage_flat'){
    let dmg=spell.value||20;
    // Matchup élémentaire sort vs boss
    if(spell.element&&state.boss.current.element){
      dmg=Math.round(dmg*elementMultiplier(spell.element,state.boss.current.element));
    }
    state.boss.current.hp=Math.max(0,state.boss.current.hp-dmg);
    flashBossPortrait(false);
    showFloatingDmg(`-${dmg}`,'player-dmg');
    showToast(`✨ ${spell.name} ! <strong>+${dmg} dégâts</strong>`,3000);
    if(state.boss.current.hp<=0){saveState();setTimeout(()=>victory(),800);return;}
  }else if(spell.effect==='heal_flat'){
    const before=state.player.stats.hp_current;
    state.player.stats.hp_current=Math.min(state.player.stats.constitution,before+spell.value);
    const heal=state.player.stats.hp_current-before;
    showFloatingDmg(`+${heal}`,'heal','playerHpBar');
    showToast(`✨ ${spell.name} ! <strong>+${heal} PV</strong>`,3000);
  }
  saveState();
  renderSessionView();
}

function regenerateExerciseSet(){
  if(!state.boss.current||!state.session_current)return;
  const proposed=generateProposedExercises(state.boss.current);
  state.session_current.exercises=proposed.map(ex=>({
    id:ex.id,name:ex.name,type:ex.type,baseDamage:ex.baseDamage,group:ex.group,hasWeight:ex.hasWeight,unit:ex.unit||'reps',
    completed:false,sets:0,reps:0,weight:0,damageDealt:0,recordBeaten:false
  }));
  saveState();
  showToast('🌀 Nouveau set d\'exercices généré ! Le boss tient encore.',3500);
}

function finishSession(){
  if(!state.session_current)return;
  const completed=state.session_current.exercises.filter(e=>e.completed);
  if(completed.length===0){if(!confirm('Aucun exercice complété. Abandonner la séance ?'))return;state.session_current=null;saveState();showView('dashboard');return;}
  const xpGained=state.session_current.xpEarned+20;
  const levelsGained=applyXp(xpGained);
  state.sessions.push({date:state.session_current.startedAt,exercises:completed.map(e=>({id:e.id,sets:e.sets,reps:e.reps,weight:e.weight,damageDealt:e.damageDealt})),totalDamage:state.session_current.totalDamage,totalReceived:state.session_current.totalReceived,xpEarned:xpGained,bossId:state.boss.current.id,bossDefeated:false});
  state.meta.total_sessions+=1;
  if(state.sessions.length>20)state.sessions.shift();
  const remainingBoss=state.boss.current?{...state.boss.current}:null;
  const summary={completed:completed.length,total:state.session_current.exercises.length,totalDamage:state.session_current.totalDamage,totalReceived:state.session_current.totalReceived,xpGained,levelsGained,records:completed.filter(e=>e.recordBeaten).map(e=>e.name),remainingBoss};
  state.session_current=null;
  // Boss persistant : on le garde tel quel avec ses PV. Reset uniquement à victoire ou défaite.
  saveState();
  showSummaryModal(summary);
}
function showSummaryModal(s){
  const b=s.remainingBoss;
  let levelUpHtml=s.levelsGained>0?`<div class="levelup-banner"><div class="title">🎉 Niveau supérieur !</div><div class="sub">Vous êtes maintenant niveau ${state.player.level}<br><small>+5 Force, +3 Défense, +2 Vitesse, +10 PV, +10 MP</small></div></div>`:'';
  const recordsLine=s.records.length?`<div class="summary-stat"><span class="label">🏆 Records battus</span><span class="value">${s.records.length}</span></div>`:'';
  const bossStatus=b?`<div style="text-align:center;padding:12px;background:rgba(196,30,58,0.1);border:1px solid var(--blood);border-radius:8px;margin-bottom:14px;color:var(--blood-bright);font-size:12px;">⚔ ${b.name} reste à terre, blessé (${b.hp}/${b.hp_max} PV). Reprenez la séance plus tard pour l'achever.</div>`:'';
  $('summaryLevelUp').innerHTML=levelUpHtml;
  $('summaryContent').innerHTML=`${bossStatus}<div class="summary-stat big"><span class="label">⚔ Dégâts infligés</span><span class="value">${s.totalDamage}</span></div><div class="summary-stat"><span class="label">💔 Dégâts reçus</span><span class="value">${s.totalReceived}</span></div><div class="summary-stat"><span class="label">✅ Exercices complétés</span><span class="value">${s.completed} / ${s.total}</span></div><div class="summary-stat"><span class="label">✨ Expérience gagnée</span><span class="value">+${s.xpGained}</span></div>${recordsLine}`;
  $('summarySubtitle').textContent='Vous reprenez votre souffle après le combat.';
  openModal('summaryModal');
}

/* LOOT - matériaux et ingrédients */
function rollDrops(boss){
  const drops=[];
  (boss.drops||[]).forEach(d=>{
    if(Math.random()<d.chance){
      const qty=randInt(d.qty[0],d.qty[1]);
      drops.push({type:d.type,id:d.id,qty});
    }
  });
  return drops;
}

function victory(){
  const b=state.boss.current;
  const isRegional=!!b.isRegionalBoss;
  const xpFromSession=state.session_current?(state.session_current.xpEarned+30):0;
  const goldMult=isRegional?1.5:1;
  state.player.gold+=Math.round(b.gold*goldMult);
  const totalXp=Math.round((b.xp+xpFromSession)*(isRegional?1.5:1));
  const levelsGained=applyXp(totalXp);
  state.boss.defeated.push({id:b.id,date:new Date().toISOString()});
  state.meta.total_bosses+=1;state.meta.total_sessions+=1;
  // Boss régional : marquage + déblocage zone suivante
  let unlockedZone=null;
  if(isRegional&&!state.player.defeatedRegionalBosses.includes(b.id)){
    state.player.defeatedRegionalBosses.push(b.id);
    // Chercher la zone qui était bloquée par ce boss
    const newZone=allZones().find(z=>z.requiredRegionalBoss===b.id);
    if(newZone&&!state.player.unlockedZones.includes(newZone.id)){
      state.player.unlockedZones.push(newZone.id);
      unlockedZone=newZone;
    }
  }
  // Drop materials/ingredients (boss régional : qty x1.5)
  const drops=rollDrops(b);
  if(isRegional)drops.forEach(d=>{d.qty=Math.round(d.qty*1.5);});
  drops.forEach(d=>{
    if(d.type==='material')state.player.materials[d.id]=(state.player.materials[d.id]||0)+d.qty;
    else if(d.type==='ingredient')state.player.ingredients[d.id]=(state.player.ingredients[d.id]||0)+d.qty;
  });
  // Stocker pour modal
  state._lastVictory={isRegional,unlockedZone,goldGain:Math.round(b.gold*goldMult),xpGain:totalXp};
  if(state.session_current){
    const completed=state.session_current.exercises.filter(e=>e.completed);
    state.sessions.push({date:state.session_current.startedAt,exercises:completed.map(e=>({id:e.id,sets:e.sets,reps:e.reps,weight:e.weight,damageDealt:e.damageDealt})),totalDamage:state.session_current.totalDamage,totalReceived:state.session_current.totalReceived,xpEarned:totalXp,bossId:b.id,bossDefeated:true});
    if(state.sessions.length>20)state.sessions.shift();
  }
  // PV NON restaurés à la victoire (sauf level up géré via applyXp)
  state.boss.current=null;state.session_current=null;
  saveState();
  showVictoryModal(b,drops,levelsGained,totalXp);
}
function showVictoryModal(boss,drops,levelsGained,totalXp){
  let levelUpHtml=levelsGained>0?`<div class="levelup-banner"><div class="title">🎉 Niveau supérieur !</div><div class="sub">Vous êtes maintenant niveau ${state.player.level}<br><small>+5 Force, +3 Défense, +2 Agilité, +10 PV</small></div></div>`:'';
  let dropsHtml='';
  if(drops.length){
    dropsHtml=`<div class="section-label" style="margin-top:14px;"><span>Butin</span></div><div class="item-grid">`+drops.map(d=>{
      const data=d.type==='material'?allMaterials().find(m=>m.id===d.id):allIngredients().find(i=>i.id===d.id);
      if(!data)return '';
      const color=RARITY_COLORS[data.rarity];
      const fb=d.type==='material'?(FALLBACK_MAT[d.id]||FALLBACK_MAT.default):(FALLBACK_ING[d.id]||FALLBACK_ING.default);
      return `<div class="item-card rarity-${data.rarity}"><div class="qty-badge">×${d.qty}</div><img src="${iconUrl(data.icon,color)}" alt="" onerror="this.outerHTML='<span class=&quot;item-emoji&quot;>${fb}</span>'"><div class="item-name">${data.name}</div><div class="item-rarity-tag">${rarityLabel(data.rarity)}</div></div>`;
    }).join('')+`</div>`;
  }else{
    dropsHtml='<div style="text-align:center;font-size:12px;color:var(--text-faint);font-style:italic;margin-top:10px;">Aucun butin laissé par le boss cette fois.</div>';
  }
  $('victoryTitle').textContent=`${boss.name} VAINCU !`;
  const lv=state._lastVictory||{};
  let unlockedHtml='';
  if(lv.unlockedZone){
    unlockedHtml=`<div class="levelup-banner" style="border-color:var(--success);background:linear-gradient(135deg,rgba(34,197,94,0.2) 0%,rgba(168,85,247,0.1) 100%);"><div class="title" style="color:var(--success);">🗺 Nouvelle zone débloquée !</div><div class="sub">Vous pouvez désormais voyager vers <strong style="color:var(--gold-bright);">${lv.unlockedZone.name}</strong></div></div>`;
  }
  $('victorySubtitle').textContent=boss.isRegionalBoss?'⭐ Boss régional terrassé ! Sa puissance ne reviendra plus.':'La voie s\'ouvre devant vous.';
  $('victoryLevelUp').innerHTML=unlockedHtml+levelUpHtml;
  $('victoryContent').innerHTML=`<div class="summary-stat big"><span class="label">💰 Or gagné</span><span class="value">+${lv.goldGain||boss.gold}</span></div><div class="summary-stat"><span class="label">✨ Expérience totale</span><span class="value">+${lv.xpGain||totalXp}</span></div>${dropsHtml}`;
  openModal('victoryModal');
}
function defeat(){
  const bossName=state.boss.current?state.boss.current.name:'Le boss';
  state.boss.current=null;state.session_current=null;
  state.player.stats.hp_current=0;
  state.player.recovering=true;
  saveState();
  $('defeatContent').innerHTML=`${bossName} vous a terrassé. Vos forces sont brisées.<br><br>⚕ <strong>Vous êtes convalescent.</strong> Pour reprendre l'aventure, vous devez d'abord effectuer un <strong>set d'exercices de récupération</strong>. Vous reviendrez alors avec <strong>50% de vos PV</strong>.`;
  openModal('defeatModal');
}

/* INVENTORY HUB */
function renderInventoryView(){
  $('invGold').textContent=state.player.gold;
  $('invPotions').textContent=state.player.potions;
  document.querySelectorAll('#viewInventory .tab[data-tab]').forEach(t=>t.classList.toggle('active',t.dataset.tab===activeInvTab));
  $('tabInventory').style.display=activeInvTab==='inventory'?'block':'none';
  $('tabBlacksmith').style.display=activeInvTab==='blacksmith'?'block':'none';
  $('tabWitch').style.display=activeInvTab==='witch'?'block':'none';
  $('tabMerchant').style.display=activeInvTab==='merchant'?'block':'none';
  if(activeInvTab==='inventory')renderInventoryGrid();
  else if(activeInvTab==='blacksmith')renderBlacksmith();
  else if(activeInvTab==='witch')renderWitch();
  else if(activeInvTab==='merchant')renderMerchant();
}

function renderInventoryGrid(){
  const grid=$('inventoryGrid');
  let cells=[];
  // Armes équipées
  Object.entries(state.player.equipment).forEach(([slot,item])=>{
    if(item&&(invTypeFilter==='all'||invTypeFilter==='weapon'))
      cells.push({kind:'weapon',item:{...item,_equipped:true,_slot:slot}});
  });
  // Armes en sac
  if(invTypeFilter==='all'||invTypeFilter==='weapon'){
    state.player.weapons.forEach(it=>cells.push({kind:'weapon',item:it}));
  }
  // Matériaux
  if(invTypeFilter==='all'||invTypeFilter==='material'){
    Object.entries(state.player.materials).forEach(([id,qty])=>{
      if(qty>0){const data=allMaterials().find(m=>m.id===id);if(data)cells.push({kind:'material',item:{...data,qty}});}
    });
  }
  // Ingrédients
  if(invTypeFilter==='all'||invTypeFilter==='ingredient'){
    Object.entries(state.player.ingredients).forEach(([id,qty])=>{
      if(qty>0){const data=allIngredients().find(m=>m.id===id);if(data)cells.push({kind:'ingredient',item:{...data,qty}});}
    });
  }
  if(cells.length===0){grid.className='';grid.innerHTML=`<div class="empty-inventory"><span class="icon">🎒</span>Rien à voir ici.<br><small>Vainquez des boss pour collecter du butin.</small></div>`;return;}
  grid.className='item-grid';
  grid.innerHTML=cells.map((c,i)=>{
    const item=c.item;
    const color=RARITY_COLORS[item.rarity];
    let fallback;
    if(c.kind==='weapon')fallback=FALLBACK_WEAPON[item.id]||FALLBACK_WEAPON.default;
    else if(c.kind==='material')fallback=FALLBACK_MAT[item.id]||FALLBACK_MAT.default;
    else fallback=FALLBACK_ING[item.id]||FALLBACK_ING.default;
    const iconHtml=item.icon?`<img src="${iconUrl(item.icon,color)}" alt="" onerror="this.outerHTML='<span class=&quot;item-emoji&quot;>${fallback}</span>'">`:`<span class="item-emoji">${fallback}</span>`;
    const qtyBadge=item.qty?`<div class="qty-badge">×${item.qty}</div>`:'';
    const equippedClass=item._equipped?'equipped':'';
    const nameSuffix=(c.kind==='weapon'&&item.combLevel)?' +'+item.combLevel:'';
    let statsLine='';
    if(c.kind==='weapon'){
      const eff=getEffectiveStats(item);
      const parts=Object.entries(eff).map(([k,v])=>`+${v}${({force:'F',defense:'D',agility:'A',constitution:'PV'})[k]||k.charAt(0)}`);
      statsLine=`<div style="font-size:9px;color:var(--gold-bright);margin-top:2px;">${parts.join(' · ')}</div>`;
    }
    return `<div class="item-card rarity-${item.rarity} ${equippedClass}" data-i="${i}" data-kind="${c.kind}">${qtyBadge}${iconHtml}<div class="item-name">${item.name}${nameSuffix}</div><div class="item-rarity-tag">${rarityLabel(item.rarity)}</div>${statsLine}</div>`;
  }).join('');
  grid.querySelectorAll('.item-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const idx=parseInt(card.dataset.i);
      const c=cells[idx];
      openItemDetail(c);
    });
  });
}

function openItemDetail(cell){
  const item=cell.item;
  const color=RARITY_COLORS[item.rarity];
  let fallback;
  if(cell.kind==='weapon')fallback=FALLBACK_WEAPON[item.id]||FALLBACK_WEAPON.default;
  else if(cell.kind==='material')fallback=FALLBACK_MAT[item.id]||FALLBACK_MAT.default;
  else fallback=FALLBACK_ING[item.id]||FALLBACK_ING.default;
  $('itemDetailPortrait').innerHTML=`<img src="${iconUrl(item.icon,color)}" alt="" onerror="this.outerHTML='<span class=&quot;emoji&quot;>${fallback}</span>'">`;
  $('itemDetailPortrait').style.borderColor=color;
  $('itemDetailName').textContent=item.name+(cell.kind==='weapon'&&item.combLevel?' +'+item.combLevel:'');
  $('itemDetailName').style.color=color;
  let typeLabel='';
  if(cell.kind==='weapon')typeLabel=SLOT_LABEL[item.slot]||'Équipement';
  else if(cell.kind==='material')typeLabel='Matériau';
  else typeLabel='Ingrédient';
  $('itemDetailRarity').innerHTML=`${rarityLabel(item.rarity)} · ${typeLabel}${item._equipped?' · <span style="color:var(--success);">✓ Équipé</span>':''}`;
  $('itemDetailDesc').textContent='« '+(item.desc||'')+' »';
  // Stats (only for weapons)
  if(cell.kind==='weapon'){
    const labels={force:'💪 Force',defense:'🛡️ Défense',agility:'⚡ Vitesse',constitution:'❤️ Vie max'};
    const eff=getEffectiveStats(item);
    const statLines=Object.entries(item.stats||{}).map(([k,v])=>{
      const effV=eff[k];
      const bonusTxt=effV>v?` <small style="color:var(--rarity-rare);">(${v} +${effV-v})</small>`:'';
      return `<div class="item-stat-line"><span class="label">${labels[k]||k}</span><span class="value">+${effV}${bonusTxt}</span></div>`;
    }).join('');
    const combLine=item.combLevel?`<div class="item-stat-line"><span class="label">Niveau d'amélioration</span><span class="value" style="color:var(--gold-bright);">+${item.combLevel}/${MAX_COMB_LEVEL}</span></div>`:'';
    $('itemDetailStats').innerHTML=combLine+(statLines||'<div class="item-stat-line"><span class="label">Aucun bonus stat</span></div>');
  }else{
    $('itemDetailStats').innerHTML=`<div class="item-stat-line"><span class="label">Quantité</span><span class="value">×${item.qty}</span></div><div class="item-stat-line"><span class="label">Usage</span><span class="value" style="color:var(--text-dim);font-weight:400;font-size:11px;">${cell.kind==='material'?'⚒ Forgeron':'🧙‍♀️ Sorcière'}</span></div>`;
  }
  // Actions (only for weapons)
  let actionsHtml='';
  if(cell.kind==='weapon'){
    const sellValue=Math.round((RARITY_VALUE[item.rarity]||50)*0.5);
    const nextRarityIdx=RARITY_ORDER.indexOf(item.rarity)+1;
    const canUpgrade=nextRarityIdx<RARITY_ORDER.length;
    const upgradeCost=UPGRADE_COST[item.rarity];
    actionsHtml='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">';
    if(item._equipped)actionsHtml+=`<button class="btn btn-secondary" id="btnUnequipItem" style="font-size:11px;">📤 Déséquiper</button>`;
    else actionsHtml+=`<button class="btn btn-success" id="btnEquipItem" style="font-size:11px;">⚔ Équiper</button>`;
    actionsHtml+=`<button class="btn btn-secondary" id="btnSellItem" style="font-size:11px;color:var(--blood-bright);border-color:rgba(196,30,58,0.4);">💰 Vendre (${sellValue})</button></div>`;
    if(canUpgrade){const dis=state.player.gold<upgradeCost?'disabled':'';actionsHtml+=`<div style="margin-top:8px;"><button class="btn btn-gold" id="btnUpgradeItem" style="width:100%;font-size:11px;padding:10px;" ${dis}>⬆ Améliorer en ${rarityLabel(RARITY_ORDER[nextRarityIdx])} (${upgradeCost} 💰)</button></div>`;}
    // Combinaison
    const combCandidate=findCombineCandidate(item.uid);
    const canCombine=combCandidate!==null&&(item.combLevel||0)<MAX_COMB_LEVEL;
    if(canCombine){
      actionsHtml+=`<div style="margin-top:8px;"><button class="btn btn-gold" id="btnCombineItem" style="width:100%;font-size:11px;padding:10px;background:linear-gradient(135deg,#A855F7 0%,#C084FC 100%);color:#FFF;border-color:#A855F7;">🔮 Combiner → +${(item.combLevel||0)+1} (consomme 1 ${item.name} identique)</button></div>`;
    }else if((item.combLevel||0)>=MAX_COMB_LEVEL){
      actionsHtml+=`<div style="margin-top:8px;text-align:center;font-size:10px;color:var(--gold-bright);font-style:italic;">✨ Niveau d'amélioration maximum atteint</div>`;
    }else{
      actionsHtml+=`<div style="margin-top:8px;text-align:center;font-size:10px;color:var(--text-faint);font-style:italic;">🔮 Combinaison : il faut un autre ${item.name}${item.combLevel?' +'+item.combLevel:''} identique en sac</div>`;
    }
  }
  actionsHtml+=`<div style="margin-top:8px;"><button class="btn btn-secondary" id="btnCloseItem" style="width:100%;font-size:11px;">Fermer</button></div>`;
  $('itemDetailActions').innerHTML=actionsHtml;
  if(cell.kind==='weapon'){
    if(item._equipped){
      $('btnUnequipItem').addEventListener('click',()=>{unequipItem(item._slot);closeModal('itemDetailModal');renderInventoryView();showToast('📤 Objet déséquipé');});
    }else{
      $('btnEquipItem').addEventListener('click',()=>{equipItem(item.uid);closeModal('itemDetailModal');renderInventoryView();showToast('⚔ Objet équipé');});
    }
    $('btnSellItem').addEventListener('click',()=>{
      const sv=Math.round((RARITY_VALUE[item.rarity]||50)*0.5);
      if(!confirm(`Vendre ${item.name} pour ${sv} or ?`))return;
      sellItem(item.uid,item._equipped?item._slot:null,sv);closeModal('itemDetailModal');renderInventoryView();showToast(`💰 +${sv} or`);
    });
    const nextIdx=RARITY_ORDER.indexOf(item.rarity)+1;
    if(nextIdx<RARITY_ORDER.length){
      $('btnUpgradeItem').addEventListener('click',()=>{
        const cost=UPGRADE_COST[item.rarity];
        if(state.player.gold<cost){showToast('⚠ Or insuffisant');return;}
        if(!confirm(`Améliorer ${item.name} en ${rarityLabel(RARITY_ORDER[nextIdx])} pour ${cost} or ?\n\n(Stats x1.5)`))return;
        upgradeItem(item.uid,item._equipped?item._slot:null);closeModal('itemDetailModal');renderInventoryView();showToast(`⬆ ${item.name} amélioré !`,3000);
      });
    }
    const btnComb=$('btnCombineItem');
    if(btnComb){
      btnComb.addEventListener('click',()=>{
        if(!confirm(`Combiner deux ${item.name}${item.combLevel?' +'+item.combLevel:''} ? Une copie sera consommée et l'arme passera au niveau +${(item.combLevel||0)+1} (stats +20%).`))return;
        if(combineWeapons(item.uid)){closeModal('itemDetailModal');renderInventoryView();showToast(`🔮 ${item.name} combinée → +${(item.combLevel||0)+1}`,3000);}
        else{showToast('⚠ Combinaison impossible');}
      });
    }
  }
  $('btnCloseItem').addEventListener('click',()=>closeModal('itemDetailModal'));
  openModal('itemDetailModal');
}

function equipItem(uid){
  const idx=state.player.weapons.findIndex(i=>i.uid===uid);
  if(idx===-1)return;
  const item=state.player.weapons[idx];
  if(!item.slot)return;
  const cur=state.player.equipment[item.slot];
  state.player.weapons.splice(idx,1);
  if(cur)state.player.weapons.push(cur);
  state.player.equipment[item.slot]=item;
  saveState();
}
function unequipItem(slot){
  const item=state.player.equipment[slot];
  if(!item)return;
  if(!item.uid)item.uid='i_'+Date.now()+'_'+Math.floor(Math.random()*999);
  state.player.weapons.push(item);
  state.player.equipment[slot]=null;
  saveState();
}
function sellItem(uid,equippedSlot,value){
  if(equippedSlot){state.player.equipment[equippedSlot]=null;}
  else{const idx=state.player.weapons.findIndex(i=>i.uid===uid);if(idx===-1)return;state.player.weapons.splice(idx,1);}
  state.player.gold+=value;saveState();
}
function findCombineCandidate(uid){
  let target;
  let inEquipment=false;
  const inWeapons=state.player.weapons.find(w=>w.uid===uid);
  if(inWeapons)target=inWeapons;
  else{
    Object.entries(state.player.equipment).forEach(([s,it])=>{if(it&&it.uid===uid){target=it;inEquipment=true;}});
  }
  if(!target)return null;
  if((target.combLevel||0)>=MAX_COMB_LEVEL)return null;
  return state.player.weapons.find(w=>w.uid!==uid&&w.id===target.id&&w.rarity===target.rarity&&(w.combLevel||0)===(target.combLevel||0))||null;
}

function combineWeapons(uid){
  let target,inEquipment=false,equippedSlot=null;
  let idx=state.player.weapons.findIndex(w=>w.uid===uid);
  if(idx>=0)target=state.player.weapons[idx];
  else{
    Object.entries(state.player.equipment).forEach(([s,it])=>{if(it&&it.uid===uid){target=it;inEquipment=true;equippedSlot=s;}});
  }
  if(!target||(target.combLevel||0)>=MAX_COMB_LEVEL)return false;
  const candIdx=state.player.weapons.findIndex(w=>w.uid!==uid&&w.id===target.id&&w.rarity===target.rarity&&(w.combLevel||0)===(target.combLevel||0));
  if(candIdx<0)return false;
  state.player.weapons.splice(candIdx,1);
  if(!inEquipment){
    idx=state.player.weapons.findIndex(w=>w.uid===uid);
    if(idx>=0){
      state.player.weapons[idx].combLevel=(state.player.weapons[idx].combLevel||0)+1;
    }
  }else{
    target.combLevel=(target.combLevel||0)+1;
  }
  saveState();
  return true;
}

function drinkPotionOOC(){
  if(state.player.potions<=0){showToast('⚠ Aucune potion');return;}
  if(state.player.stats.hp_current>=state.player.stats.constitution){showToast('⚠ Vous êtes déjà à plein PV');return;}
  state.player.potions-=1;
  const before=state.player.stats.hp_current;
  state.player.stats.hp_current=Math.min(state.player.stats.constitution,before+50);
  const heal=state.player.stats.hp_current-before;
  saveState();
  if($('viewInventory').classList.contains('active'))renderInventoryView();
  else renderHero();
  showToast(`🧪 Potion bue : +${heal} PV`);
}
function drinkEtherOOC(){
  if(state.player.ethers<=0){showToast('⚠ Aucun éther');return;}
  if(state.player.stats.mp_current>=state.player.stats.mana){showToast('⚠ Mana déjà au max');return;}
  state.player.ethers-=1;
  const before=state.player.stats.mp_current;
  state.player.stats.mp_current=Math.min(state.player.stats.mana,before+10);
  const gain=state.player.stats.mp_current-before;
  saveState();
  if($('viewInventory').classList.contains('active'))renderInventoryView();
  else renderHero();
  showToast(`💧 Éther bu : +${gain} MP`);
}

function upgradeItem(uid,equippedSlot){
  let item;
  if(equippedSlot)item=state.player.equipment[equippedSlot];
  else item=state.player.weapons.find(i=>i.uid===uid);
  if(!item)return;
  const idx=RARITY_ORDER.indexOf(item.rarity);
  if(idx===RARITY_ORDER.length-1)return;
  const cost=UPGRADE_COST[item.rarity];
  if(state.player.gold<cost)return;
  state.player.gold-=cost;
  item.rarity=RARITY_ORDER[idx+1];
  Object.keys(item.stats||{}).forEach(k=>{item.stats[k]=Math.round(item.stats[k]*1.5);});
  saveState();
}

/* BLACKSMITH */
function renderBlacksmith(){
  const container=$('blacksmithRecipes');
  const recipes=allBlacksmithRecipes();
  if(!recipes||recipes.length===0){container.innerHTML='<div class="empty-state"><span class="icon">⚒</span>Aucune recette pour l\'instant.<br><small>Ajoutez-en dans Admin → 📜 Recettes.</small></div>';return;}
  const html=recipes.map((recipe,i)=>{
    const weapon=allEquipment().find(w=>w.id===recipe.weaponId);
    if(!weapon)return `<div class="recipe-card" style="opacity:0.5;"><div class="recipe-info"><div class="recipe-name">⚠ Recette orpheline</div><div class="recipe-rarity" style="color:var(--text-faint);">L'équipement "${recipe.weaponId}" n'existe plus.</div></div></div>`;
    const color=RARITY_COLORS[weapon.rarity];
    const fb=FALLBACK_WEAPON[weapon.id]||FALLBACK_WEAPON.default;
    const iconHtml=`<img src="${iconUrl(weapon.icon,color)}" alt="" onerror="this.outerHTML='<span class=&quot;emoji&quot;>${fb}</span>'">`;
    let canCraft=state.player.gold>=recipe.gold;
    const costTags=recipe.materials.map(m=>{
      const data=allMaterials().find(mat=>mat.id===m.id);
      const have=state.player.materials[m.id]||0;
      const ok=have>=m.qty;if(!ok)canCraft=false;
      const ico=FALLBACK_MAT[m.id]||FALLBACK_MAT.default;
      return `<span class="cost-tag ${ok?'have':'miss'}"><span class="ico">${ico}</span> ${data?data.name:m.id} ${have}/${m.qty}</span>`;
    }).join('');
    const goldTag=`<span class="cost-tag ${state.player.gold>=recipe.gold?'have':'miss'}"><span class="ico">💰</span> ${recipe.gold}</span>`;
    const stats=Object.entries(weapon.stats||{}).map(([k,v])=>`+${v} ${({force:'Force',defense:'Déf',agility:'Agi',constitution:'PV'})[k]||k}`).join(', ');
    return `<div class="recipe-card"><div class="recipe-head"><div class="recipe-icon" style="border:2px solid ${color}">${iconHtml}</div><div class="recipe-info"><div class="recipe-name" style="color:${color}">${weapon.name}</div><div class="recipe-rarity" style="color:${color}">${rarityLabel(weapon.rarity)} · ${stats}</div></div></div><div class="recipe-cost">${costTags}${goldTag}</div><div class="recipe-action"><button data-recipe="${i}" ${canCraft?'':'disabled'}>⚒ Forger</button></div></div>`;
  }).join('');
  container.innerHTML=html;
  container.querySelectorAll('button[data-recipe]').forEach(b=>{
    b.addEventListener('click',()=>{forgeWeapon(parseInt(b.dataset.recipe));});
  });
}
function forgeWeapon(recipeIdx){
  const recipe=allBlacksmithRecipes()[recipeIdx];
  if(!recipe)return;
  if(state.player.gold<recipe.gold){showToast('⚠ Or insuffisant');return;}
  for(const m of recipe.materials){if((state.player.materials[m.id]||0)<m.qty){showToast('⚠ Matériaux insuffisants');return;}}
  // Consommer
  state.player.gold-=recipe.gold;
  recipe.materials.forEach(m=>{state.player.materials[m.id]=(state.player.materials[m.id]||0)-m.qty;if(state.player.materials[m.id]<=0)delete state.player.materials[m.id];});
  // Créer arme
  const weapon=allEquipment().find(w=>w.id===recipe.weaponId);
  const newItem={...weapon,uid:'i_'+Date.now()+'_'+Math.floor(Math.random()*999)};
  state.player.weapons.push(newItem);
  saveState();renderInventoryView();
  showToast(`⚒ ${weapon.name} forgée !`,3000);
}

/* WITCH */
function renderWitch(){
  const container=$('witchRecipes');
  const recipes=allWitchRecipes();
  if(!recipes||recipes.length===0){container.innerHTML='<div class="empty-state"><span class="icon">🧙‍♀️</span>Aucune recette de potion.<br><small>Ajoutez-en dans Admin → 📜 Recettes.</small></div>';return;}
  container.innerHTML=recipes.map((recipe,i)=>{
    const color=RARITY_COLORS[recipe.rarity];
    const fb='🧪';
    const iconHtml=`<img src="${iconUrl(recipe.icon,color)}" alt="" onerror="this.outerHTML='<span class=&quot;emoji&quot;>${fb}</span>'">`;
    let canCraft=state.player.gold>=recipe.gold;
    const costTags=recipe.ingredients.map(m=>{
      const data=allIngredients().find(ing=>ing.id===m.id);
      const have=state.player.ingredients[m.id]||0;
      const ok=have>=m.qty;if(!ok)canCraft=false;
      const ico=FALLBACK_ING[m.id]||FALLBACK_ING.default;
      return `<span class="cost-tag ${ok?'have':'miss'}"><span class="ico">${ico}</span> ${data?data.name:m.id} ${have}/${m.qty}</span>`;
    }).join('');
    const goldTag=recipe.gold>0?`<span class="cost-tag ${state.player.gold>=recipe.gold?'have':'miss'}"><span class="ico">💰</span> ${recipe.gold}</span>`:'';
    return `<div class="recipe-card"><div class="recipe-head"><div class="recipe-icon" style="border:2px solid ${color}">${iconHtml}</div><div class="recipe-info"><div class="recipe-name" style="color:${color}">${recipe.name}</div><div class="recipe-rarity" style="color:var(--text-dim);font-style:italic;">${recipe.desc}</div></div></div><div class="recipe-cost">${costTags}${goldTag}</div><div class="recipe-action"><button data-recipe="${i}" ${canCraft?'':'disabled'}>🧙‍♀️ Préparer</button></div></div>`;
  }).join('');
  container.querySelectorAll('button[data-recipe]').forEach(b=>{
    b.addEventListener('click',()=>{brewPotion(parseInt(b.dataset.recipe));});
  });
}
function brewPotion(recipeIdx){
  const recipe=allWitchRecipes()[recipeIdx];
  if(!recipe)return;
  if(state.player.gold<recipe.gold){showToast('⚠ Or insuffisant');return;}
  for(const m of recipe.ingredients){if((state.player.ingredients[m.id]||0)<m.qty){showToast('⚠ Ingrédients insuffisants');return;}}
  state.player.gold-=recipe.gold;
  recipe.ingredients.forEach(m=>{state.player.ingredients[m.id]=(state.player.ingredients[m.id]||0)-m.qty;if(state.player.ingredients[m.id]<=0)delete state.player.ingredients[m.id];});
  if(recipe.effect==='heal')state.player.potions+=1;
  saveState();renderInventoryView();
  showToast(`🧙‍♀️ ${recipe.name} préparée !`,3000);
}

/* MERCHANT */
function renderMerchant(){
  document.querySelectorAll('[data-merchant]').forEach(b=>b.classList.toggle('active',b.dataset.merchant===activeMerchantTab));
  $('merchantBuy').style.display=activeMerchantTab==='buy'?'block':'none';
  $('merchantSell').style.display=activeMerchantTab==='sell'?'block':'none';
  if(activeMerchantTab==='buy')renderMerchantBuy();
  else renderMerchantSell();
}
function renderMerchantBuy(){
  const ETHER_PRICE=30;
  $('merchantBuy').innerHTML=`
    <div class="shop-item"><div class="shop-icon">🧪</div><div class="shop-info"><div class="shop-name">Potion de soin</div><div class="shop-desc">Restaure 50 PV. (${state.player.potions} en stock)</div></div><button class="shop-buy" id="btnBuyPotion" ${state.player.gold<POTION_PRICE?'disabled':''}>${POTION_PRICE} 💰</button></div>
    <div class="shop-item"><div class="shop-icon">💧</div><div class="shop-info"><div class="shop-name">Éther</div><div class="shop-desc">Restaure 10 MP. (${state.player.ethers} en stock)</div></div><button class="shop-buy" id="btnBuyEther" ${state.player.gold<ETHER_PRICE?'disabled':''}>${ETHER_PRICE} 💰</button></div>`;
  $('btnBuyPotion').addEventListener('click',()=>{
    if(state.player.gold<POTION_PRICE){showToast('⚠ Or insuffisant');return;}
    state.player.gold-=POTION_PRICE;state.player.potions+=1;
    saveState();renderInventoryView();showToast('🧪 Potion achetée');
  });
  $('btnBuyEther').addEventListener('click',()=>{
    if(state.player.gold<ETHER_PRICE){showToast('⚠ Or insuffisant');return;}
    state.player.gold-=ETHER_PRICE;state.player.ethers+=1;
    saveState();renderInventoryView();showToast('💧 Éther acheté');
  });
}
function renderMerchantSell(){
  let html='';
  Object.entries(state.player.materials).forEach(([id,qty])=>{
    if(qty<=0)return;
    const data=allMaterials().find(m=>m.id===id);
    if(!data)return;
    const price=SELL_MATERIAL[data.rarity]||10;
    const color=RARITY_COLORS[data.rarity];
    const fb=FALLBACK_MAT[id]||FALLBACK_MAT.default;
    html+=`<div class="shop-item"><div class="shop-icon"><img src="${iconUrl(data.icon,color)}" style="width:36px;height:36px;" alt="" onerror="this.outerHTML='<span style=&quot;font-size:30px;&quot;>${fb}</span>'"></div><div class="shop-info"><div class="shop-name" style="color:${color}">${data.name} ×${qty}</div><div class="shop-desc">${price} 💰 / unité</div></div><div style="display:flex;flex-direction:column;gap:4px;"><button class="shop-buy" data-sell-mat="${id}" data-qty="1">×1 (${price})</button><button class="shop-buy" data-sell-mat="${id}" data-qty="all" style="font-size:9px;padding:4px 10px;">×Tout (${price*qty})</button></div></div>`;
  });
  Object.entries(state.player.ingredients).forEach(([id,qty])=>{
    if(qty<=0)return;
    const data=allIngredients().find(m=>m.id===id);
    if(!data)return;
    const price=SELL_INGREDIENT[data.rarity]||15;
    const color=RARITY_COLORS[data.rarity];
    const fb=FALLBACK_ING[id]||FALLBACK_ING.default;
    html+=`<div class="shop-item"><div class="shop-icon"><img src="${iconUrl(data.icon,color)}" style="width:36px;height:36px;" alt="" onerror="this.outerHTML='<span style=&quot;font-size:30px;&quot;>${fb}</span>'"></div><div class="shop-info"><div class="shop-name" style="color:${color}">${data.name} ×${qty}</div><div class="shop-desc">${price} 💰 / unité</div></div><div style="display:flex;flex-direction:column;gap:4px;"><button class="shop-buy" data-sell-ing="${id}" data-qty="1">×1 (${price})</button><button class="shop-buy" data-sell-ing="${id}" data-qty="all" style="font-size:9px;padding:4px 10px;">×Tout (${price*qty})</button></div></div>`;
  });
  if(!html)html='<div class="empty-state"><span class="icon">📦</span>Rien à vendre.<br><small>Vainquez des boss pour collecter du butin.</small></div>';
  $('merchantSell').innerHTML=html;
  $('merchantSell').querySelectorAll('[data-sell-mat]').forEach(b=>{
    b.addEventListener('click',()=>{
      const id=b.dataset.sellMat;
      const qtyStr=b.dataset.qty;
      const qty=qtyStr==='all'?state.player.materials[id]:1;
      if(!qty||qty<1)return;
      const data=allMaterials().find(m=>m.id===id);
      const price=SELL_MATERIAL[data.rarity]||10;
      const total=price*qty;
      state.player.materials[id]-=qty;
      if(state.player.materials[id]<=0)delete state.player.materials[id];
      state.player.gold+=total;
      saveState();renderInventoryView();showToast(`💰 +${total} or`);
    });
  });
  $('merchantSell').querySelectorAll('[data-sell-ing]').forEach(b=>{
    b.addEventListener('click',()=>{
      const id=b.dataset.sellIng;
      const qtyStr=b.dataset.qty;
      const qty=qtyStr==='all'?state.player.ingredients[id]:1;
      if(!qty||qty<1)return;
      const data=allIngredients().find(m=>m.id===id);
      const price=SELL_INGREDIENT[data.rarity]||15;
      const total=price*qty;
      state.player.ingredients[id]-=qty;
      if(state.player.ingredients[id]<=0)delete state.player.ingredients[id];
      state.player.gold+=total;
      saveState();renderInventoryView();showToast(`💰 +${total} or`);
    });
  });
}

/* ============ PHASE 6B : ADMIN PANEL ============ */
let activeAdminTab='zones';
let adminEditCtx=null; // {type, id} ou {type, id:null} pour création

function renderAdmin(){
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.toggle('active',t.dataset.admintab===activeAdminTab));
  const c=$('adminContent');
  c.innerHTML='';
  try{
    if(activeAdminTab==='zones')c.innerHTML=adminListHtml('zones',allZones(),z=>`Niveau ${z.levelMin}-${z.levelMax} · Entrée niv.${z.requiredLevel}`,'🗺');
    else if(activeAdminTab==='exercises')c.innerHTML=adminListHtml('exercises',allExercises(),e=>`${TYPE_LABEL[e.type]||'?'} · ${e.baseDamage} dég · ${e.unit==='seconds'?'sec':'reps'}`,'💪');
    else if(activeAdminTab==='bosses')c.innerHTML=adminListHtml('bosses',allBosses(),b=>`Niv.${b.level} · ${rarityLabel(b.rarity)} · ${TYPE_LABEL[b.type]||'?'} · ${b.region||'—'}${b.isRegionalBoss?' ⭐':''}`,'🐉');
    else if(activeAdminTab==='equipment')c.innerHTML=adminListHtml('equipment',allEquipment(),w=>`${rarityLabel(w.rarity)} · ${SLOT_LABEL[w.slot]||'?'} · ${Object.entries(w.stats||{}).map(([k,v])=>'+'+v+' '+(k.charAt(0).toUpperCase())).join(', ')}`,'⚔');
    else if(activeAdminTab==='materials')c.innerHTML=adminListHtml('materials',allMaterials(),m=>`${rarityLabel(m.rarity)} · ${m.desc||''}`,'🪵');
    else if(activeAdminTab==='ingredients')c.innerHTML=adminListHtml('ingredients',allIngredients(),m=>`${rarityLabel(m.rarity)} · ${m.desc||''}`,'🌿');
    else if(activeAdminTab==='spells')c.innerHTML=adminListHtml('spells',allSpells(),s=>`${ELEMENTS[s.element]?ELEMENTS[s.element].icon:''} ${s.element||''} · ${s.manaCost} MP · ${s.effect}`,'🪄');
    else if(activeAdminTab==='recipes')c.innerHTML=renderRecipesAdmin();
    else if(activeAdminTab==='data')c.innerHTML=renderDataAdmin();
  }catch(e){
    console.error('Admin render error:',e);
    c.innerHTML='<div style="color:var(--blood-bright);padding:20px;text-align:center;background:rgba(196,30,58,0.1);border:1px solid var(--blood);border-radius:8px;">⚠ Erreur de rendu : '+(e.message||e)+'<br><small>Voir la console pour plus de détails.</small></div>';
  }
  bindAdminListeners();
}

function adminListHtml(type,items,metaFn,defaultIcon){
  const html=items.map(item=>{
    const builtin=isBuiltIn(item.id,type);
    const disabled=_isDisabled(item.id);
    let iconHtml=defaultIcon;
    if(item.icon){const c=RARITY_COLORS[item.rarity]||'#fff';iconHtml=`<img src="${iconUrl(item.icon,c)}" alt="" onerror="this.outerHTML='${defaultIcon}'">`;}
    return `<div class="admin-list-item ${builtin?'builtin':''} ${disabled?'disabled':''}"><div class="alist-icon">${iconHtml}</div><div class="alist-info"><div class="alist-name">${item.name||item.id}${builtin?' <small style="color:var(--text-faint);">(de base)</small>':''}</div><div class="alist-meta">${metaFn(item)}</div></div><div class="alist-actions">${builtin?`<button data-action="toggle" data-type="${type}" data-id="${item.id}">${disabled?'Activer':'Désactiver'}</button>`:`<button data-action="edit" data-type="${type}" data-id="${item.id}">✏</button><button data-action="delete" data-type="${type}" data-id="${item.id}" class="danger">🗑</button>`}</div></div>`;
  }).join('');
  return `<button class="admin-add-btn" data-action="add" data-type="${type}">+ Ajouter</button>${html||'<div class="empty-state">Aucun élément.</div>'}`;
}

function renderRecipesAdmin(){
  const bs=allBlacksmithRecipes();
  const ws=allWitchRecipes();
  const bsHtml=bs.map((r,i)=>{
    const w=allEquipment().find(x=>x.id===r.weaponId);
    const builtin=i<GAME_DATA.recipes_blacksmith.length;
    const matsTxt=r.materials.map(m=>{const mat=allMaterials().find(x=>x.id===m.id);return `${m.qty}× ${mat?mat.name:m.id}`;}).join(', ');
    return `<div class="admin-list-item ${builtin?'builtin':''}"><div class="alist-icon">⚒</div><div class="alist-info"><div class="alist-name">${w?w.name:r.weaponId}${builtin?' <small style="color:var(--text-faint);">(de base)</small>':''}</div><div class="alist-meta">${matsTxt} · ${r.gold||0} or</div></div><div class="alist-actions">${builtin?'':`<button data-action="delete-recipe" data-recipe-type="blacksmith" data-idx="${i-GAME_DATA.recipes_blacksmith.length}" class="danger">🗑</button>`}</div></div>`;
  }).join('');
  const wsHtml=ws.map((r,i)=>{
    const builtin=i<GAME_DATA.recipes_witch.length;
    const ingTxt=r.ingredients.map(m=>{const ing=allIngredients().find(x=>x.id===m.id);return `${m.qty}× ${ing?ing.name:m.id}`;}).join(', ');
    return `<div class="admin-list-item ${builtin?'builtin':''}"><div class="alist-icon">🧙‍♀️</div><div class="alist-info"><div class="alist-name">${r.name||r.id}${builtin?' <small style="color:var(--text-faint);">(de base)</small>':''}</div><div class="alist-meta">${ingTxt} · ${r.gold||0} or</div></div><div class="alist-actions">${builtin?'':`<button data-action="delete-recipe" data-recipe-type="witch" data-idx="${i-GAME_DATA.recipes_witch.length}" class="danger">🗑</button>`}</div></div>`;
  }).join('');
  return `<div class="section-label"><span>⚒ Recettes Forgeron</span></div><button class="admin-add-btn" data-action="add-recipe" data-recipe-type="blacksmith">+ Ajouter recette Forgeron</button>${bsHtml}<div class="section-label" style="margin-top:16px;"><span>🧙‍♀️ Recettes Sorcière</span></div><button class="admin-add-btn" data-action="add-recipe" data-recipe-type="witch">+ Ajouter recette Sorcière</button>${wsHtml}`;
}

function renderDataAdmin(){
  return `
    <div class="section-label"><span>💾 Sauvegarde</span></div>
    <p style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Exporte tout (progression + contenu custom) en JSON. Tu peux le copier dans un fichier pour le sauvegarder ailleurs.</p>
    <textarea class="export-area" id="exportArea" readonly></textarea>
    <button class="admin-add-btn" id="btnDoExport" style="margin-top:8px;">📋 Copier au presse-papier</button>
    <div class="section-label" style="margin-top:16px;"><span>📥 Import</span></div>
    <p style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Colle un JSON exporté précédemment pour restaurer.</p>
    <textarea class="export-area" id="importArea" placeholder="Colle ton JSON ici..."></textarea>
    <button class="admin-add-btn" id="btnDoImport" style="background:linear-gradient(135deg,#1d4ed8 0%,var(--rarity-rare) 100%);margin-top:8px;">⬆ Importer</button>
    <div class="section-label" style="margin-top:16px;"><span>⚠ Reset</span></div>
    <button class="admin-add-btn" id="btnResetCustom" style="background:linear-gradient(135deg,#7f1d1d 0%,var(--blood-bright) 100%);">🗑 Réinitialiser uniquement le contenu custom</button>
    <button class="admin-add-btn" id="btnResetFull" style="background:linear-gradient(135deg,#7f1d1d 0%,var(--blood-bright) 100%);margin-top:8px;">⚠ Réinitialiser TOUT (progression + custom)</button>
  `;
}

function bindAdminListeners(){
  $('adminContent').querySelectorAll('[data-action]').forEach(b=>{
    b.addEventListener('click',()=>{
      const action=b.dataset.action;
      if(action==='add'){openAdminEdit(b.dataset.type,null);}
      else if(action==='edit'){openAdminEdit(b.dataset.type,b.dataset.id);}
      else if(action==='delete'){
        if(!confirm('Supprimer cet élément ?'))return;
        deleteCustom(b.dataset.type,b.dataset.id);renderAdmin();
      }
      else if(action==='toggle'){
        toggleDisabled(b.dataset.id);renderAdmin();
      }
      else if(action==='add-recipe'){openRecipeEdit(b.dataset.recipeType);}
      else if(action==='delete-recipe'){
        if(!confirm('Supprimer cette recette ?'))return;
        const t=b.dataset.recipeType;const i=parseInt(b.dataset.idx);
        state.player.custom[t].splice(i,1);saveState();renderAdmin();
      }
    });
  });
  // Data tab
  if($('exportArea')){
    $('exportArea').value=JSON.stringify(state,null,2);
    $('btnDoExport').addEventListener('click',()=>{
      const txt=$('exportArea').value;
      navigator.clipboard.writeText(txt).then(()=>showToast('📋 Copié au presse-papier')).catch(()=>{$('exportArea').select();showToast('⚠ Sélectionne et copie manuellement');});
    });
    $('btnDoImport').addEventListener('click',()=>{
      const txt=$('importArea').value.trim();if(!txt){showToast('⚠ Colle un JSON d\'abord');return;}
      try{const parsed=JSON.parse(txt);if(!parsed.player){throw new Error('Format invalide');}
        if(!confirm('Remplacer toute ta progression par ce JSON ?'))return;
        replaceStoredSave(parsed);location.reload();
      }catch(e){showToast('⚠ JSON invalide');}
    });
    $('btnResetCustom').addEventListener('click',()=>{
      if(!confirm('Effacer tout le contenu custom ? La progression sera gardée.'))return;
      state.player.custom={zones:[],exercises:[],bosses:[],equipment:[],materials:[],ingredients:[],blacksmith:[],witch:[],disabledIds:[]};
      saveState();renderAdmin();showToast('✓ Custom effacé');
    });
    $('btnResetFull').addEventListener('click',()=>{
      if(!confirm('Effacer TOUTE la progression et tout le custom ?'))return;
      resetState();location.reload();
    });
  }
}

function toggleDisabled(id){
  const arr=state.player.custom.disabledIds;
  const idx=arr.indexOf(id);
  if(idx>=0)arr.splice(idx,1);else arr.push(id);
  saveState();
}
function deleteCustom(type,id){
  const arr=state.player.custom[type];if(!arr)return;
  const idx=arr.findIndex(x=>x.id===id);
  if(idx>=0){arr.splice(idx,1);saveState();}
}

/* Formulaires d'édition par type */
function openAdminEdit(type,id){
  adminEditCtx={type,id};
  let item=null;
  if(id){
    const list=type==='zones'?allZones():type==='exercises'?allExercises():type==='bosses'?allBosses():type==='equipment'?allEquipment():type==='materials'?allMaterials():allIngredients();
    item=list.find(x=>x.id===id);
  }
  $('adminEditTitle').textContent=(id?'Modifier ':'Créer ')+({zones:'zone',exercises:'exercice',bosses:'boss',equipment:'équipement',materials:'matériau',ingredients:'ingrédient',spells:'sort'})[type];
  $('adminEditFields').innerHTML=getFormHtml(type,item);
  openModal('adminEditModal');
}

function getFormHtml(type,item){
  item=item||{};
  const txt=(label,key,val,opts={})=>`<div class="form-row"><label>${label}</label><input type="${opts.type||'text'}" id="f_${key}" value="${val!==undefined?val:''}"${opts.min!==undefined?' min="'+opts.min+'"':''}${opts.max!==undefined?' max="'+opts.max+'"':''}${opts.step?' step="'+opts.step+'"':''}></div>`;
  const sel=(label,key,val,options)=>`<div class="form-row"><label>${label}</label><select id="f_${key}">${options.map(([v,l])=>`<option value="${v}" ${v===val?'selected':''}>${l}</option>`).join('')}</select></div>`;
  const ta=(label,key,val)=>`<div class="form-row"><label>${label}</label><textarea id="f_${key}">${val||''}</textarea></div>`;
  const rarities=[['common','Commun'],['rare','Rare'],['epic','Épique'],['legendary','Légendaire']];
  const types=[['force','Force'],['agility','Agilité'],['endurance','Endurance']];
  const slots=[['weapon_main','Arme principale'],['weapon_secondary','Arme secondaire'],['armor','Plastron'],['helmet','Casque'],['legs','Jambières'],['cape','Cape'],['accessory_1','Accessoire']];
  if(type==='zones'){
    const bossOptions=[['','—']].concat(allBosses().map(b=>[b.id,b.name+' (niv '+b.level+')']));
    return txt('ID (sans espace)','id',item.id,{})+txt('Nom','name',item.name)
      +sel('Élément de la zone','element',item.element||'',ELEMENT_OPTIONS)
      +`<div class="form-grid-2">${txt('Niveau min','levelMin',item.levelMin||1,{type:'number',min:1})}${txt('Niveau max','levelMax',item.levelMax||10,{type:'number',min:1})}</div>`
      +txt('Niveau requis joueur','requiredLevel',item.requiredLevel||1,{type:'number',min:1})
      +sel('Boss régional précédent requis','requiredRegionalBoss',item.requiredRegionalBoss||'',bossOptions)
      +sel('Boss régional de cette zone','regionalBossId',item.regionalBossId||'',bossOptions)
      +txt('Couleur thème (#hex)','themeColor',item.themeColor||'#22c55e')
      +txt('Couleur accent (#hex)','accent',item.accent||'#86efac')
      +txt('URL image background (optionnel)','bgImage',item.bgImage||'')
      +sel('Paysage SVG par défaut','svgKey',item.svgKey||'forest',[['forest','Forêt'],['swamp','Marais'],['crystal','Caverne'],['default','Sombre']])
      +ta('Description','desc',item.desc);
  }
  if(type==='exercises'){
    return txt('ID','id',item.id)+txt('Nom','name',item.name)
      +sel('Type','type',item.type||'force',types)
      +sel('Groupe','group',item.group||'haut',[['haut','Haut du corps'],['bas','Bas'],['full','Full body']])
      +sel('Unité','unit',item.unit||'reps',[['reps','Répétitions'],['seconds','Secondes']])
      +txt('Dégâts de base','baseDamage',item.baseDamage||10,{type:'number',min:1,max:100})
      +sel('Avec poids ?','hasWeight',item.hasWeight?'1':'0',[['0','Non'],['1','Oui']])
      +txt('URL image custom (optionnel)','customImage',item.customImage||'')
      +ta('Description','desc',item.desc);
  }
  if(type==='bosses'){
    const zoneOptions=allZones().map(z=>[z.id,z.name]);
    return txt('ID','id',item.id)+txt('Nom','name',item.name)
      +`<div class="form-grid-2">${sel('Rareté','rarity',item.rarity||'common',rarities)}${sel('Type','type',item.type||'force',types)}</div>`
      +`<div class="form-grid-2">${txt('Niveau','level',item.level||1,{type:'number',min:1,max:120})}${txt('PV max','hp_max',item.hp_max||100,{type:'number',min:1})}</div>`
      +`<div class="form-grid-2">${txt('Attaque','attack',item.attack||10,{type:'number',min:1})}${txt('Défense','defense',item.defense||5,{type:'number',min:0})}</div>`
      +`<div class="form-grid-2">${txt('Or','gold',item.gold||30,{type:'number',min:0})}${txt('XP','xp',item.xp||80,{type:'number',min:0})}</div>`
      +sel('Élément','element',item.element||'',ELEMENT_OPTIONS)
      +txt('Icône Game-icons','icon',item.icon||'goblin-head')
      +txt('URL image custom (optionnel)','customImage',item.customImage||'')
      +sel('Zone','region',item.region||(zoneOptions[0]||['',''])[0],zoneOptions)
      +sel('Boss régional ?','isRegionalBoss',item.isRegionalBoss?'1':'0',[['0','Non'],['1','Oui']])
      +ta('Description','desc',item.desc)
      +ta('Drops (JSON: [{type,id,chance,qty:[min,max]}])','drops',JSON.stringify(item.drops||[]));
  }
  if(type==='equipment'){
    return txt('ID','id',item.id)+txt('Nom','name',item.name)
      +`<div class="form-grid-2">${sel('Rareté','rarity',item.rarity||'common',rarities)}${sel('Slot','slot',item.slot||'weapon_main',slots)}</div>`
      +sel('Élément (offensif)','element',item.element||'',ELEMENT_OPTIONS)
      +sel('Résistance élémentaire (défensive)','elementResist',item.elementResist||'',ELEMENT_OPTIONS)
      +txt('Icône Game-icons','icon',item.icon||'broadsword')
      +txt('URL image custom (optionnel)','customImage',item.customImage||'')
      +`<div class="form-grid-2">${txt('+Force','sForce',(item.stats||{}).force||0,{type:'number',min:0})}${txt('+Défense','sDefense',(item.stats||{}).defense||0,{type:'number',min:0})}</div>`
      +`<div class="form-grid-2">${txt('+Vitesse','sAgility',(item.stats||{}).agility||0,{type:'number',min:0})}${txt('+PV max','sConstitution',(item.stats||{}).constitution||0,{type:'number',min:0})}</div>`
      +ta('Description','desc',item.desc);
  }
  if(type==='materials'||type==='ingredients'){
    return txt('ID','id',item.id)+txt('Nom','name',item.name)
      +sel('Rareté','rarity',item.rarity||'common',rarities)
      +txt('Icône Game-icons','icon',item.icon||(type==='materials'?'wood-pile':'three-leaves'))
      +txt('URL image custom (optionnel)','customImage',item.customImage||'')
      +ta('Description','desc',item.desc);
  }
  if(type==='spells'){
    const effects=[['damage_flat','Dégâts directs (valeur fixe)'],['heal_flat','Soin direct (valeur fixe)']];
    return txt('ID','id',item.id)+txt('Nom','name',item.name)
      +sel('Élément','element',item.element||'',ELEMENT_OPTIONS)
      +txt('Coût en Mana','manaCost',item.manaCost||10,{type:'number',min:0,max:200})
      +sel('Effet','effect',item.effect||'damage_flat',effects)
      +txt('Valeur de l\'effet','value',item.value||20,{type:'number',min:1})
      +sel('Une fois par combat ?','oncePerCombat',item.oncePerCombat?'1':'0',[['0','Non'],['1','Oui']])
      +txt('Icône Game-icons','icon',item.icon||'fire-ball')
      +txt('URL image custom (optionnel)','customImage',item.customImage||'')
      +ta('Description','desc',item.desc);
  }
  return '';
}

function saveAdminEdit(){
  if(!adminEditCtx)return;
  const{type,id}=adminEditCtx;
  const v=k=>{const el=$('f_'+k);return el?el.value:'';};
  let obj={};
  if(type==='zones'){
    obj={id:v('id'),name:v('name'),element:v('element')||null,levelMin:parseInt(v('levelMin'))||1,levelMax:parseInt(v('levelMax'))||10,requiredLevel:parseInt(v('requiredLevel'))||1,requiredRegionalBoss:v('requiredRegionalBoss')||null,regionalBossId:v('regionalBossId')||null,themeColor:v('themeColor'),accent:v('accent'),bgImage:v('bgImage')||null,svgKey:v('svgKey'),desc:v('desc')};
  }else if(type==='exercises'){
    obj={id:v('id'),name:v('name'),type:v('type'),group:v('group'),unit:v('unit'),baseDamage:parseInt(v('baseDamage'))||10,hasWeight:v('hasWeight')==='1',customImage:v('customImage')||null,desc:v('desc')};
  }else if(type==='bosses'){
    let drops=[];try{drops=JSON.parse(v('drops')||'[]');}catch(e){showToast('⚠ Drops JSON invalide');return;}
    obj={id:v('id'),name:v('name'),rarity:v('rarity'),type:v('type'),element:v('element')||null,level:parseInt(v('level'))||1,hp_max:parseInt(v('hp_max'))||100,attack:parseInt(v('attack'))||10,defense:parseInt(v('defense'))||5,gold:parseInt(v('gold'))||30,xp:parseInt(v('xp'))||80,icon:v('icon'),customImage:v('customImage')||null,region:v('region'),isRegionalBoss:v('isRegionalBoss')==='1',desc:v('desc'),drops};
  }else if(type==='equipment'){
    const stats={};
    if(parseInt(v('sForce')))stats.force=parseInt(v('sForce'));
    if(parseInt(v('sDefense')))stats.defense=parseInt(v('sDefense'));
    if(parseInt(v('sAgility')))stats.agility=parseInt(v('sAgility'));
    if(parseInt(v('sConstitution')))stats.constitution=parseInt(v('sConstitution'));
    obj={id:v('id'),name:v('name'),rarity:v('rarity'),slot:v('slot'),element:v('element')||null,elementResist:v('elementResist')||null,icon:v('icon'),customImage:v('customImage')||null,stats,desc:v('desc')};
  }else if(type==='materials'||type==='ingredients'){
    obj={id:v('id'),name:v('name'),rarity:v('rarity'),icon:v('icon'),customImage:v('customImage')||null,desc:v('desc')};
  }else if(type==='spells'){
    obj={id:v('id'),name:v('name'),element:v('element')||null,manaCost:parseInt(v('manaCost'))||10,effect:v('effect'),value:parseInt(v('value'))||20,oncePerCombat:v('oncePerCombat')==='1',icon:v('icon'),customImage:v('customImage')||null,desc:v('desc')};
  }
  if(!obj.id||!obj.name){showToast('⚠ ID et Nom requis');return;}
  // Sauvegarder
  const arr=state.player.custom[type];
  if(id){
    // Édition
    const idx=arr.findIndex(x=>x.id===id);
    if(idx>=0)arr[idx]=obj;else arr.push(obj);
  }else{
    // Création
    if(arr.some(x=>x.id===obj.id)||isBuiltIn(obj.id,type)){showToast('⚠ ID déjà utilisé');return;}
    arr.push(obj);
  }
  saveState();closeModal('adminEditModal');renderAdmin();showToast('✓ Enregistré');
}

function openRecipeEdit(rtype){
  const isB=rtype==='blacksmith';
  $('adminEditTitle').textContent='Nouvelle recette '+(isB?'Forgeron':'Sorcière');
  let html='';
  if(isB){
    const items=allEquipment();
    const itemOpt=items.map(w=>`<option value="${w.id}">${w.name} (${rarityLabel(w.rarity)} · ${SLOT_LABEL[w.slot]||'?'})</option>`).join('');
    html=`
      <div class="form-row"><label>Équipement à forger</label><select id="f_weaponId">${itemOpt}</select></div>
      <div class="form-row"><label>Or requis</label><input type="number" id="f_gold" value="50" min="0"></div>
      <div class="form-row"><label>Matériaux requis</label><div id="recipeMatList"></div><button type="button" class="admin-add-btn" id="btnAddMat" style="margin-top:6px;padding:8px;font-size:11px;">+ Ajouter un matériau</button></div>`;
  }else{
    html=`
      <div class="form-row"><label>ID (sans espace, unique)</label><input type="text" id="f_id" placeholder="potion_force"></div>
      <div class="form-row"><label>Nom</label><input type="text" id="f_name" placeholder="Potion de Force"></div>
      <div class="form-row"><label>Description</label><textarea id="f_desc"></textarea></div>
      <div class="form-row"><label>Effet</label><select id="f_effect"><option value="heal">Soigne 50 PV</option><option value="strength">+30% dégâts (1 séance)</option><option value="xp">×2 XP (1 séance)</option><option value="gold">+50 or instantané</option><option value="mana">Restaure 50 MP</option></select></div>
      <div class="form-row"><label>Or requis</label><input type="number" id="f_gold" value="0" min="0"></div>
      <div class="form-row"><label>Ingrédients requis</label><div id="recipeIngList"></div><button type="button" class="admin-add-btn" id="btnAddIng" style="margin-top:6px;padding:8px;font-size:11px;">+ Ajouter un ingrédient</button></div>`;
  }
  $('adminEditFields').innerHTML=html;
  adminEditCtx={type:'_recipe_'+rtype,rows:[]};
  if(isB){
    $('btnAddMat').addEventListener('click',()=>addRecipeMatRow());
    addRecipeMatRow();
  }else{
    $('btnAddIng').addEventListener('click',()=>addRecipeIngRow());
    addRecipeIngRow();
  }
  openModal('adminEditModal');
}

function addRecipeMatRow(){
  const list=$('recipeMatList');
  const idx=list.children.length;
  const mats=allMaterials();
  const opt=mats.map(m=>`<option value="${m.id}">${m.name} (${rarityLabel(m.rarity)})</option>`).join('');
  const div=document.createElement('div');
  div.style.cssText='display:flex;gap:6px;align-items:center;margin-bottom:6px;';
  div.innerHTML=`<select data-mat-id style="flex:1;background:rgba(0,0,0,0.5);border:1px solid var(--border-strong);border-radius:6px;padding:8px;color:var(--text);font-size:12px;">${opt}</select><input type="number" data-mat-qty min="1" value="1" style="width:60px;background:rgba(0,0,0,0.5);border:1px solid var(--border-strong);border-radius:6px;padding:8px;color:var(--text);font-size:12px;text-align:center;"><button type="button" data-rm style="background:rgba(196,30,58,0.2);color:var(--blood-bright);border:1px solid rgba(196,30,58,0.4);padding:8px;border-radius:6px;cursor:pointer;">×</button>`;
  list.appendChild(div);
  div.querySelector('[data-rm]').addEventListener('click',()=>div.remove());
}
function addRecipeIngRow(){
  const list=$('recipeIngList');
  const ings=allIngredients();
  const opt=ings.map(m=>`<option value="${m.id}">${m.name} (${rarityLabel(m.rarity)})</option>`).join('');
  const div=document.createElement('div');
  div.style.cssText='display:flex;gap:6px;align-items:center;margin-bottom:6px;';
  div.innerHTML=`<select data-ing-id style="flex:1;background:rgba(0,0,0,0.5);border:1px solid var(--border-strong);border-radius:6px;padding:8px;color:var(--text);font-size:12px;">${opt}</select><input type="number" data-ing-qty min="1" value="1" style="width:60px;background:rgba(0,0,0,0.5);border:1px solid var(--border-strong);border-radius:6px;padding:8px;color:var(--text);font-size:12px;text-align:center;"><button type="button" data-rm style="background:rgba(196,30,58,0.2);color:var(--blood-bright);border:1px solid rgba(196,30,58,0.4);padding:8px;border-radius:6px;cursor:pointer;">×</button>`;
  list.appendChild(div);
  div.querySelector('[data-rm]').addEventListener('click',()=>div.remove());
}

function saveRecipeEdit(rtype){
  const v=k=>{const el=$('f_'+k);return el?el.value:'';};
  if(rtype==='blacksmith'){
    const mats=[];
    document.querySelectorAll('#recipeMatList > div').forEach(row=>{
      const id=row.querySelector('[data-mat-id]').value;
      const qty=parseInt(row.querySelector('[data-mat-qty]').value)||1;
      if(id)mats.push({id,qty});
    });
    if(!v('weaponId')||mats.length===0){showToast('⚠ Sélectionne un équipement et au moins 1 matériau');return;}
    state.player.custom.blacksmith.push({weaponId:v('weaponId'),gold:parseInt(v('gold'))||0,materials:mats});
  }else{
    const ings=[];
    document.querySelectorAll('#recipeIngList > div').forEach(row=>{
      const id=row.querySelector('[data-ing-id]').value;
      const qty=parseInt(row.querySelector('[data-ing-qty]').value)||1;
      if(id)ings.push({id,qty});
    });
    if(!v('id')||!v('name')||ings.length===0){showToast('⚠ ID, nom et au moins 1 ingrédient requis');return;}
    state.player.custom.witch.push({id:v('id'),name:v('name'),desc:v('desc'),effect:v('effect'),gold:parseInt(v('gold'))||0,ingredients:ings,icon:'standing-potion',rarity:'common'});
  }
  saveState();closeModal('adminEditModal');renderAdmin();showToast('✓ Recette ajoutée');
}

document.querySelectorAll('.admin-tab').forEach(t=>{
  t.addEventListener('click',()=>{activeAdminTab=t.dataset.admintab;renderAdmin();});
});
$('adminEditCancel').addEventListener('click',()=>{closeModal('adminEditModal');adminEditCtx=null;});
$('adminEditSave').addEventListener('click',()=>{
  if(!adminEditCtx)return;
  if(adminEditCtx.type==='_recipe_blacksmith')saveRecipeEdit('blacksmith');
  else if(adminEditCtx.type==='_recipe_witch')saveRecipeEdit('witch');
  else saveAdminEdit();
});
$('adminEditModal').addEventListener('click',(e)=>{if(e.target.id==='adminEditModal')closeModal('adminEditModal');});

/* BOOT */
function boot(){
  state=loadGame();
  if(!state||!state.player||!state.player.name){
    state=defaultState();state.meta.created_at=new Date().toISOString();
    openModal('welcomeModal');setTimeout(()=>$('nameInput').focus(),300);
  }else{
    if(state.session_current)showView('session');else showView('dashboard');
  }
}

/* LISTENERS */
$('confirmName').addEventListener('click',()=>{
  const name=$('nameInput').value.trim();
  if(name.length<2){showToast('⚠ Au moins 2 caractères');return;}
  state.player.name=name;saveState();closeModal('welcomeModal');showView('dashboard');
  showToast(`⚔ Bienvenue, ${name} !`);
});
$('nameInput').addEventListener('keydown',(e)=>{if(e.key==='Enter')$('confirmName').click();});
$('settingsBtn').addEventListener('click',()=>{$('renameInput').value=state.player.name;openModal('settingsModal');});
$('cancelSettings').addEventListener('click',()=>closeModal('settingsModal'));
$('saveSettings').addEventListener('click',()=>{
  const newName=$('renameInput').value.trim();
  if(newName.length<2){showToast('⚠ Au moins 2 caractères');return;}
  state.player.name=newName;saveState();renderHero();closeModal('settingsModal');
  showToast('✓ Modifications enregistrées');
});
$('resetGame').addEventListener('click',()=>{if(confirm('Êtes-vous sûr ? Toute votre progression sera perdue.')){resetState();location.reload();}});
$('btnStartSession').addEventListener('click',()=>{
  if(state.player.recovering){startRecoverySession();return;}
  showView('pre-session');
});

function startRecoverySession(){
  // Set d'exercices doux pour récupérer (3 exercices au hasard)
  const pool=allExercises();
  const proposed=shuffle(pool).slice(0,3);
  state.session_current={
    startedAt:new Date().toISOString(),
    isRecovery:true,
    exercises:proposed.map(ex=>({id:ex.id,name:ex.name,type:ex.type,baseDamage:ex.baseDamage,group:ex.group,hasWeight:ex.hasWeight,unit:ex.unit||'reps',completed:false,sets:0,reps:0,weight:0,damageDealt:0,recordBeaten:false})),
    totalDamage:0,totalReceived:0,xpEarned:0,
    suggestedSets:2,suggestedReps:8,suggestedSec:20
  };
  saveState();
  showView('session');
  setTimeout(()=>showToast('⚕ Séance de récupération. Termine ces exercices pour revenir avec 50% PV.',4000),300);
}
$('btnInventory').addEventListener('click',()=>showView('inventory'));
$('btnAdmin').addEventListener('click',()=>showView('admin'));

document.querySelectorAll('.session-back').forEach(b=>{
  b.addEventListener('click',()=>{
    const action=b.dataset.back;
    if(action==='abandon'){
      if(state.session_current&&state.session_current.exercises.some(e=>e.completed)){
        if(!confirm('Abandonner la séance ? Vous perdez vos PV restants mais conservez les dégâts infligés au boss.'))return;
      }
      state.session_current=null;saveState();
    }
    showView('dashboard');
  });
});

$('btnLaunchSession').addEventListener('click',()=>{
  const proposed=JSON.parse($('btnLaunchSession').dataset.proposed||'[]');
  const bossId=$('btnLaunchSession').dataset.bossId;
  if(proposed.length===0){showToast('⚠ Aucun exercice proposé');return;}
  startSession(proposed,bossId);
});

['exSets','exReps','exWeight'].forEach(id=>$(id).addEventListener('input',updateDamagePreview));
$('cancelExercise').addEventListener('click',()=>closeModal('exerciseModal'));
$('confirmExercise').addEventListener('click',confirmExerciseSubmission);
$('btnFinishSession').addEventListener('click',finishSession);
$('btnReturnDashboard').addEventListener('click',()=>{closeModal('summaryModal');showView('dashboard');});
$('btnVictoryReturn').addEventListener('click',()=>{closeModal('victoryModal');showView('dashboard');});
$('btnDefeatReturn').addEventListener('click',()=>{closeModal('defeatModal');showView('dashboard');});

document.querySelectorAll('#viewInventory .tab[data-tab]').forEach(t=>{
  t.addEventListener('click',()=>{activeInvTab=t.dataset.tab;renderInventoryView();});
});
document.querySelectorAll('#invTypeFilters .filter-pill').forEach(p=>{
  p.addEventListener('click',()=>{
    document.querySelectorAll('#invTypeFilters .filter-pill').forEach(x=>x.classList.remove('active'));
    p.classList.add('active');invTypeFilter=p.dataset.filter;renderInventoryGrid();
  });
});
$('itemDetailModal').addEventListener('click',(e)=>{if(e.target.id==='itemDetailModal')closeModal('itemDetailModal');});
$('settingsModal').addEventListener('click',(e)=>{if(e.target.id==='settingsModal')closeModal('settingsModal');});

/* Boire potion hors combat */
$('btnDrinkPotionDash').addEventListener('click',drinkPotionOOC);
$('btnDrinkPotionHub').addEventListener('click',drinkPotionOOC);
$('btnDrinkEtherDash').addEventListener('click',drinkEtherOOC);

/* Onglets Marchand */
document.querySelectorAll('[data-merchant]').forEach(b=>{
  b.addEventListener('click',()=>{activeMerchantTab=b.dataset.merchant;renderMerchant();});
});

/* Voyager modal close */
$('zoneTravelClose').addEventListener('click',()=>closeModal('zoneTravelModal'));
$('zoneTravelModal').addEventListener('click',(e)=>{if(e.target.id==='zoneTravelModal')closeModal('zoneTravelModal');});
$('equipPickerClose').addEventListener('click',()=>closeModal('equipPickerModal'));
$('equipPickerModal').addEventListener('click',(e)=>{if(e.target.id==='equipPickerModal')closeModal('equipPickerModal');});

boot();
