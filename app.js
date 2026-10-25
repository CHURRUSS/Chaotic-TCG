import {creatures,gears,mugics,locations,formatName,art,elements,DEFAULT_DECK,getCreature,getGear,getMugic,getLocation} from './data.js';
const root=document.getElementById('app');
const DECK_KEY='chaotic-tcg-deck-alpha-v06', BATTLE_KEY='chaotic-tcg-battle-alpha-1', STATS_KEY='chaotic-tcg-stats-alpha-1';
const clone=x=>JSON.parse(JSON.stringify(x));
const getSave=(k,fallback)=>{try{const a=JSON.parse(localStorage.getItem(k));return a??fallback}catch{return fallback}};
const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(err){console.warn('Armazenamento indisponível',err)}};
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=id=>formatName(id||'');
const photo=(kind,id)=>art(kind,id);
function normalizeDeck(o){let d={creatures:Array(6).fill(null),gears:{},mugics:Array(3).fill(null),locations:[]};
 if(o&&typeof o==='object'){
  if(Array.isArray(o.creatures)){const seen=new Set();d.creatures=Array.from({length:6},(_,i)=>{const id=o.creatures[i];if(!getCreature(id)||seen.has(id))return null;seen.add(id);return id;});}
  if(o.gears&&typeof o.gears==='object'){d.gears={};for(const [c,g] of Object.entries(o.gears))if(getCreature(c)&&getGear(g))d.gears[c]=g;}
  if(Array.isArray(o.mugics)){const seen=new Set();d.mugics=Array.from({length:3},(_,i)=>{const id=o.mugics[i];if(!getMugic(id)||seen.has(id))return null;seen.add(id);return id;});}
  if(Array.isArray(o.locations))d.locations=[...new Set(o.locations.filter(x=>getLocation(x)))].slice(0,locations.length);
  else if(getLocation(o.location))d.locations=[o.location]; // compatibilidade com saves v0.1
 }
 return d;
}
let deck=normalizeDeck(getSave(DECK_KEY,null));let battle=getSave(BATTLE_KEY,null);
if(!battle||!Array.isArray(battle.hero)||!Array.isArray(battle.foe)||!Array.isArray(battle.mugics))battle=null;
// Migra batalhas antigas para o modo de preparação, sem apagar vida nem resultados.
if(battle&&!battle.winner&&!battle.phase){battle.phase='selection';battle.turn='select';battle.locationQueue=[];battle.locations=[battle.location||'Riverlands'];battle.duel=1;}
let stats=getSave(STATS_KEY,{wins:0,losses:0});
let page='deck',tab='creatures',slotSelection=0,mugicSelection=0,wheelType='creature',wheelIndex={creature:4,gear:0,mugic:0,location:0},wheelMotionKind=null,wheelMotionDir=0,modal=null,toastTimer=null,aiTimer=null,locationSpinning=false,locationSpinTimer=null,soundEnabled=getSave('chaotic-sound-v05',true),soundCtx=null;

// Sons eletrônicos originais gerados por Web Audio; nenhum arquivo sonoro do desenho é copiado.
function audioPulse(kind='tick'){
 if(!soundEnabled)return;
 try{
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  if(!soundCtx)soundCtx=new AC();
  if(soundCtx.state==='suspended')soundCtx.resume().catch(()=>{});
  const now=soundCtx.currentTime;
  const tones={tick:[460,610,.045,.035,'square'],drop:[520,850,.14,.065,'sine'],reveal:[190,770,.35,.095,'sawtooth'],click:[550,650,.06,.035,'sine'],combat:[180,80,.22,.055,'triangle']};
  const [a,b,dur,vol,wave]=tones[kind]||tones.tick;
  const o=soundCtx.createOscillator(),g=soundCtx.createGain();o.type=wave;o.frequency.setValueAtTime(a,now);o.frequency.exponentialRampToValueAtTime(Math.max(1,b),now+dur);
  g.gain.setValueAtTime(.001,now);g.gain.exponentialRampToValueAtTime(vol,now+.012);g.gain.exponentialRampToValueAtTime(.001,now+dur);
  o.connect(g);g.connect(soundCtx.destination);o.start(now);o.stop(now+dur+.01);
 }catch(e){console.debug('Áudio indisponível',e)}
}
const creatureCount=()=>deck.creatures.filter(Boolean).length;
const mugicCount=()=>deck.mugics.filter(Boolean).length;
const FORM_LANES=[1,.5,1.5,0,1,2], FORM_DEPTH=[2,1,1,0,0,0];
// Protótipo inspirado na formação do desenho: uma criatura cobre as posições atrás dela.
function exposedIndices(team){return team.flatMap((unit,i)=>{if(!unit||(typeof unit==='object'&&unit.hp<=0))return [];const blocked=team.some((ahead,j)=>j!==i&&ahead&&(typeof ahead==='string'||ahead.hp>0)&&FORM_DEPTH[j]<FORM_DEPTH[i]&&Math.abs(FORM_LANES[i]-FORM_LANES[j])<.76);return blocked?[]:[i]})}
function legalTargets(heroIndex){if(heroIndex<0||!battle?.hero?.[heroIndex]||!exposedFor('hero').includes(heroIndex))return [];const p=getHeroPosition(heroIndex);return exposedFor('foe').filter(i=>Math.abs(FORM_LANES[p.slot]-FORM_LANES[i])<=(p.side==='right'?1.51:1.01))}
// Casas do tabuleiro preservam a identidade de cada criatura: a movimentação não troca o dono da carta.
function ensurePositions(){
 if(!battle)return;
 if(!Array.isArray(battle.heroPositions)||battle.heroPositions.length!==6)
  battle.heroPositions=Array.from({length:6},(_,i)=>({side:'left',slot:i}));
}
function getHeroPosition(i){ensurePositions();return battle.heroPositions[i]||{side:'left',slot:i}}
function heroAt(side,slot){if(!battle)return -1;ensurePositions();return battle.heroPositions.findIndex((p,i)=>p.side===side&&p.slot===slot&&battle.hero[i]?.hp>0)}
function occupied(side,slot){
 if(!battle)return null;
 const h=heroAt(side,slot);
 if(h>=0)return {unit:battle.hero[h],owner:'hero',index:h};
 if(side==='right'&&battle.foe[slot]?.hp>0)return {unit:battle.foe[slot],owner:'foe',index:slot};
 return null;
}
function exposedFor(side){
 if(!battle)return [];
 const roster=battle[side];
 return roster.flatMap((u,i)=>{
  if(!u||u.hp<=0)return [];
  const pos=side==='hero'?getHeroPosition(i):{side:'right',slot:i};
  const blocked=roster.some((other,j)=>{
   if(i===j||!other||other.hp<=0)return false;
   const q=side==='hero'?getHeroPosition(j):{side:'right',slot:j};
   return pos.side===q.side && FORM_DEPTH[q.slot]<FORM_DEPTH[pos.slot] && Math.abs(FORM_LANES[pos.slot]-FORM_LANES[q.slot])<.76;
  });
  return blocked?[]:[i];
 });
}
function advanceTargets(){
 if(!battle||battle.phase!=='advance')return [];
 return battle.foe.flatMap((enemy,i)=>enemy.hp<=0&&!occupied('right',i)?[i]:[]);
}
function moveChampion(slot){
 if(!battle||battle.phase!=='advance'||!advanceTargets().includes(slot))return;
 const i=battle.advanceIndex;
 if(!Number.isInteger(i)||battle.hero[i]?.hp<=0)return;
 const source=getHeroPosition(i);
 battle.heroPositions[i]={side:'right',slot};
 logMessage(`↗ ${label(battle.hero[i].id)} avançou para a casa ${slot+1} do adversário.`);
 audioPulse('drop');saveBattle();selectionPhase('O campeão avançou! Gire a roleta de locais para o próximo duelo.');
}
function stayChampion(){if(!battle||battle.phase!=='advance')return;selectionPhase('O campeão manteve sua posição. Gire a roleta para o próximo duelo.');}
function victoryAdvance(){
 if(allDead(battle.foe)){finish('hero');return}
 battle.phase='advance';battle.turn='move';battle.advanceIndex=battle.activeH;
 battle.activeE=-1;
 logMessage(`✓ ${label(battle.hero[battle.advanceIndex].id)} venceu! Escolha uma casa vazia para avançar.`);
 saveBattle();render();
}
const pending=()=>Boolean(aiTimer);
const saveDeck=()=>store(DECK_KEY,deck);
const saveBattle=()=>{if(battle)store(BATTLE_KEY,battle)};
const eraseBattle=()=>{battle=null;localStorage.removeItem(BATTLE_KEY)};
function toast(msg){document.querySelector('.toast')?.remove();clearTimeout(toastTimer);const n=document.createElement('div');n.className='toast';n.role='status';n.textContent=msg;document.body.append(n);toastTimer=setTimeout(()=>n.remove(),2700)}
function header(){return `<header class="site-head"><img class="brand-logo" src="assets/ui/logo.webp" alt="Chaotic"><span class="brand-copy"><strong>CHAOTIC TCG</strong><small>BATTLEDROME · ROLETAS 0.7</small></span><div class="header-actions"><button class="btn sm ghost sound-toggle" data-act="soundToggle" aria-label="Alternar efeitos sonoros" aria-pressed="${soundEnabled}">${soundEnabled?'♪ SOM':'♪ MUDO'}</button><button class="btn sm ghost" data-act="home">⌂ Início</button><button class="btn sm ${page==='deck'?'primary':'ghost'}" data-act="deck">▦ Minha equipe</button>${battle?`<button class="btn sm ${page==='battle'?'primary':'ghost'}" data-act="resume">⚔ Arena</button>`:''}</div></header>`}
function home(){return `<div class="bd-page bd-home"><div class="bd-kicker">INTERFACE DE PERIM <span>▸</span> BATTLEDROME</div><section class="bd-board bd-home-stage">
  ${bdBoardDecor('home')}
  <div class="bd-home-copy"><span class="bd-tag">SISTEMA DE BATALHA INICIADO</span><h1>ENTRE NO<br><em>BATTLEDROME</em></h1><p>Forme seu exército. Escolha os locais. Revele o cenário e decida quem enfrentará quem.</p><div class="bd-buttons"><button class="bd-btn gold" data-act="deck">PREPARAR EXÉRCITO</button><button class="bd-btn" data-act="${battle?'resume':'start'}">${battle?'CONTINUAR BATALHA':'INICIAR BATALHA'}</button></div></div>
  <div class="bd-home-pair"><img src="${photo('creature','Maxxor')}" alt="Maxxor"><img src="${photo('creature','Chaor')}" alt="Chaor"></div>
  ${bdLocationHand(deck.locations, false)}
 </section><p class="bd-hint">ALPHA NÃO OFICIAL · Arte extraída do CAPX fornecido · Mecânicas experimentais por turnos</p></div>`;}
function slotCard(id,i){return `<button type="button" class="squad-slot ${slotSelection===i?'active':''}" data-act="slot" data-i="${i}" aria-label="Posição ${i+1}: ${id?label(id):'vazia'}">${id?`<img src="${photo('creature',id)}" alt=""><span class="number">0${i+1}</span><strong>${safe(label(id))}</strong>${deck.gears[id]?'<span class="gear-dot">⚙</span>':''}`:`<span class="empty"><b>＋</b><br>Posição ${i+1}</span>`}</button>`}
function sideDeck(){const selected=deck.creatures[slotSelection];return `<section class="panel panel-pad"><div class="section-head"><div><h2>Meu exército</h2><p>Selecione uma posição, depois escolha uma criatura.</p></div><span class="pill">${creatureCount()}/6</span></div><div class="squad-grid show-formation">${Array.from({length:6},(_,i)=>slotCard(deck.creatures[i],i)).join('')}</div><div class="deck-progress"><span><b>${deck.creatures.length}/6</b> criaturas</span><span>·</span><span><b>${mugicCount()}/3</b> Mugics</span><span>·</span><span><b>${deck.locations.length}/${locations.length}</b> locais</span><span>·</span><span><b>${Object.keys(deck.gears).filter(x=>deck.creatures.includes(x)).length}</b> equipadas</span></div>${selected?`<div class="deck-control"><b>Posição ${slotSelection+1}: ${safe(label(selected))}</b><p>${safe(getCreature(selected).flavor)}</p><div class="row" style="flex-wrap:wrap"><button class="btn sm" data-act="gearModal">⚙ ${deck.gears[selected]?label(deck.gears[selected]):'Equipar'}</button><button class="btn sm warn" data-act="removeCreature" data-id="${selected}">× Remover</button></div></div>`:`<div class="deck-control"><b>Posição ${slotSelection+1} vazia</b><p>Escolha uma criatura na lista ao lado para preenchê-la.</p></div>`}<div class="deck-control"><b>Mugics preparados</b><div class="mugic-list" style="margin-top:9px">${deck.mugics.map(id=>`<div class="mugic-row"><span>🎵 ${safe(label(id))}</span><button class="btn sm ghost" data-act="toggleMugic" data-id="${id}" aria-label="Remover ${label(id)}">×</button></div>`).join('')||'<p class="muted">Nenhum Mugic selecionado.</p>'}</div></div><div class="deck-control"><b>Deck de locais · sorteio automático</b><p>${deck.locations.length?deck.locations.map(x=>safe(label(x))).join(' • '):'Nenhum local selecionado. Marque pelo menos um.'}</p><p class="hint-line">O jogo embaralha os locais escolhidos e revela um a cada confronto, antes de você escolher quem enfrenta quem.</p></div><button class="btn primary wide" style="margin-top:14px" data-act="start" ${deck.creatures.length!==6||!deck.locations.length?'disabled':''}>⚔ Entrar na arena com esta equipe</button><div class="deck-preset" style="margin-top:10px"><button class="btn sm ghost" data-act="preset">↺ Restaurar equipe inicial</button><button class="btn sm ghost" data-act="clearDeck">Limpar equipe</button></div></section>`}
function catalogCard(kind,obj){let chosen=false,description='',act='',button='Adicionar',cls='';
 if(kind==='creature'){chosen=deck.creatures.includes(obj.id);description=`${obj.tribe==='overworld'?'OverWorld':'UnderWorld'} · ${elements[obj.element][1]} ${elements[obj.element][0]} · Vida ${obj.hp}`;act='chooseCreature';button=chosen?'✓ Selecionado':'＋ Selecionar'}
 if(kind==='gear'){chosen=Boolean(deck.creatures[slotSelection]&&deck.gears[deck.creatures[slotSelection]]===obj.id);description=obj.text;act='chooseGear';button=chosen?'✓ Equipado':'⚙ Equipar'}
 if(kind==='mugic'){chosen=deck.mugics.includes(obj.id);description=obj.text;act='toggleMugic';button=chosen?'✓ Preparado':'＋ Preparar'}
 if(kind==='location'){chosen=deck.locations.includes(obj.id);description=obj.text;act='chooseLocation';button=chosen?'✓ No deck':'＋ Incluir';cls='location'}
 return `<article class="catalog-card ${chosen?'chosen':''} ${cls}">${chosen?'<span class="marker">✓</span>':''}<img loading="lazy" src="${photo(kind,obj.id)}" alt="${safe(label(obj.id))}"><strong>${safe(label(obj.id))}</strong><div class="meta">${safe(description)}</div><button class="btn sm ${chosen?'ghost':'primary'}" data-act="${act}" data-id="${obj.id}">${button}</button></article>`
}
function bdLogo(){return `<div class="bd-logo-mark" aria-hidden="true"><span></span></div>`}
function bdBoardDecor(mode='prep'){return `<div class="bd-big-emblem">${bdLogo()}</div><div class="bd-board-rim"></div><div class="bd-system-code">LUL3&nbsp; VB97&nbsp; GTJ4</div><span class="bd-top-chip">${mode==='prep'?'FORMAÇÃO DO EXÉRCITO':mode==='selection'?'LOCAL REVELADO':mode==='duel'?'BATALHA ATIVA':'CHAOTIC · PERIM'}</span><div class="bd-rail bd-rail-left">${bdHexRail(mode==='home'?[]:mode==='prep'?deck.creatures:(battle?.hero||[]),'left')}</div><div class="bd-rail bd-rail-right">${bdHexRail(mode==='home'?[]:(battle?.foe||[]),'right')}</div>`}
function bdHexRail(items,side){return Array.from({length:6},(_,i)=>{let item=items[i],present=Boolean(item&&(typeof item==='string'||item.hp>0));if(battle&&page==='battle'){present=Boolean(occupied(side,i));}let active=side==='left'&&battle?.activeH===i||side==='right'&&battle?.activeE===i;return `<div class="bd-hex ${present?'filled':''} ${active?'lit':''}" title="${side==='left'?'Sua':'Adversária'} posição ${i+1}"><span></span></div>`}).join('')}
function bdCardBack(){return `<span class="bd-card-symbol">${bdLogo()}</span>`}
const positions=['p1','p2','p3','p4','p5','p6'];
function bdSquad(cards,side,mode='prep'){
 const choosing=mode==='selection',advancing=mode==='advance';
 const allowedHero=choosing?exposedFor('hero'):[];
 const allowedFoe=choosing&&battle.activeH>=0?legalTargets(battle.activeH):[];
 const advanceCells=advancing?advanceTargets():[];
 return `<div class="bd-squad bd-squad-${side}">${Array.from({length:6},(_,slot)=>{
  const pos=mode==='prep'?null:occupied(side,slot);
  const item=mode==='prep'?cards[slot]:pos?.unit;
  const id=typeof item==='string'?item:item?.id;
  const owner=mode==='prep'?'hero':pos?.owner;
  const index=mode==='prep'?slot:pos?.index;
  const vacant=mode!=='prep'&&!pos;
  const champion=side==='right'&&owner==='hero';
  const dead=vacant&&side==='right'&&battle?.foe[slot]?.hp<=0;
  const active=mode==='prep'?slotSelection===slot:choosing?(owner==='hero'&&battle.activeH===index||owner==='foe'&&battle.activeE===index):advancing&&champion&&battle.advanceIndex===index;
  const allowed=choosing?(owner==='hero'?allowedHero.includes(index):owner==='foe'&&allowedFoe.includes(index)):false;
  const canAdvance=advancing&&side==='right'&&advanceCells.includes(slot);
  const invalid=choosing&&!allowed;
  const action=mode==='prep'?'slot':choosing&&pos?'pickFighter':canAdvance?'advanceChampion':'';
  const attr=action?`data-act="${action}" data-i="${action==='advanceChampion'?slot:index}"${action==='pickFighter'?` data-side="${owner}"`:''}`:'';
  const drag=mode==='prep'?`data-drop-kind="creature" data-drop-i="${slot}"`:'';
  const gearMark=mode==='prep'&&id&&deck.gears[id]?`<span class="bd-slot-gear">⚙</span>`:'';
  return `<button type="button" class="bd-unit ${positions[slot]} ${active?'chosen':''} ${vacant?'unfilled':''} ${dead?'bd-empty-defeat':''} ${invalid?'blocked':''} ${champion?'bd-occupied-hero':''} ${canAdvance?'bd-advance-target':''}" ${attr} ${drag} ${!action||invalid?'disabled':''} aria-label="${canAdvance?'Avançar campeão para casa '+(slot+1):champion?'Seu campeão avançado':side==='left'?'Sua equipe':'Equipe rival'}${id?': '+safe(label(id)):' · casa vazia'}"><span class="bd-card-portrait">${id?`<img src="${photo('creature',id)}" alt="${safe(label(id))}">`:canAdvance?'<b class="bd-move-icon">↗</b>':bdCardBack()}</span><span class="bd-unit-number">0${slot+1}</span>${champion?'<span class="bd-hero-mark">SEU</span>':''}${gearMark}${item&&typeof item==='object'?`<span class="bd-life" style="--life:${Math.max(0,item.hp/item.maxHp*100)}%"></span>`:''}</button>`;
 }).join('')}</div>`;
}

function bdLocationHand(ids=[],interactive=false,activeId=null){
 return `<div class="bd-location-hand" aria-label="Baralho de locais"><span class="bd-hand-label">LOCAIS · ${ids.length}/5</span><div class="bd-hand-cards">${locations.map((loc,i)=>{const selected=ids.includes(loc.id);return `<button class="bd-location-card loc-${i+1} ${selected?'on':'off'} ${activeId===loc.id?'current':''}" data-act="${interactive?'chooseLocation':'noop'}" ${interactive?'data-drop-kind="location" data-drop-i="0"':''} data-id="${loc.id}" ${!interactive?'disabled':''} aria-pressed="${selected}" title="${safe(label(loc.id))}"><img src="${photo('location',loc.id)}" alt="${safe(label(loc.id))}"><small>${safe(label(loc.id))}</small></button>`}).join('')}</div></div>`;
}
const WHEEL_TYPES={creature:{list:creatures,title:'CRIATURAS',help:'Arraste uma criatura da roleta para um dos seis espaços.'},gear:{list:gears,title:'EQUIPAMENTOS',help:'Arraste o equipamento para cima de uma criatura já posicionada.'},location:{list:locations,title:'LOCAIS',help:'Toque no local do leitor para incluir ou remover do sorteio.'},mugic:{list:mugics,title:'MUGIC',help:'Arraste o Mugic para um dos três espaços de magia.'}};
function wheelCard(kind,index,role){const list=WHEEL_TYPES[kind].list;const o=list[(index+list.length)%list.length];return `<button type="button" class="bd-vreel-item ${role}" data-wheel-kind="${kind}" data-wheel-id="${o.id}" data-act="wheelApply" ${role!=='current'?'tabindex="-1"':''} aria-label="${safe(label(o.id))}"><img draggable="false" src="${photo(kind,o.id)}" alt="${safe(label(o.id))}"><span>${safe(label(o.id))}</span></button>`;}
function bdReel(kind){const def=WHEEL_TYPES[kind],idx=wheelIndex[kind],count=def.list.length;
 return `<section class="bd-vreel ${wheelMotionKind===kind?(wheelMotionDir>0?'spin-up':'spin-down'):''}" data-reel-kind="${kind}" aria-label="Roleta vertical de ${def.title}"><div class="bd-vreel-title">${kind==='creature'?'◈':kind==='gear'?'⚙':kind==='location'?'⬡':'♫'} ${def.title}</div>
  <button class="bd-vreel-arrow" data-act="wheelTurn" data-id="${kind}" data-dir="-1" aria-label="Anterior na roleta ${def.title}">⌃</button>
  <div class="bd-vreel-window" data-reel="${kind}"><div class="bd-vreel-track">${wheelCard(kind,idx-1,'prev')}${wheelCard(kind,idx,'current')}${wheelCard(kind,idx+1,'next')}</div></div>
  <button class="bd-vreel-arrow" data-act="wheelTurn" data-id="${kind}" data-dir="1" aria-label="Próxima na roleta ${def.title}">⌄</button>
  <div class="bd-vreel-name">${safe(label(def.list[idx%count].id))}</div></section>`;
}
function bdWheel(){return `<div class="bd-wheel-station bd-vertical-station" aria-label="Quatro roletas verticais independentes">${['creature','location','mugic','gear'].map(bdReel).join('')}<div class="bd-vreel-help">↕ Deslize para girar · arraste criaturas, equipamentos e Mugic · toque no local para adicionar</div></div>`;}
function bdLocationSpinner(){const ids=battle?.locations?.length?battle.locations:locations.map(l=>l.id);
 const reel=Array.from({length:8},()=>ids.map(id=>`<div class="bd-location-reel-card" data-location-id="${id}"><img src="${photo('location',id)}" alt=""><span>${safe(label(id))}</span></div>`).join('')).join('');
 return `<div class="bd-location-randomizer"><div class="bd-location-title">LOCALIZADOR · SORTEIO DO CENÁRIO</div><div class="bd-location-viewport"><div class="bd-location-reel-track">${reel}</div><span class="bd-location-pointer"></span></div><p>${locationSpinning?'LOCALIZANDO CENÁRIO…':'O jogador atacante gira a roleta para revelar o próximo local.'}</p><button class="bd-btn gold bd-spin-button" data-act="spinLocation" ${locationSpinning?'disabled':''}>${locationSpinning?'◌ GIRANDO…':'↔ GIRAR ROLETA DE LOCAIS'}</button></div>`;
}
function bdScanner(){
 const config=WHEEL_TYPES[wheelType]||WHEEL_TYPES.creature;
 const card=config.list[wheelIndex[wheelType]%config.list.length];
 const colors={creature:'CRIATURA',gear:'EQUIPAMENTO',mugic:'MUGIC',location:'LOCAL'};
 const stat=wheelType==='creature'?`<span>ENERGIA <b>${card.hp}</b></span><span>⚔ ${card.power}</span><span>✦ ${card.wisdom}</span><span>⚡ ${card.speed}</span>`:wheelType==='location'?`<span>${safe(card.text||'Local para o próximo sorteio')}</span>`:wheelType==='gear'?`<span>${safe(card.text||'Equipamento')}</span>`:`<span>${safe(card.text||'Magia de Perim')}</span>`;
 return `<aside class="bd-prep-scanner" aria-label="Leitor de cartas com roletas como no CAPX">
    <div class="bd-scan-screen"><span class="bd-scan-heading">◈ LEITOR DE CARTAS · ${colors[wheelType]}</span>
     <button class="bd-scan-feature" data-act="wheelApply" data-wheel-kind="${wheelType}" data-wheel-id="${card.id}" aria-label="Arrastar ${safe(label(card.id))} para o painel"><img draggable="false" src="${photo(wheelType,card.id)}" alt="${safe(label(card.id))}"></button>
     <div class="bd-scan-details"><strong>${safe(label(card.id))}</strong><div class="bd-scan-stats">${stat}</div></div>
    </div>
    ${bdWheel()}
    <span class="bd-scanner-hint">↕ Quatro roletas como no CAPX · arraste a carta ou toque no local →</span>
   </aside>`;
}
function bdMugicSlots(){return `<div class="bd-drop-row" aria-label="Três espaços de Mugic"><span>PORTA-MUGIC</span><div class="bd-mugic-targets">${Array.from({length:3},(_,i)=>{const id=deck.mugics[i];return `<button class="bd-mugic-target ${mugicSelection===i?'selected':''}" data-drop-kind="mugic" data-drop-i="${i}" data-act="mugicSlot" data-i="${i}" aria-label="Mugic ${i+1}${id?': '+safe(label(id)):': vazio'}">${id?`<img src="${photo('mugic',id)}" alt="${safe(label(id))}">`:`<b>✦</b>`}<small>${i+1}</small></button>`}).join('')}</div><small>Arraste cartas da roleta para equipar · toque no espaço para selecioná-lo</small></div>`}
function deckPage(){const selected=deck.creatures[slotSelection];return `<div class="bd-page bd-prep-page bd-capx-prep"><div class="bd-kicker">01 / PREPARAÇÃO <span>▸</span> GIRE · SELECIONE · ARRASTE</div>
 <section class="bd-board bd-preparation" aria-label="Painel de montagem do CAPX: apenas seu exército">${bdBoardDecor('prep')}
 ${bdScanner()}
 <div class="bd-board-head"><span>SEU EXÉRCITO <b>${creatureCount()}/6</b> · POSICIONE AS CARTAS</span></div>
 ${bdSquad(deck.creatures,'left','prep')}
 ${bdLocationHand(deck.locations,true)}
 ${bdMugicSlots()}
 </section>
 <div class="bd-command-row bd-prep-actions"><div><strong>${creatureCount()}/6 CRIATURAS · ${mugicCount()}/3 MUGICS · ${deck.locations.length} LOCAIS</strong><small>${selected?safe(label(selected))+' · ':''}No celular: toque no espaço e depois na carta do leitor.</small></div><div class="bd-command-buttons"><button class="bd-btn muted" data-act="clearDeck">LIMPAR</button>${selected?`<button class="bd-btn muted" data-act="removeCreatureSlot">RETIRAR</button>`:''}<button class="bd-btn gold" data-act="start" ${creatureCount()!==6||!deck.locations.length?'disabled':''}>INICIAR PARTIDA ▸</button></div></div>
 </div>`;}

function createCombatant(id,gear){const def=getCreature(id);const bonus=getGear(gear);const base={id,hp:def.hp,maxHp:def.hp,power:def.power,speed:def.speed,wisdom:def.wisdom,shield:0,element:def.element,tribe:def.tribe,gear:gear||null};if(bonus){if(bonus.stat==='hp'){base.hp+=bonus.bonus;base.maxHp+=bonus.bonus}else base[bonus.stat]+=bonus.bonus;}return base}
const foeRoster=['Lord_Van_Bloot','Rarran','Takinon','Nauthilax','Chaor','Tangath_Toborn'];
function shuffle(array){const a=[...array];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function revealLocation(){
 if(!battle.locationQueue?.length)battle.locationQueue=shuffle(battle.locations);
 battle.location=battle.locationQueue.shift();
}
function selectionPhase(message){
 if(allDead(battle.foe)){finish('hero');return}
 if(allDead(battle.hero)){finish('foe');return}
 battle.phase='reveal';battle.turn='reveal';battle.activeH=-1;battle.activeE=-1;
 battle.duel=(battle.duel||0)+1;
 battle.location=null;logMessage(message||'O local será sorteado. Gire a roleta horizontal.');saveBattle();render();
}
function makeBattle(){const order=shuffle(foeRoster);
 battle={hero:deck.creatures.map(id=>createCombatant(id,deck.gears[id])),foe:order.map((id,i)=>createCombatant(id,gears[(i*2+3)%gears.length].id)),activeH:-1,activeE:-1,round:1,duel:0,mugics:deck.mugics.map(id=>({id,used:false})),locations:[...deck.locations],locationQueue:[],location:null,heroPositions:Array.from({length:6},(_,i)=>({side:'left',slot:i})),phase:'selection',log:[],turn:'select',lastHeavy:false,winner:null};
 selectionPhase('🌀 O BattleDrome revelou o primeiro local. Escolha seu confronto.');
}
function chooseFighter(side,index){
 if(!battle||battle.phase!=='selection'||!['hero','foe'].includes(side))return;
 const arr=battle[side];if(!arr[index]||arr[index].hp<=0)return;
 if(side==='hero'){
  if(!exposedFor('hero').includes(index)){toast('Esta criatura está protegida por outra à frente.');return;}
  battle.activeH=index;
  if(!legalTargets(index).includes(battle.activeE))battle.activeE=-1;
 }else{
  if(battle.activeH<0){toast('Escolha primeiro sua criatura atacante.');return;}
  if(!legalTargets(battle.activeH).includes(index)){toast('Esse adversário não está ao alcance desta criatura.');return;}
  battle.activeE=index;
 }
 saveBattle();render();
}
function startDuel(){
 if(!battle||battle.phase!=='selection'||battle.activeH<0||battle.activeE<0){toast('Selecione uma criatura sua e um adversário.');return;}
 if(!exposedFor('hero').includes(battle.activeH)||!legalTargets(battle.activeH).includes(battle.activeE)){toast('Alvo bloqueado pela formação. Escolha outra criatura à frente.');battle.activeE=-1;render();return;}
 const h=getH(),e=getE(),loc=getLocation(battle.location);
 // Iniciativa simplificada inspirada nos locais de Chaotic, não regra oficial.
 const stat=loc?.element==='fire'?'power':loc?.element==='water'?'wisdom':'speed';
 battle.phase='duel';battle.turn=(h[stat]>=e[stat])?'player':'enemy';
 logMessage(`⚔ ${label(h.id)} enfrenta ${label(e.id)} em ${label(battle.location)}. Iniciativa: ${label(battle.turn==='player'?h.id:e.id)} (${stat}).`);
 saveBattle();render();
 if(battle.turn==='enemy'){clearTimeout(aiTimer);aiTimer=setTimeout(enemyTurn,700);}
}
function logMessage(s){if(!battle)return;battle.log=[{text:s,id:Date.now()+Math.random()},...battle.log].slice(0,18)}
const getH=()=>battle.hero[battle.activeH];const getE=()=>battle.foe[battle.activeE];
const allDead=a=>a.every(x=>x.hp<=0);
function nextLiving(side){let v=battle[side],key=side==='hero'?'activeH':'activeE';if(v[battle[key]]?.hp>0)return;const target=v.findIndex(x=>x.hp>0);if(target>=0){battle[key]=target;logMessage(`${label(v[target].id)} entrou na batalha.`)}}
function finish(winner){if(!battle||battle.winner)return;battle.winner=winner;battle.turn='ended';if(winner==='hero')stats.wins=(stats.wins||0)+1;else stats.losses=(stats.losses||0)+1;store(STATS_KEY,stats);saveBattle();page='result';render()}
function receive(target,amount){let damage=Math.max(0,Math.round(amount));let absorbed=Math.min(target.shield,damage);target.shield-=absorbed;damage-=absorbed;target.hp=Math.max(0,target.hp-damage);return {damage,absorbed}}
function attackValue(attacker,move){let bonus=getLocation(battle.location)?.element===attacker.element?5:0;
 const elemental=move==='element';const quick=move==='quick';
 let amount=quick?Math.round(9+attacker.speed*.81):elemental?Math.round(13+attacker.power*.88+bonus):Math.round(12+attacker.power*.75);
 if(quick&&Math.random()<.20){amount+=10;return {amount,crit:true}}
 if(quick&&battle.location==='The_Storm_Tunnel')amount+=4;
 return {amount,crit:false}
}
function afterPlayerMove(){if(allDead(battle.foe)){finish('hero');return}if(getE().hp<=0){victoryAdvance();return;}battle.turn='enemy';saveBattle();render();clearTimeout(aiTimer);aiTimer=setTimeout(enemyTurn,760)}
function doMove(move){if(!battle||battle.phase!=='duel'||battle.turn!=='player'||pending())return;const actor=getH(),enemy=getE();
 if(move==='guard'){let points=Math.round(16+actor.wisdom*.6);actor.shield=Math.min(70,actor.shield+points);logMessage(`🛡 ${label(actor.id)} preparou defesa (+${points} de barreira).`)}
 else{const v=attackValue(actor,move),hit=receive(enemy,v.amount),title=move==='quick'?'Ataque veloz':move==='element'?'Golpe elemental':'Golpe direto';logMessage(`⚔ ${label(actor.id)} usou ${title}: ${hit.damage} de dano${hit.absorbed?` (${hit.absorbed} absorvidos)`:''}${v.crit?' · CRÍTICO!':''}.`)}
 afterPlayerMove();
}
function useMugic(index){if(!battle||battle.phase!=='duel'||battle.turn!=='player'||pending())return;const spell=battle.mugics[index];if(!spell||spell.used)return;
 const m=getMugic(spell.id),hero=getH(),foe=getE();spell.used=true;
 if(m.effect==='heal'){const gained=Math.min(m.value,hero.maxHp-hero.hp);hero.hp+=gained;logMessage(`🎵 ${label(m.id)} restaurou ${gained} de vida.`)}
 if(m.effect==='shield'){hero.shield=Math.min(80,hero.shield+m.value);logMessage(`🎵 ${label(m.id)} criou uma barreira de ${m.value}.`)}
 if(m.effect==='strike'){const hit=receive(foe,m.value);logMessage(`🎵 ${label(m.id)} causou ${hit.damage} de dano mágico.`)}
 if(m.effect==='weaken'){foe.power=Math.max(5,foe.power-m.value);logMessage(`🎵 ${label(m.id)} reduziu o poder de ${label(foe.id)}.`)}
 if(m.effect==='boost'){hero.power+=m.value;logMessage(`🎵 ${label(m.id)} aumentou o poder de ${label(hero.id)}.`)}
 afterPlayerMove();
}
function switchHero(index){if(battle?.phase==='selection')chooseFighter('hero',index);else toast('As criaturas ficam definidas durante o confronto.');}
function enemyTurn(){aiTimer=null;if(!battle||battle.turn!=='enemy'||battle.winner)return;const enemy=getE(),hero=getH();
 const moves=['basic','basic','element','quick','guard'];let move=moves[Math.floor(Math.random()*moves.length)];
 if(move==='guard'){const shield=Math.round(8+enemy.wisdom*.45);enemy.shield=Math.min(55,enemy.shield+shield);logMessage(`🛡 ${label(enemy.id)} reforçou sua defesa (+${shield}).`)}
 else{const value=attackValue(enemy,move),hit=receive(hero,Math.round(value.amount*.79));logMessage(`⚔ ${label(enemy.id)} atacou ${label(hero.id)}: ${hit.damage} de dano${hit.absorbed?` (${hit.absorbed} bloqueados)`:''}.`)}
 if(allDead(battle.hero)){finish('foe');return}if(hero.hp<=0){selectionPhase(`✕ ${label(hero.id)} foi derrotado. Um novo local será revelado.`);return;}battle.turn='player';battle.round++;saveBattle();render();
}
function fighter(o,side){return `<div class="fighter ${side==='enemy'?'enemy':''}"><img class="card-img" src="${photo('creature',o.id)}" alt="${safe(label(o.id))}"><div class="fighter-label">${safe(label(o.id))}</div><div class="hp-track" aria-label="Vida de ${label(o.id)}"><i style="width:${Math.max(0,Math.min(100,o.hp/o.maxHp*100))}%"></i></div><div class="hp-value">${o.hp} / ${o.maxHp} VIDA ${o.shield?' · 🛡 '+o.shield:''}</div><div class="fighter-stats"><span>⚔ ${o.power}</span><span>⚡ ${o.speed}</span><span>✦ ${o.wisdom}</span><span>${elements[o.element][1]}</span></div></div>`}
function lineupItem(o,i){return `<button class="lineup-btn ${i===battle.activeH?'current':''} ${o.hp<=0?'dead':''}" data-act="switch" data-i="${i}" title="${safe(label(o.id))} · ${o.hp}/${o.maxHp}" ${o.hp<=0||battle.phase!=='selection'||pending()?'disabled':''}><img src="${photo('creature',o.id)}" alt="${safe(label(o.id))}"><span>${o.hp}/${o.maxHp}</span></button>`}
function pickCard(o,i,side){const active=battle[side==='hero'?'activeH':'activeE']===i;return `<button type="button" class="pick-creature ${active?'selected':''} ${o.hp<=0?'defeated':''}" data-act="pickFighter" data-side="${side}" data-i="${i}" ${o.hp<=0?'disabled':''} aria-pressed="${active}"><img src="${photo('creature',o.id)}" alt="${safe(label(o.id))}"><span>${safe(label(o.id))}</span><small>${o.hp} / ${o.maxHp} vida</small></button>`;}
function spinLocation(){
 if(!battle||battle.phase!=='reveal'||locationSpinning)return;
 locationSpinning=true;audioPulse('reveal');render();
 // Sorteio é definido antes da animação; o tambor para de verdade no local escolhido.
 revealLocation();saveBattle();
 const viewport=document.querySelector('.bd-location-viewport');
 const track=document.querySelector('.bd-location-reel-track');
 const cards=[...document.querySelectorAll('.bd-location-reel-card')];
 if(!viewport||!track||!cards.length){finishLocationSpin();return}
 const chosen=battle.location;
 const candidates=cards.map((el,i)=>({el,i})).filter(({el})=>el.dataset.locationId===chosen);
 const target=candidates[Math.min(5,candidates.length-1)]?.el||cards[cards.length-2];
 const center=(el)=>el.offsetLeft+el.offsetWidth/2;
 const vw=viewport.clientWidth;
 const startX=vw/2-center(cards[Math.min(2,cards.length-1)]);
 const finishX=vw/2-center(target);
 // Translação em pixels no próprio elemento; não depende de animação CSS em porcentagem.
 track.style.transform=`translateX(${startX}px)`;
 const duration=2400;
 const animation=track.animate([
  {transform:`translateX(${startX}px)`,offset:0},
  {transform:`translateX(${startX+(finishX-startX)*.30}px)`,offset:.25},
  {transform:`translateX(${startX+(finishX-startX)*.70}px)`,offset:.62},
  {transform:`translateX(${finishX}px)`,offset:1}
 ],{duration,easing:'cubic-bezier(.08,.66,.18,1)',fill:'forwards'});
 let count=0;
 locationSpinTimer=setInterval(()=>{if(++count%2===0)audioPulse('tick')},150);
 const complete=()=>{
  if(!locationSpinning)return;
  animation.cancel();track.style.transform=`translateX(${finishX}px)`;
  finishLocationSpin();
 };
 animation.onfinish=complete;
 setTimeout(complete,duration+150); // Segurança para navegadores com animação suspensa.
}
function finishLocationSpin(){
 clearInterval(locationSpinTimer);locationSpinTimer=null;
 if(!locationSpinning)return;locationSpinning=false;
 if(!battle||battle.phase!=='reveal')return;
 battle.phase='selection';battle.turn='select';logMessage('◈ '+label(battle.location)+' revelado. Escolha atacante e alvo.');saveBattle();audioPulse('drop');render();
}

function revealPage(){return `<div class="bd-page bd-reel-page"><div class="bd-kicker">02 / BATTLEDROME <span>▸</span> ROLETA HORIZONTAL DE LOCAIS</div><section class="bd-board bd-reveal-board">${bdBoardDecor('selection')}
 <div class="bd-board-head"><span>SEU EXÉRCITO</span><span>EXÉRCITO ADVERSÁRIO</span></div>
 ${bdSquad(battle.hero,'left','duel')}${bdSquad(battle.foe,'right','duel')}
 ${bdLocationSpinner()}</section><div class="bd-command-row"><div><strong>REVELE O LOCAL</strong><small>O sorteio usa somente os locais escolhidos na preparação.</small></div><div class="bd-command-buttons"><button class="bd-btn muted" data-act="home">VOLTAR AO MENU</button></div></div></div>`}
function selectBattlePage(){const loc=getLocation(battle.location),h=battle.activeH>=0?getH():null,e=battle.activeE>=0?getE():null;
 return `<div class="bd-page"><div class="bd-kicker">02 / LOCAL REVELADO <span>▸</span> ESCOLHA SEU CONFRONTO</div>
 <section class="bd-board bd-selection" aria-label="Escolha do confronto">${bdBoardDecor('selection')}
 <div class="bd-board-head"><span>SEU EXÉRCITO · CRIATURAS LIVRES</span><span>ALVOS ALCANÇÁVEIS</span></div>
 ${bdSquad(battle.hero,'left','selection')}${bdSquad(battle.foe,'right','selection')}
 ${bdLocationHand(battle.locations,false,battle.location)}
 </section><div class="bd-command-row bd-select-command"><div class="bd-loc-summary"><img src="${photo('location',loc.id)}" alt=""><span><strong>◈ ${safe(label(loc.id))}</strong><small>${safe(loc.text)}</small></span></div><div><strong>${h?safe(label(h.id)):'SELECIONE SUA CRIATURA'} <span class="bd-vs">VS</span> ${e?safe(label(e.id)):'SELECIONE O INIMIGO'}</strong><small>Selecione seu atacante e depois um alvo livre à frente.</small></div><div class="bd-command-buttons"><button class="bd-btn muted" data-act="home">SAIR</button><button class="bd-btn gold" data-act="beginDuel" ${!h||!e?'disabled':''}>ENTRAR EM COMBATE ▸</button></div></div></div>`;
}
function advancePage(){
 const champion=battle.hero[battle.advanceIndex];
 const targets=advanceTargets();
 return `<div class="bd-page bd-advance-page"><div class="bd-kicker">04 / VITÓRIA NO DUELO <span>▸</span> MOVIMENTO DO CAMPEÃO</div>
 <section class="bd-board bd-selection bd-movement" aria-label="Mover seu campeão depois da vitória">${bdBoardDecor('selection')}
 <div class="bd-board-head"><span>SEU EXÉRCITO</span><span>CASAS DISPONÍVEIS DO ADVERSÁRIO</span></div>
 ${bdSquad(battle.hero,'left','advance')}${bdSquad(battle.foe,'right','advance')}
 <div class="bd-move-message"><strong>↗ ${safe(label(champion.id))} VENCEU!</strong><span>Escolha uma casa vazia do lado adversário, marcada em amarelo, para avançar com o campeão.</span></div>
 </section><div class="bd-command-row"><div><strong>AVANÇO DO CAMPEÃO</strong><small>${targets.length} ${targets.length===1?'casa disponível':'casas disponíveis'} · você também pode manter a posição.</small></div><div class="bd-command-buttons"><button class="bd-btn muted" data-act="stayChampion">MANTER POSIÇÃO</button></div></div></div>`;
}
function battlePage(){if(!battle)return home();if(battle.phase==='advance')return advancePage();if(battle.phase==='reveal')return revealPage();if(battle.phase==='selection')return selectBattlePage();const isTurn=battle.turn==='player'&&!pending(),h=getH(),e=getE(),loc=getLocation(battle.location);
 const attacks=[['basic','GOLPE DIRETO'],['element','ELEMENTAL'],['quick','ATAQUE VELOZ'],['guard','DEFENDER']];
 return `<div class="bd-page"><div class="bd-kicker">03 / BATTLEDROME <span>▸</span> CONFRONTO ${battle.duel} · TURNO ${battle.round}</div>
 <section class="bd-board bd-duel" aria-label="Arena de batalha">${bdBoardDecor('duel')}
 <div class="bd-board-head"><span>EXÉRCITO DO JOGADOR</span><span>EXÉRCITO ADVERSÁRIO</span></div>
 ${bdSquad(battle.hero,'left','duel')}${bdSquad(battle.foe,'right','duel')}
 <div class="bd-duel-center"><div class="bd-duel-fighter hero"><img src="${photo('creature',h.id)}" alt="${safe(label(h.id))}"><strong>${safe(label(h.id))}</strong><span class="bd-hp"><i style="width:${Math.max(0,h.hp/h.maxHp*100)}%"></i></span><small>${h.hp}/${h.maxHp} VIDA</small></div><b class="bd-versus">VS</b><div class="bd-duel-fighter enemy"><img src="${photo('creature',e.id)}" alt="${safe(label(e.id))}"><strong>${safe(label(e.id))}</strong><span class="bd-hp"><i style="width:${Math.max(0,e.hp/e.maxHp*100)}%"></i></span><small>${e.hp}/${e.maxHp} VIDA</small></div></div>
 <div class="bd-duel-location"><img src="${photo('location',loc.id)}" alt=""><span>${safe(label(loc.id))}</span></div>
 </section><div class="bd-command-row"><div><strong>${isTurn?'● SEU TURNO':battle.turn==='enemy'?'● VEZ DO ADVERSÁRIO':'CONFRONTO'}</strong><small>${safe(loc.text)}</small></div><div class="bd-command-buttons"><button class="bd-btn muted" data-act="home">SAIR DA ARENA</button></div></div>
 <section class="bd-actions"><div><span class="bd-overline">ATAQUES DISPONÍVEIS</span><div class="bd-attack-buttons">${attacks.map(([key,title])=>`<button class="bd-attack" data-act="attack" data-id="${key}" ${!isTurn?'disabled':''}>${title}</button>`).join('')}</div></div><div><span class="bd-overline">MUGICS PRONTOS</span><div class="bd-spells">${battle.mugics.map((s,i)=>`<button class="bd-spell ${s.used?'used':''}" data-act="cast" data-i="${i}" ${s.used||!isTurn?'disabled':''}><img src="${photo('mugic',s.id)}" alt=""><small>${safe(label(s.id))}</small></button>`).join('')||'<span>Sem Mugics preparados.</span>'}</div></div></section>
 <div class="bd-battle-log" role="log" aria-live="polite">${battle.log.slice(0,3).map(x=>`<p>${safe(x.text)}</p>`).join('')}</div></div>`;
}
function resultPage(){const won=battle?.winner==='hero';return `<div class="shell"><section class="panel result"><span class="pill">DUELO ENCERRADO</span><h2 class="${won?'good':'danger'}">${won?'🏆 Vitória em Perim!':'💀 Sua equipe foi derrotada'}</h2><p>${won?'Seu exército venceu o confronto. Monte novas combinações e volte à arena.':'O desafio não terminou. Troque os equipamentos e tente outra estratégia.'}</p><div class="result-cards">${(battle?.hero||[]).map(x=>`<img src="${photo('creature',x.id)}" alt="${safe(label(x.id))}" title="${safe(label(x.id))}">`).join('')}</div><div class="row" style="justify-content:center;flex-wrap:wrap"><button class="btn primary" data-act="rematch">⚔ Nova batalha</button><button class="btn ghost" data-act="deck">▦ Editar equipe</button><button class="btn ghost" data-act="home">⌂ Início</button></div></section></div>`}
function renderModal(){if(!modal)return '';if(modal.type==='gear'){const selected=deck.creatures[slotSelection];return `<div class="modal-back" data-act="closeBackdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h3 id="modal-title">⚙ Equipar ${safe(label(selected))}</h3><p>Escolha um equipamento para esta criatura.</p><div class="gear-chooser">${gears.map(g=>`<button class="gear-choice" data-act="modalGear" data-id="${g.id}"><img src="${photo('gear',g.id)}" alt=""><strong>${safe(label(g.id))}</strong></button>`).join('')}</div><div class="modal-actions"><button class="btn warn" data-act="removeGear">Desequipar</button><button class="btn ghost" data-act="closeModal">Fechar</button></div></div></div>`}
 if(modal.type==='confirm')return `<div class="modal-back" data-act="closeBackdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h3 id="modal-title">${safe(modal.title)}</h3><p>${safe(modal.message)}</p><div class="modal-actions"><button class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn warn" data-act="confirm">Confirmar</button></div></div></div>`;
 return ''}
function render(){root.innerHTML=header()+(page==='home'?home():page==='deck'?deckPage():page==='battle'?battlePage():resultPage())+renderModal();document.title=`Chaotic BattleDrome · ${page==='battle'?'Arena':page==='deck'?'Montar equipe':page==='result'?'Resultado':'Início'}`}
function setPage(p){if(p==='battle'&&!battle)p='home';if(p==='result'&&(!battle||!battle.winner))p='home';page=p;modal=null;render();window.scrollTo(0,0)}
function setCreatureAt(index,id){
 if(!getCreature(id)||index<0||index>5)return;
 const prevAt=deck.creatures[index];const other=deck.creatures.indexOf(id);
 if(other!==-1&&other!==index){deck.creatures[other]=prevAt||null;}else if(prevAt&&prevAt!==id)delete deck.gears[prevAt];
 deck.creatures[index]=id;slotSelection=index;saveDeck();audioPulse('drop');render();toast(`${label(id)} colocado na posição ${index+1}.`);
}
function setGearAt(index,id){if(!getGear(id)||index<0||index>5)return;const who=deck.creatures[index];if(!who){toast('Solte o equipamento sobre uma criatura.');return;}deck.gears[who]=id;slotSelection=index;saveDeck();audioPulse('drop');render();toast(`${label(who)} equipado com ${label(id)}.`)}
function setMugicAt(index,id){if(!getMugic(id)||index<0||index>2)return;const other=deck.mugics.indexOf(id),old=deck.mugics[index];if(other>=0&&other!==index)deck.mugics[other]=old||null;deck.mugics[index]=id;mugicSelection=index;saveDeck();audioPulse('drop');render();toast(`${label(id)} preparado no espaço ${index+1}.`)}
function dropCard(kind,id,index){if(kind==='creature')setCreatureAt(index,id);else if(kind==='gear')setGearAt(index,id);else if(kind==='mugic')setMugicAt(index,id);else if(kind==='location')toggleLocation(id)}
function toggleLocation(id){if(!getLocation(id))return;deck.locations=deck.locations.includes(id)?deck.locations.filter(x=>x!==id):[...deck.locations,id];saveDeck();audioPulse('drop');render();toast(`${label(id)} ${deck.locations.includes(id)?'adicionado ao sorteio':'retirado do sorteio'}.`)}
function removeCreatureAt(index){const id=deck.creatures[index];if(!id)return;deck.creatures[index]=null;delete deck.gears[id];saveDeck();render();toast(`${label(id)} retirado da formação.`)}
const spinningWheels=new Set();
function wheelTurn(dir,kind=wheelType){
 if(!WHEEL_TYPES[kind]||spinningWheels.has(kind))return;
 wheelType=kind;
 const reel=document.querySelector(`.bd-vreel[data-reel-kind="${kind}"]`);
 const items=[...reel?.querySelectorAll('.bd-vreel-item')||[]];
 const len=WHEEL_TYPES[kind].list.length;
 spinningWheels.add(kind);audioPulse('tick');
 const advance=()=>{
  wheelIndex[kind]=(wheelIndex[kind]+dir+len)%len;
  wheelMotionKind=kind;wheelMotionDir=dir;
  spinningWheels.delete(kind);render();
 };
 if(!items.length){advance();return}
 let remaining=items.length;
 const distance=items[1]?.getBoundingClientRect().height*.66||30;
 const effects=items.map(el=>el.animate([
  {transform:'translateY(0px)',opacity:1},
  {transform:`translateY(${dir>0?-distance:distance}px)`,opacity:.45}
 ],{duration:195,easing:'cubic-bezier(.22,.8,.4,1)',fill:'forwards'}));
 effects.forEach(anim=>anim.onfinish=()=>{if(!--remaining){effects.forEach(a=>a.cancel());advance()}});
 setTimeout(()=>{if(spinningWheels.has(kind)){effects.forEach(a=>a.cancel());advance()}},330);
}

function wheelApply(id,kind=wheelType){if(kind==='creature')setCreatureAt(slotSelection,id);else if(kind==='gear')setGearAt(slotSelection,id);else if(kind==='mugic')setMugicAt(mugicSelection,id);else if(kind==='location')toggleLocation(id)}
// Mantidos para compatibilidade com o arquivo anterior, mas a montagem agora usa as roletas.
function chooseCreature(id){if(deck.creatures.includes(id)){removeCreatureAt(deck.creatures.indexOf(id));return;}setCreatureAt(slotSelection,id)}
function chooseGear(id){setGearAt(slotSelection,id);modal=null}
function chooseMugic(id){const i=deck.mugics.indexOf(id);if(i>=0){deck.mugics[i]=null;saveDeck();render()}else setMugicAt(mugicSelection,id)}
function start(){if(creatureCount()!==6||!deck.locations.length){setPage('deck');toast('Complete as seis criaturas e selecione pelo menos um local.');return}
 if(battle&&!battle.winner){modal={type:'confirm',title:'Iniciar nova batalha?',message:'Sua batalha em andamento será substituída. A equipe salva não será apagada.',accept:()=>{makeBattle();setPage('battle')}};render();return}
 makeBattle();setPage('battle');
}
function clickAction(ev){const el=ev.target.closest('[data-act]');if(!el)return;
 const a=el.dataset.act,id=el.dataset.id,i=Number(el.dataset.i);
 if(a==='soundToggle'){soundEnabled=!soundEnabled;store('chaotic-sound-v05',soundEnabled);if(soundEnabled)audioPulse('drop');render();return}
 if(a==='spinLocation'){spinLocation();return}
 if(a==='advanceChampion'){moveChampion(i);return}
 if(a==='stayChampion'){stayChampion();return}
 if(a==='closeBackdrop'){if(ev.target===el){modal=null;render()}return}
 if(a==='closeModal'){modal=null;render();return}
 if(a==='confirm'){const fn=modal?.accept;modal=null;fn?.();return}
 if(a==='home'){setPage('home');return}
 if(a==='deck'){setPage('deck');return}
 if(a==='resume'){if(battle){setPage(battle.winner?'result':'battle')}return}
 if(a==='slot'){slotSelection=i;modal=null;render();return}
 if(a==='mugicSlot'){mugicSelection=i;wheelType='mugic';render();return}
 if(a==='wheelTab'){wheelType=id;render();return}
 if(a==='wheelTurn'){wheelTurn(Number(el.dataset.dir),id);return}
 if(a==='wheelApply'){wheelApply(el.dataset.wheelId,el.dataset.wheelKind);return}
 if(a==='removeCreatureSlot'){removeCreatureAt(slotSelection);return}
 if(a==='gearModal'){if(deck.creatures[slotSelection]){modal={type:'gear'};render()}return}
 if(a==='tab'){tab=id;render();return}
 if(a==='chooseCreature'){chooseCreature(id);return}
 if(a==='removeCreature'){removeCreatureAt(slotSelection);return}
 if(a==='chooseGear'||a==='modalGear'){chooseGear(id);return}
 if(a==='removeGear'){delete deck.gears[deck.creatures[slotSelection]];saveDeck();modal=null;render();return}
 if(a==='toggleMugic'){chooseMugic(id);return}
 if(a==='chooseLocation'){toggleLocation(id);return}
 if(a==='preset'){modal={type:'confirm',title:'Limpar a formação?',message:'As seis posições serão esvaziadas para você preparar uma nova equipe.',accept:()=>{deck={creatures:Array(6).fill(null),gears:{},mugics:Array(3).fill(null),locations:[]};slotSelection=0;saveDeck();render()}};render();return}
 if(a==='clearDeck'){modal={type:'confirm',title:'Esvaziar o painel?',message:'Criaturas, equipamentos, Mugics e locais serão removidos da preparação.',accept:()=>{deck={creatures:Array(6).fill(null),gears:{},mugics:Array(3).fill(null),locations:[]};slotSelection=0;mugicSelection=0;saveDeck();render()}};render();return}
 if(a==='noop'){return}
 if(a==='start'){audioPulse('drop');start();return}
 if(a==='pickFighter'){chooseFighter(el.dataset.side,i);return}
 if(a==='beginDuel'){audioPulse('combat');startDuel();return}
 if(a==='attack'){doMove(id);return}
 if(a==='cast'){useMugic(i);return}
 if(a==='switch'){switchHero(i);return}
 if(a==='rematch'){if(!deck.locations.length){setPage('deck');toast('Selecione pelo menos um local.');return}makeBattle();setPage('battle');return}
}
document.addEventListener('click',ev=>{if(suppressAfterDrag){suppressAfterDrag=false;ev.preventDefault();ev.stopPropagation();return;}clickAction(ev)},true);

// Arrastar com mouse/toque de qualquer uma das três roletas.
// Gesto vertical dentro do tambor = girar. Arraste além do tambor = posicionar carta.
let draggingCard=null,suppressAfterDrag=false;
function suppressClick(){suppressAfterDrag=true;setTimeout(()=>{suppressAfterDrag=false},120)}
function cleanDrag(){draggingCard?.ghost?.remove();draggingCard=null;document.body.classList.remove('bd-dragging');document.querySelectorAll('.bd-drop-over').forEach(el=>el.classList.remove('bd-drop-over'))}
document.addEventListener('wheel',ev=>{const reel=ev.target.closest('.bd-vreel');if(!reel||page!=='deck')return;ev.preventDefault();wheelTurn(ev.deltaY>0?1:-1,reel.dataset.reelKind)},{passive:false});
document.addEventListener('pointerdown',ev=>{
 const el=ev.target.closest('.bd-vreel-item.current, .bd-scan-feature, .bd-vreel-window');if(!el||page!=='deck'||ev.button>0)return;
 const wheelWindow=el.closest('.bd-vreel-window');
 const kind=el.dataset.wheelKind||wheelWindow?.dataset.reel;
 const id=el.dataset.wheelId||(kind?WHEEL_TYPES[kind].list[wheelIndex[kind]%WHEEL_TYPES[kind].list.length].id:null);
 if(!id)return;
 draggingCard={kind,id,x:ev.clientX,y:ev.clientY,pointerId:ev.pointerId,ghost:null,track:wheelWindow};
},true);
document.addEventListener('pointermove',ev=>{
 const d=draggingCard;if(!d||ev.pointerId!==d.pointerId)return;
 const dx=ev.clientX-d.x,dy=ev.clientY-d.y;
 if(!d.ghost){
  if(Math.hypot(dx,dy)<14)return;
  const r=d.track?.getBoundingClientRect();
  const inside=r&&ev.clientX>=r.left-5&&ev.clientX<=r.right+5&&ev.clientY>=r.top-5&&ev.clientY<=r.bottom+5;
  // Movimentos dentro da janela não arrastam a carta: o gesto serve para girar.
  if(inside&&Math.abs(dy)>Math.abs(dx)*.7)return;
  const el=document.createElement('div');el.className='bd-drag-ghost';el.innerHTML=`<img src="${photo(d.kind,d.id)}" alt="">`;
  document.body.append(el);d.ghost=el;document.body.classList.add('bd-dragging');
 }
 ev.preventDefault();d.ghost.style.left=ev.clientX+'px';d.ghost.style.top=ev.clientY+'px';
 document.querySelectorAll('.bd-drop-over').forEach(el=>el.classList.remove('bd-drop-over'));
 const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('[data-drop-kind]');
 if(target)target.classList.add('bd-drop-over');
},{passive:false});
document.addEventListener('pointerup',ev=>{
 const d=draggingCard;if(!d||ev.pointerId!==d.pointerId)return;
 const dx=ev.clientX-d.x,dy=ev.clientY-d.y;
 if(!d.ghost){draggingCard=null;if(Math.abs(dy)>28&&Math.abs(dy)>Math.abs(dx)*.8){suppressClick();wheelTurn(dy<0?1:-1,d.kind)}return;}
 const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('[data-drop-kind]');
 cleanDrag();suppressClick();
 if(target&&(d.kind===target.dataset.dropKind||(d.kind==='gear'&&target.dataset.dropKind==='creature'))){dropCard(d.kind,d.id,Number(target.dataset.dropI))}
 else toast('Arraste a carta até uma posição compatível do painel.');
},true);
document.addEventListener('pointercancel',cleanDrag,true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal){modal=null;render()}});
if('serviceWorker' in navigator && location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('PWA offline indisponível',err)));
render();
// Se o usuário recarregar durante o contra-ataque, a IA conclui o turno salvo.
if(battle?.turn==='enemy'&&battle?.phase==='duel')aiTimer=setTimeout(enemyTurn,700);
