import {creatures,gears,mugics,locations,formatName,art,elements,DEFAULT_DECK,getCreature,getGear,getMugic,getLocation} from './data.js';
const root=document.getElementById('app');
const DECK_KEY='chaotic-tcg-deck-alpha-1', BATTLE_KEY='chaotic-tcg-battle-alpha-1', STATS_KEY='chaotic-tcg-stats-alpha-1';
const clone=x=>JSON.parse(JSON.stringify(x));
const getSave=(k,fallback)=>{try{const a=JSON.parse(localStorage.getItem(k));return a??fallback}catch{return fallback}};
const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(err){console.warn('Armazenamento indisponível',err)}};
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=id=>formatName(id||'');
const photo=(kind,id)=>art(kind,id);
function normalizeDeck(o){let d=clone(DEFAULT_DECK);
 if(o&&typeof o==='object'){
  if(Array.isArray(o.creatures))d.creatures=[...new Set(o.creatures.filter(x=>getCreature(x)))].slice(0,6);
  if(o.gears&&typeof o.gears==='object'){d.gears={};for(const [c,g] of Object.entries(o.gears))if(getCreature(c)&&getGear(g))d.gears[c]=g;}
  if(Array.isArray(o.mugics))d.mugics=[...new Set(o.mugics.filter(x=>getMugic(x)))].slice(0,3);
  if(getLocation(o.location))d.location=o.location;
 }
 return d;
}
let deck=normalizeDeck(getSave(DECK_KEY,null));let battle=getSave(BATTLE_KEY,null);
if(!battle||!Array.isArray(battle.hero)||!Array.isArray(battle.foe)||!Array.isArray(battle.mugics))battle=null;
let stats=getSave(STATS_KEY,{wins:0,losses:0});
let page='home',tab='creatures',slotSelection=0,modal=null,toastTimer=null,aiTimer=null;
const pending=()=>Boolean(aiTimer);
const saveDeck=()=>store(DECK_KEY,deck);
const saveBattle=()=>{if(battle)store(BATTLE_KEY,battle)};
const eraseBattle=()=>{battle=null;localStorage.removeItem(BATTLE_KEY)};
function toast(msg){document.querySelector('.toast')?.remove();clearTimeout(toastTimer);const n=document.createElement('div');n.className='toast';n.role='status';n.textContent=msg;document.body.append(n);toastTimer=setTimeout(()=>n.remove(),2700)}
function header(){return `<header class="site-head"><img class="brand-logo" src="assets/ui/logo.webp" alt="Chaotic"><span class="brand-copy"><strong>CHAOTIC TCG</strong><small>ARENA DE PERIM · ALPHA 0.1</small></span><div class="header-actions"><button class="btn sm ghost" data-act="home">⌂ Início</button><button class="btn sm ${page==='deck'?'primary':'ghost'}" data-act="deck">▦ Minha equipe</button>${battle?`<button class="btn sm ${page==='battle'?'primary':'ghost'}" data-act="resume">⚔ Arena</button>`:''}</div></header>`}
function home(){return `<div class="shell"><section class="hero"><div class="hero-copy"><span class="pill">✦ CONSTRUA. PREPARE. BATALHE.</span><h1>Seu exército.<br><span>Seu destino.</span></h1><p>Escolha seis criaturas de Perim, equipe cada uma, prepare seus Mugics e enfrente a arena em batalhas por turnos.</p><div class="hero-buttons"><button class="btn primary" data-act="deck">▦ Montar minha equipe</button><button class="btn blue" data-act="${battle?'resume':'start'}">⚔ ${battle?'Continuar batalha':'Iniciar batalha'}</button></div></div><div class="hero-cards"><img src="${photo('creature','Maxxor')}" alt="Maxxor"><img src="${photo('creature','Chaor')}" alt="Chaor"></div></section><section class="quick-stats"><div class="panel"><strong>${creatures.length}</strong><span>CRIATURAS DISPONÍVEIS</span></div><div class="panel"><strong>${stats.wins||0}</strong><span>VITÓRIAS</span></div><div class="panel"><strong>${stats.losses||0}</strong><span>DERROTAS</span></div></section><section class="panel panel-pad" style="margin-top:16px"><div class="section-head"><div><h2>O que já pode fazer</h2><p>Protótipo local, sem servidor e sem multiplayer.</p></div><span class="pill">100% JOGÁVEL NO NAVEGADOR</span></div><p class="fineprint">✓ Equipe de seis criaturas • ✓ Equipamentos individuais • ✓ Três Mugics consumíveis • ✓ Local de batalha • ✓ Oponente controlado pelo computador • ✓ Combate por turnos • ✓ Salvar e continuar.</p><div class="notice">Este é um protótipo independente feito com as imagens do CAPX enviado. Os atributos, ataques e efeitos usados aqui são <b>experimentais</b>, não as regras oficiais de Chaotic. O conteúdo visual pertence aos respectivos titulares; não é um produto oficial.</div></section></div>`}
function slotCard(id,i){return `<button type="button" class="squad-slot ${slotSelection===i?'active':''}" data-act="slot" data-i="${i}" aria-label="Posição ${i+1}: ${id?label(id):'vazia'}">${id?`<img src="${photo('creature',id)}" alt=""><span class="number">0${i+1}</span><strong>${safe(label(id))}</strong>${deck.gears[id]?'<span class="gear-dot">⚙</span>':''}`:`<span class="empty"><b>＋</b><br>Posição ${i+1}</span>`}</button>`}
function sideDeck(){const selected=deck.creatures[slotSelection];return `<section class="panel panel-pad"><div class="section-head"><div><h2>Meu exército</h2><p>Selecione uma posição, depois escolha uma criatura.</p></div><span class="pill">${deck.creatures.length}/6</span></div><div class="squad-grid">${Array.from({length:6},(_,i)=>slotCard(deck.creatures[i],i)).join('')}</div><div class="deck-progress"><span><b>${deck.creatures.length}/6</b> criaturas</span><span>·</span><span><b>${deck.mugics.length}/3</b> Mugics</span><span>·</span><span><b>${Object.keys(deck.gears).filter(x=>deck.creatures.includes(x)).length}</b> equipadas</span></div>${selected?`<div class="deck-control"><b>Posição ${slotSelection+1}: ${safe(label(selected))}</b><p>${safe(getCreature(selected).flavor)}</p><div class="row" style="flex-wrap:wrap"><button class="btn sm" data-act="gearModal">⚙ ${deck.gears[selected]?label(deck.gears[selected]):'Equipar'}</button><button class="btn sm warn" data-act="removeCreature" data-id="${selected}">× Remover</button></div></div>`:`<div class="deck-control"><b>Posição ${slotSelection+1} vazia</b><p>Escolha uma criatura na lista ao lado para preenchê-la.</p></div>`}<div class="deck-control"><b>Mugics preparados</b><div class="mugic-list" style="margin-top:9px">${deck.mugics.map(id=>`<div class="mugic-row"><span>🎵 ${safe(label(id))}</span><button class="btn sm ghost" data-act="toggleMugic" data-id="${id}" aria-label="Remover ${label(id)}">×</button></div>`).join('')||'<p class="muted">Nenhum Mugic selecionado.</p>'}</div></div><div class="deck-control"><b>Local escolhido</b><p>${safe(label(deck.location))} · ${safe(getLocation(deck.location)?.text)}</p></div><button class="btn primary wide" style="margin-top:14px" data-act="start" ${deck.creatures.length!==6?'disabled':''}>⚔ Entrar na arena com esta equipe</button><div class="deck-preset" style="margin-top:10px"><button class="btn sm ghost" data-act="preset">↺ Restaurar equipe inicial</button><button class="btn sm ghost" data-act="clearDeck">Limpar equipe</button></div></section>`}
function catalogCard(kind,obj){let chosen=false,description='',act='',button='Adicionar',cls='';
 if(kind==='creature'){chosen=deck.creatures.includes(obj.id);description=`${obj.tribe==='overworld'?'OverWorld':'UnderWorld'} · ${elements[obj.element][1]} ${elements[obj.element][0]} · Vida ${obj.hp}`;act='chooseCreature';button=chosen?'✓ Selecionado':'＋ Selecionar'}
 if(kind==='gear'){chosen=Boolean(deck.creatures[slotSelection]&&deck.gears[deck.creatures[slotSelection]]===obj.id);description=obj.text;act='chooseGear';button=chosen?'✓ Equipado':'⚙ Equipar'}
 if(kind==='mugic'){chosen=deck.mugics.includes(obj.id);description=obj.text;act='toggleMugic';button=chosen?'✓ Preparado':'＋ Preparar'}
 if(kind==='location'){chosen=deck.location===obj.id;description=obj.text;act='chooseLocation';button=chosen?'✓ Selecionado':'◉ Escolher';cls='location'}
 return `<article class="catalog-card ${chosen?'chosen':''} ${cls}">${chosen?'<span class="marker">✓</span>':''}<img loading="lazy" src="${photo(kind,obj.id)}" alt="${safe(label(obj.id))}"><strong>${safe(label(obj.id))}</strong><div class="meta">${safe(description)}</div><button class="btn sm ${chosen?'ghost':'primary'}" data-act="${act}" data-id="${obj.id}">${button}</button></article>`
}
function deckPage(){const kinds=[['creatures','Criaturas','creature',creatures],['gear','Equipamentos','gear',gears],['mugic','Mugic','mugic',mugics],['location','Locais','location',locations]];const current=kinds.find(x=>x[0]===tab)||kinds[0];return `<div class="shell"><span class="eyebrow">01 / PREPARAÇÃO DA BATALHA</span><h1 class="page-title">Monte sua equipe</h1><p class="subhead" style="margin-bottom:20px">Seis criaturas, um equipamento por criatura, até três Mugics e um local.</p><div class="builder-grid"><div class="sticky-column">${sideDeck()}</div><section class="panel panel-pad catalog-panel"><div class="tabs" role="tablist" aria-label="Tipos de carta">${kinds.map(x=>`<button class="tab" role="tab" aria-selected="${tab===x[0]}" data-act="tab" data-id="${x[0]}">${x[1]} <small>${x[3].length}</small></button>`).join('')}</div><div class="section-head"><div><h2>${current[1]}</h2><p>${tab==='gear'?`Equipando posição ${slotSelection+1}: ${deck.creatures[slotSelection]?safe(label(deck.creatures[slotSelection])):'selecione uma criatura'}`:tab==='creatures'?'Escolha uma criatura. Com 6 posições ocupadas, você substitui a posição selecionada.':tab==='mugic'?'Escolha até três magias para usar uma vez por batalha.':'Selecione o local onde ocorrerá o duelo.'}</p></div></div><div class="catalog">${current[3].map(obj=>catalogCard(current[2],obj)).join('')}</div></section></div></div>`}
function createCombatant(id,gear){const def=getCreature(id);const bonus=getGear(gear);const base={id,hp:def.hp,maxHp:def.hp,power:def.power,speed:def.speed,wisdom:def.wisdom,shield:0,element:def.element,tribe:def.tribe,gear:gear||null};if(bonus){if(bonus.stat==='hp'){base.hp+=bonus.bonus;base.maxHp+=bonus.bonus}else base[bonus.stat]+=bonus.bonus;}return base}
const foeRoster=['Lord_Van_Bloot','Rarran','Takinon','Nauthilax','Chaor','Tangath_Toborn'];
function makeBattle(){const order=[...foeRoster].sort(()=>Math.random()-.5);
 battle={hero:deck.creatures.map(id=>createCombatant(id,deck.gears[id])),foe:order.map((id,i)=>createCombatant(id,gears[(i*2+3)%gears.length].id)),activeH:0,activeE:0,round:1,mugics:deck.mugics.map(id=>({id,used:false})),location:deck.location,log:[],turn:'player',lastHeavy:false,winner:null};
 logMessage('A arena está pronta. Escolha seu primeiro ataque.');saveBattle();
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
function afterPlayerMove(){if(allDead(battle.foe)){finish('hero');return}nextLiving('foe');battle.turn='enemy';saveBattle();render();clearTimeout(aiTimer);aiTimer=setTimeout(enemyTurn,760)}
function doMove(move){if(!battle||battle.turn!=='player'||pending())return;const actor=getH(),enemy=getE();
 if(move==='guard'){let points=Math.round(16+actor.wisdom*.6);actor.shield=Math.min(70,actor.shield+points);logMessage(`🛡 ${label(actor.id)} preparou defesa (+${points} de barreira).`)}
 else{const v=attackValue(actor,move),hit=receive(enemy,v.amount),title=move==='quick'?'Ataque veloz':move==='element'?'Golpe elemental':'Golpe direto';logMessage(`⚔ ${label(actor.id)} usou ${title}: ${hit.damage} de dano${hit.absorbed?` (${hit.absorbed} absorvidos)`:''}${v.crit?' · CRÍTICO!':''}.`)}
 afterPlayerMove();
}
function useMugic(index){if(!battle||battle.turn!=='player'||pending())return;const spell=battle.mugics[index];if(!spell||spell.used)return;
 const m=getMugic(spell.id),hero=getH(),foe=getE();spell.used=true;
 if(m.effect==='heal'){const gained=Math.min(m.value,hero.maxHp-hero.hp);hero.hp+=gained;logMessage(`🎵 ${label(m.id)} restaurou ${gained} de vida.`)}
 if(m.effect==='shield'){hero.shield=Math.min(80,hero.shield+m.value);logMessage(`🎵 ${label(m.id)} criou uma barreira de ${m.value}.`)}
 if(m.effect==='strike'){const hit=receive(foe,m.value);logMessage(`🎵 ${label(m.id)} causou ${hit.damage} de dano mágico.`)}
 if(m.effect==='weaken'){foe.power=Math.max(5,foe.power-m.value);logMessage(`🎵 ${label(m.id)} reduziu o poder de ${label(foe.id)}.`)}
 if(m.effect==='boost'){hero.power+=m.value;logMessage(`🎵 ${label(m.id)} aumentou o poder de ${label(hero.id)}.`)}
 afterPlayerMove();
}
function switchHero(index){if(!battle||battle.turn!=='player'||pending())return;if(index===battle.activeH)return;if(!battle.hero[index]||battle.hero[index].hp<=0)return;
 battle.activeH=index;logMessage(`🔄 Você convocou ${label(getH().id)}.`);afterPlayerMove()}
function enemyTurn(){aiTimer=null;if(!battle||battle.turn!=='enemy'||battle.winner)return;const enemy=getE(),hero=getH();
 const moves=['basic','basic','element','quick','guard'];let move=moves[Math.floor(Math.random()*moves.length)];
 if(move==='guard'){const shield=Math.round(8+enemy.wisdom*.45);enemy.shield=Math.min(55,enemy.shield+shield);logMessage(`🛡 ${label(enemy.id)} reforçou sua defesa (+${shield}).`)}
 else{const value=attackValue(enemy,move),hit=receive(hero,Math.round(value.amount*.79));logMessage(`⚔ ${label(enemy.id)} atacou ${label(hero.id)}: ${hit.damage} de dano${hit.absorbed?` (${hit.absorbed} bloqueados)`:''}.`)}
 if(allDead(battle.hero)){finish('foe');return}nextLiving('hero');battle.turn='player';battle.round++;saveBattle();render();
}
function fighter(o,side){return `<div class="fighter ${side==='enemy'?'enemy':''}"><img class="card-img" src="${photo('creature',o.id)}" alt="${safe(label(o.id))}"><div class="fighter-label">${safe(label(o.id))}</div><div class="hp-track" aria-label="Vida de ${label(o.id)}"><i style="width:${Math.max(0,Math.min(100,o.hp/o.maxHp*100))}%"></i></div><div class="hp-value">${o.hp} / ${o.maxHp} VIDA ${o.shield?' · 🛡 '+o.shield:''}</div><div class="fighter-stats"><span>⚔ ${o.power}</span><span>⚡ ${o.speed}</span><span>✦ ${o.wisdom}</span><span>${elements[o.element][1]}</span></div></div>`}
function lineupItem(o,i){return `<button class="lineup-btn ${i===battle.activeH?'current':''} ${o.hp<=0?'dead':''}" data-act="switch" data-i="${i}" title="${safe(label(o.id))} · ${o.hp}/${o.maxHp}" ${o.hp<=0||battle.turn!=='player'||i===battle.activeH||pending()?'disabled':''}><img src="${photo('creature',o.id)}" alt="${safe(label(o.id))}"><span>${o.hp}/${o.maxHp}</span></button>`}
function battlePage(){if(!battle)return home();const isTurn=battle.turn==='player'&&!pending(),h=getH(),e=getE(),loc=getLocation(battle.location);
 const attacks=[['basic','⚔ Golpe direto','Dano baseado em poder',''],['element','✨ Golpe elemental','Bônus do local compatível','fire'],['quick','⚡ Ataque veloz','Pode causar dano crítico','speed'],['guard','🛡 Preparar defesa','Absorva o próximo golpe','guard']];
 return `<div class="shell"><div class="battle-toolbar"><span class="eyebrow">02 / ARENA DE BATALHA</span><div class="row"><span class="muted">${isTurn?'● Seu turno':battle.turn==='enemy'?'● Turno inimigo':'Duelo encerrado'}</span><button class="btn sm ghost" data-act="home">↩ Sair da arena</button></div></div><div class="battle-wrap"><div class="battle-main"><section class="arena"><div class="arena-top"><span class="pill">⚔ CONFRONTO · 6 × 6</span><span class="round-indicator">TURNO ${battle.round}</span></div><div class="battle-fighters">${fighter(h,'hero')}<div class="vs">VS</div>${fighter(e,'enemy')}</div><div class="battle-location">🌍 ${safe(label(battle.location))} · ${safe(loc?.text)}</div></section><section class="panel attack-panel"><div class="section-head"><div><h2>Suas ações</h2><p>${isTurn?'Escolha um ataque ou use um Mugic. Cada ação consome o turno.':'Aguarde o adversário.'}</p></div><span class="pill">${safe(label(h.id))}</span></div><div class="attack-grid">${attacks.map(([key,title,text,cl])=>`<button class="action ${cl}" data-act="attack" data-id="${key}" ${!isTurn?'disabled':''}><strong>${title}</strong><span>${text}</span></button>`).join('')}</div></section></div><aside class="side-panel"><section class="panel panel-pad"><div class="section-head"><div><h2>Suas criaturas</h2><p>Trocar de criatura gasta um turno.</p></div></div><div class="lineup">${battle.hero.map(lineupItem).join('')}</div></section><section class="panel panel-pad"><div class="section-head"><div><h2>Mugic</h2><p>Cada carta pode ser usada uma vez.</p></div></div><div class="spell-actions">${battle.mugics.map((s,i)=>{const item=getMugic(s.id);return `<button class="spell-btn" data-act="cast" data-i="${i}" ${s.used||!isTurn?'disabled':''}><img src="${photo('mugic',s.id)}" alt=""><span><strong>${safe(label(s.id))}${s.used?' · Usado':''}</strong><small>${safe(item?.text||'')}</small></span></button>`}).join('')||'<p class="muted">Nenhum Mugic preparado.</p>'}</div></section><section class="panel panel-pad"><div class="section-head"><div><h2>Histórico</h2><p>Últimas ações da batalha.</p></div></div><div class="battle-log" role="log" aria-live="polite">${battle.log.slice(0,8).map(x=>`<p>${safe(x.text)}</p>`).join('')}</div></section></aside></div></div>`}
function resultPage(){const won=battle?.winner==='hero';return `<div class="shell"><section class="panel result"><span class="pill">DUELO ENCERRADO</span><h2 class="${won?'good':'danger'}">${won?'🏆 Vitória em Perim!':'💀 Sua equipe foi derrotada'}</h2><p>${won?'Seu exército venceu o confronto. Monte novas combinações e volte à arena.':'O desafio não terminou. Troque os equipamentos e tente outra estratégia.'}</p><div class="result-cards">${(battle?.hero||[]).map(x=>`<img src="${photo('creature',x.id)}" alt="${safe(label(x.id))}" title="${safe(label(x.id))}">`).join('')}</div><div class="row" style="justify-content:center;flex-wrap:wrap"><button class="btn primary" data-act="rematch">⚔ Nova batalha</button><button class="btn ghost" data-act="deck">▦ Editar equipe</button><button class="btn ghost" data-act="home">⌂ Início</button></div></section></div>`}
function renderModal(){if(!modal)return '';if(modal.type==='gear'){const selected=deck.creatures[slotSelection];return `<div class="modal-back" data-act="closeBackdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h3 id="modal-title">⚙ Equipar ${safe(label(selected))}</h3><p>Escolha um equipamento para esta criatura.</p><div class="gear-chooser">${gears.map(g=>`<button class="gear-choice" data-act="modalGear" data-id="${g.id}"><img src="${photo('gear',g.id)}" alt=""><strong>${safe(label(g.id))}</strong></button>`).join('')}</div><div class="modal-actions"><button class="btn warn" data-act="removeGear">Desequipar</button><button class="btn ghost" data-act="closeModal">Fechar</button></div></div></div>`}
 if(modal.type==='confirm')return `<div class="modal-back" data-act="closeBackdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h3 id="modal-title">${safe(modal.title)}</h3><p>${safe(modal.message)}</p><div class="modal-actions"><button class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn warn" data-act="confirm">Confirmar</button></div></div></div>`;
 return ''}
function render(){root.innerHTML=header()+(page==='home'?home():page==='deck'?deckPage():page==='battle'?battlePage():resultPage())+renderModal();document.title=`Chaotic TCG · ${page==='battle'?'Arena':page==='deck'?'Montar equipe':page==='result'?'Resultado':'Início'}`}
function setPage(p){if(p==='battle'&&!battle)p='home';if(p==='result'&&(!battle||!battle.winner))p='home';page=p;modal=null;render();window.scrollTo(0,0)}
function chooseCreature(id){if(!getCreature(id))return;
 if(deck.creatures.includes(id)){const oldIdx=deck.creatures.indexOf(id);deck.creatures.splice(oldIdx,1);delete deck.gears[id];slotSelection=Math.min(slotSelection,5);toast(`${label(id)} removido da equipe.`)}
 else if(deck.creatures.length>=6){const prev=deck.creatures[slotSelection];deck.creatures[slotSelection]=id;delete deck.gears[prev];toast(`${label(id)} substituiu ${label(prev)} na posição ${slotSelection+1}.`)}
 else {const i=deck.creatures.length;deck.creatures.push(id);slotSelection=i;toast(`${label(id)} entrou na equipe.`)}
 saveDeck();render();
}
function chooseGear(id){const selected=deck.creatures[slotSelection];if(!selected){toast('Selecione primeiro uma criatura.');return}if(!getGear(id))return;deck.gears[selected]=id;saveDeck();modal=null;render();toast(`${label(selected)} recebeu ${label(id)}.`)}
function chooseMugic(id){if(!getMugic(id))return;
 if(deck.mugics.includes(id))deck.mugics=deck.mugics.filter(x=>x!==id);
 else{if(deck.mugics.length>=3){toast('Máximo de três Mugics preparados.');return}deck.mugics.push(id)}
 saveDeck();render();
}
function start(){if(deck.creatures.length!==6){setPage('deck');toast('Complete as seis posições para começar.');return}
 if(battle&&!battle.winner){modal={type:'confirm',title:'Iniciar nova batalha?',message:'Sua batalha em andamento será substituída. A equipe salva não será apagada.',accept:()=>{makeBattle();setPage('battle')}};render();return}
 makeBattle();setPage('battle');
}
function clickAction(ev){const el=ev.target.closest('[data-act]');if(!el)return;
 const a=el.dataset.act,id=el.dataset.id,i=Number(el.dataset.i);
 if(a==='closeBackdrop'){if(ev.target===el){modal=null;render()}return}
 if(a==='closeModal'){modal=null;render();return}
 if(a==='confirm'){const fn=modal?.accept;modal=null;fn?.();return}
 if(a==='home'){setPage('home');return}
 if(a==='deck'){setPage('deck');return}
 if(a==='resume'){if(battle){setPage(battle.winner?'result':'battle')}return}
 if(a==='slot'){slotSelection=i;if(deck.creatures[i])modal={type:'gear'};render();return}
 if(a==='gearModal'){if(deck.creatures[slotSelection]){modal={type:'gear'};render()}return}
 if(a==='tab'){tab=id;render();return}
 if(a==='chooseCreature'){chooseCreature(id);return}
 if(a==='removeCreature'){chooseCreature(id);return}
 if(a==='chooseGear'||a==='modalGear'){chooseGear(id);return}
 if(a==='removeGear'){delete deck.gears[deck.creatures[slotSelection]];saveDeck();modal=null;render();return}
 if(a==='toggleMugic'){chooseMugic(id);return}
 if(a==='chooseLocation'){deck.location=id;saveDeck();render();return}
 if(a==='preset'){modal={type:'confirm',title:'Restaurar equipe inicial?',message:'Todas as escolhas atuais de equipe, equipamentos, Mugic e local serão substituídas.',accept:()=>{deck=clone(DEFAULT_DECK);slotSelection=0;saveDeck();render()}};render();return}
 if(a==='clearDeck'){modal={type:'confirm',title:'Limpar equipe?',message:'As criaturas e os equipamentos serão removidos. Os Mugics e o local serão preservados.',accept:()=>{deck.creatures=[];deck.gears={};slotSelection=0;saveDeck();render()}};render();return}
 if(a==='start'){start();return}
 if(a==='attack'){doMove(id);return}
 if(a==='cast'){useMugic(i);return}
 if(a==='switch'){switchHero(i);return}
 if(a==='rematch'){makeBattle();setPage('battle');return}
}
document.addEventListener('click',clickAction);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal){modal=null;render()}});
if('serviceWorker' in navigator && location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('PWA offline indisponível',err)));
render();
// Se o usuário recarregar durante o contra-ataque, a IA conclui o turno salvo.
if(battle?.turn==='enemy')aiTimer=setTimeout(enemyTurn,700);
