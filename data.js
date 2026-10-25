// Protótipo de regras original: atributos e efeitos abaixo são balanceamento experimental,
// NÃO são transcrições das regras oficiais do jogo Chaotic.
export const formatName = id => id.replaceAll('_',' ').replace('Sond of','Song of');
export const art = (kind,id) => `assets/cards/${kind}/${id}.webp`;
export const creatures = [
 {id:'Attacat',tribe:'overworld',element:'earth',hp:94,power:13,speed:18,wisdom:9,flavor:'Batedor ágil das Terras Altas.'},
 {id:'Chaor',tribe:'underworld',element:'fire',hp:116,power:22,speed:11,wisdom:12,flavor:'Comandante das profundezas.'},
 {id:'Intress',tribe:'overworld',element:'water',hp:104,power:15,speed:18,wisdom:15,flavor:'Defensora veloz de Perim.'},
 {id:'Lord_Van_Bloot',tribe:'underworld',element:'fire',hp:111,power:20,speed:13,wisdom:15,flavor:'Feiticeiro da escuridão.'},
 {id:'Maxxor',tribe:'overworld',element:'earth',hp:123,power:20,speed:16,wisdom:15,flavor:'Líder corajoso de OverWorld.'},
 {id:'Najarin',tribe:'overworld',element:'water',hp:104,power:12,speed:10,wisdom:24,flavor:'Mestre dos mistérios de Perim.'},
 {id:'Nauthilax',tribe:'underworld',element:'water',hp:105,power:17,speed:16,wisdom:13,flavor:'Predador das profundezas.'},
 {id:'Rarran',tribe:'underworld',element:'earth',hp:98,power:16,speed:19,wisdom:11,flavor:'Caçador das cavernas.'},
 {id:'Takinon',tribe:'underworld',element:'fire',hp:101,power:19,speed:16,wisdom:12,flavor:'Guerreira das chamas.'},
 {id:'Tangath_Toborn',tribe:'overworld',element:'air',hp:116,power:19,speed:15,wisdom:16,flavor:'Guardião das montanhas.'},
];
export const gears = [
 {id:'Armbands_of_Lore',stat:'wisdom',bonus:6,text:'+6 sabedoria'},
 {id:'Burithean_Axe',stat:'power',bonus:6,text:'+6 poder'},
 {id:'Double_Edge',stat:'power',bonus:4,text:'+4 poder'},
 {id:'Gauntlets_of_Might',stat:'power',bonus:5,text:'+5 poder'},
 {id:'Indigo_Sash',stat:'speed',bonus:5,text:'+5 velocidade'},
 {id:'Khyborns_Mechblede',stat:'power',bonus:7,text:'+7 poder'},
 {id:'Liquilizer',stat:'hp',bonus:16,text:'+16 vida máxima'},
 {id:'Mind_Prism',stat:'wisdom',bonus:7,text:'+7 sabedoria'},
 {id:'Mowercycle',stat:'speed',bonus:7,text:'+7 velocidade'},
 {id:'Ring_Of_Naarim',stat:'hp',bonus:12,text:'+12 vida máxima'},
];
export const mugics = [
 {id:'Battlesong_of_Depletion',effect:'strike',value:30,text:'30 de dano mágico'},
 {id:'Counterpoint_of_Chaos',effect:'shield',value:30,text:'Barreira de 30 pontos'},
 {id:'Diminuendo',effect:'weaken',value:5,text:'Reduz poder inimigo em 5'},
 {id:'Dischord_of_Flame',effect:'strike',value:36,text:'36 de dano mágico'},
 {id:'Ecstatic_Fanfare',effect:'heal',value:36,text:'Recupera 36 de vida'},
 {id:'Final_Fugue',effect:'strike',value:40,text:'40 de dano mágico'},
 {id:'Harmonics_of_Water',effect:'heal',value:40,text:'Recupera 40 de vida'},
 {id:'Hive_Destruction',effect:'strike',value:28,text:'28 de dano mágico'},
 {id:'Recurring_Rescue',effect:'heal',value:32,text:'Recupera 32 de vida'},
 {id:'Refrain_of_Denial',effect:'shield',value:36,text:'Barreira de 36 pontos'},
 {id:'Sond_of_Embernova',effect:'strike',value:32,text:'32 de dano mágico'},
 {id:'Song_of_Resurgence',effect:'heal',value:50,text:'Recupera 50 de vida'},
 {id:'Song_of_elemental_attunement',effect:'boost',value:5,text:'+5 poder até o fim do duelo'},
 {id:'Strain_of_the_Tide',effect:'weaken',value:7,text:'Reduz poder inimigo em 7'},
 {id:'Tornal_Destruction',effect:'strike',value:34,text:'34 de dano mágico'},
];
export const locations = [
 {id:'Gloomuck_Swamp',element:'earth',text:'Criaturas de Terra causam +5 de dano.'},
 {id:'Riverlands',element:'water',text:'Criaturas de Água causam +5 de dano.'},
 {id:'Stronghold_Morn',element:'air',text:'Criaturas de Ar causam +5 de dano.'},
 {id:'The_Pits',element:'fire',text:'Criaturas de Fogo causam +5 de dano.'},
 {id:'The_Storm_Tunnel',element:null,text:'Golpes velozes causam +4 de dano.'},
];
export const elements = {fire:['Fogo','🔥'],water:['Água','💧'],earth:['Terra','🌿'],air:['Ar','💨']};
export const DEFAULT_DECK={creatures:['Maxxor','Intress','Attacat','Najarin','Tangath_Toborn','Chaor'],gears:{Maxxor:'Gauntlets_of_Might',Intress:'Indigo_Sash',Attacat:'Mowercycle',Najarin:'Mind_Prism',Tangath_Toborn:'Burithean_Axe',Chaor:'Double_Edge'},mugics:['Harmonics_of_Water','Dischord_of_Flame','Song_of_Resurgence'],locations:['Riverlands','Gloomuck_Swamp','Stronghold_Morn','The_Pits','The_Storm_Tunnel']};
export const getCreature=id=>creatures.find(x=>x.id===id);
export const getGear=id=>gears.find(x=>x.id===id);
export const getMugic=id=>mugics.find(x=>x.id===id);
export const getLocation=id=>locations.find(x=>x.id===id);
