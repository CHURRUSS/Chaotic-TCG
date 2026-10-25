/* Dados de referência de cartas da série original. DOP = Dawn of Perim.
 * Atenção: cartas físicas têm variação dos atributos impressos por código/scan.
 * Números abaixo representam exemplos de referência, não um scan individual.
 * Onde uma informação não foi verificada, exibimos "não confirmado" em vez de inventar.
 * O motor de combate v0.8 mantém as regras experimentais da alpha; isto é um bestiário verificável.
 */
const wiki = path => `https://chaotic.fandom.com/wiki/${path}`;
const creature = (source,stats,mugic,ability,extra={}) => ({source,stats,mugic,ability,edition:'Dawn of Perim · atributos de referência',...extra});
export const cardFacts = {
 creature:{
  Attacat:creature(wiki('Attacat'),[50,30,65,60,105],0,'Swift 1.'),
  Chaor:creature(wiki('Chaor'),[70,95,90,70,60],3,'Pode neutralizar uma Mugic ou habilidade OverWorld direcionada a Chaor (consome contadores conforme a carta).'),
  Intress:creature(wiki('Intress'),[40,40,35,40,55],null,'Water 5: seus ataques de Água recebem bônus de dano.'),
  Lord_Van_Bloot:creature(wiki('Lord_Van_Bloot'),[65,75,115,50,95],2,'Quando o oponente engajado tem menos de 65 de Coragem, ele perde 10 de Energia.'),
  Maxxor:creature(wiki('Maxxor'),[60,100,65,80,50],2,'Pode curar 10 de dano de uma criatura gastando Mugic.'),
  Najarin:creature(wiki('Najarin'),[30,60,30,90,35],null,'Gaste um contador Mugic para devolver uma Mugic do descarte à sua mão.'),
  Nauthilax:creature(wiki('Nauthilax'),[60,70,60,40,55],2,'Recklessness 5: sofre 5 de dano depois de usar um ataque.'),
  Rarran:creature(wiki('Rarran'),[50,65,60,30,60],0,'Range: pode atingir casas além dos adjacentes conforme as regras de movimentação.'),
  Takinon:creature(wiki('Takinom'),[40,60,65,20,90],null,'Swift 1. Pode sacrificar uma criatura UnderWorld para curar 25 de dano.',{printedName:'Takinom',note:'O recurso do CAPX está salvo como Takinon; a criatura publicada chama-se Takinom.'}),
  Tangath_Toborn:creature(wiki('Tangath_Toborn'),[30,40,45,40,30],null,'Pode gastar Mugic para curar 10 de dano próprio.'),
 },
 gear:{
  Armbands_of_Lore:{source:wiki('Armbands_of_Lore'),ability:'Criatura equipada recebe +40 de Coragem e +5 de Energia.',bonus:'Coragem +40 · Energia +5'},
  Burithean_Axe:{source:wiki('Burithean_Axe'),ability:'Power 50: +5 de Energia. Power 75: concede Intimidate Energy 10.',bonus:'Condição ligada ao Poder'},
  Double_Edge:{source:wiki('Double_Edge'),ability:'No começo do combate, escolha Fire, Air, Earth ou Water 5. A criatura também recebe Recklessness 5.',bonus:'Bônus elemental +5 / Recklessness 5'},
  Gauntlets_of_Might:{source:wiki('Gauntlets_of_Might'),ability:'Criatura equipada recebe +25 de Poder.',bonus:'Poder +25'},
  Indigo_Sash:{source:wiki('Indigo_Sash'),ability:'Criatura equipada recebe +40 de Velocidade e +5 de Energia.',bonus:'Velocidade +40 · Energia +5'},
  Khyborns_Mechblede:{source:wiki("Khybon%27s_Mech-Blade"),ability:null,bonus:null,note:'A grafia do arquivo do CAPX difere do nome publicado. Efeito ainda não confirmado.'},
  Liquilizer:{source:wiki('Liquilizer'),ability:'Sacrifique Liquilizer: a criatura equipada ganha o elemento Água até o final do combate.',bonus:'Concede Água ao ser sacrificado'},
  Mind_Prism:{source:wiki('Mind_Prism'),ability:'Criatura equipada recebe +10 de Energia.',bonus:'Energia +10'},
  Mowercycle:{source:wiki('Mowercycle'),ability:'Criatura equipada recebe +25 de Velocidade.',bonus:'Velocidade +25'},
  Ring_Of_Naarim:{source:wiki("Ring_of_Na%27arin"),ability:'Criatura equipada recebe +10 de Poder e +10 de Sabedoria. Se tiver pelo menos 50 de Coragem, recebe ainda +10 de Energia.',bonus:'Poder +10 · Sabedoria +10 · Energia +10 condicional',printedName:"Ring of Na'arin"},
 },
 location:{
  Gloomuck_Swamp:{source:wiki('Gloomuck_Swamp'),initiative:'Coragem',ability:'Ataques de Terra causam mais 5 de dano. Dano de ataques de Fogo é reduzido em 5.'},
  Riverlands:{source:wiki('Riverlands'),initiative:'Sabedoria',ability:'Quando uma criatura causa dano de Água, ela cura 5 de dano próprio.'},
  Stronghold_Morn:{source:wiki('Stronghold_Morn'),initiative:'Velocidade',ability:'No início do combate, as duas criaturas engajadas ganham Fogo, Água, Ar e Terra.'},
  The_Pits:{source:wiki('The_Pits'),initiative:'Fogo',ability:'Criaturas engajadas ganham Outperform Power 5; ataques de Velocidade causam 5 a menos de dano.'},
  The_Storm_Tunnel:{source:wiki('The_Storm_Tunnel'),initiative:'Poder',ability:'Ataques de Ar causam mais 5 de dano. Dano de ataques de Água é reduzido em 5.'},
 },
 mugic:{
  Counterpoint_of_Chaos:{source:wiki('Counterpoint_of_Chaos'),tribe:'UnderWorld',cost:null,ability:'A criatura alvo não pode ganhar tipos elementais.'},
  Diminuendo:{source:wiki('Diminuendo'),tribe:'Genérico',cost:null,ability:'A criatura alvo perde 5 de Energia e 5 em todas as disciplinas.'},
  Dischord_of_Flame:{source:wiki('Dischord_of_Flame'),tribe:'Genérico',cost:1,ability:'A criatura alvo recebe Fogo; se já tiver Fogo, ganha Fire 5.'},
  Ecstatic_Fanfare:{source:wiki('Ecstatic_Fanfare'),tribe:'OverWorld',cost:null,ability:'A criatura alvo recebe +20 Sabedoria, +15 Coragem, +10 Velocidade e +5 Poder.'},
  Final_Fugue:{source:wiki('Final_Fugue'),tribe:'UnderWorld',cost:null,ability:'A criatura alvo ganha 15 de Energia e Recklessness 5.'},
  Hive_Destruction:{source:wiki('Hive_Destruction'),tribe:'UnderWorld',cost:null,ability:'Desativa Hive.'},
  Recurring_Rescue:{source:wiki('Recurring_Rescue'),tribe:'OverWorld',cost:null,ability:'Cura 10 de dano. Se o alvo tiver até 30 de Energia escaneada, retorna à mão após resolver.'},
  Song_of_elemental_attunement:{source:wiki('Song_of_Elemental_Attunement'),tribe:'OverWorld',cost:null,ability:'A criatura alvo ganha todos os tipos elementais do próprio scan.'},
  Sond_of_Embernova:{source:wiki('Song_of_Embernova'),tribe:'Genérico',cost:null,ability:'Mugic que afeta criaturas com afinidade de Fogo e Ar; texto exato do efeito não confirmado.',note:'Nome original: Song of Embernova; arquivo do CAPX traz grafia diferente.'},
  Battlesong_of_Depletion:{source:wiki('Battlesong_of_Depletion'),tribe:'UnderWorld',cost:null,ability:'Criaturas engajadas com o lançador perdem todos os tipos elementais.'},
  Harmonics_of_Water:{source:wiki('Harmonics_of_Water'),tribe:'Genérico',cost:1,ability:'Uma criatura ganha Água. Se já tiver Água, ganha Water 5.'},
  Refrain_of_Denial:{source:wiki('Refrain_of_Denial'),tribe:'OverWorld',cost:2,ability:'Neutraliza uma carta Mugic alvo.'},
  Song_of_Resurgence:{source:wiki('Song_of_Resurgence'),tribe:'OverWorld',cost:1,ability:'Cura 20 de dano de uma criatura alvo.'},
  Strain_of_the_Tide:{source:wiki('Strain_of_the_Tide'),tribe:'OverWorld',cost:1,ability:'Retire criaturas OverWorld do descarte; cure 10 de dano por criatura retirada.'},
 }
};
export const officialFor=(kind,id)=>cardFacts[kind]?.[id]||null;
