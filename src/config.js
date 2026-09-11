// Static game configuration bundled into the single-file engine.
const DEF = {
  sword:  {emoji:'🔪', color:'#e74c3c', glow:'#ff7a6b', name:'剑'},
  shield: {emoji:'🔰', color:'#3498db', glow:'#6fb6ff', name:'盾'},
  heart:  {emoji:'💗', color:'#e84393', glow:'#ff85c0', name:'心'},
  coin:   {emoji:'💰', color:'#f1c40f', glow:'#ffe07a', name:'金'},
  enemy:  {emoji:'👹', color:'#7d3cad', glow:'#c08bff', name:'怪'},
  boss:   {emoji:'👻', color:'#1f6f5c', glow:'#7fffd4', name:'Boss'},
};

const WEAPON={
  human: {e:'🔪', n:['剑','Sword']}, elf: {e:'🏹', n:['箭','Arrow']},
  dwarf: {e:'🔨', n:['锤','Hammer']}, orc: {e:'🪓', n:['斧','Axe']},
  undead:{e:'🦴', n:['骨','Bone']}, beast: {e:'🐾', n:['爪','Claw']},
};

const RACES=[
  {id:'human', e:'🧑', n:['人族','Human'], d:['特性：无\n削弱：无','Trait: none\nWeakness: none'], f:p=>{}},
  {id:'elf', e:'🧝', n:['精灵','Elf'], d:['特性：连击加成翻倍（每多连1个 +30%）\n削弱：「强化体魄」升级只 +3 上限','Trait: combo bonus doubled (+30%/tile)\nWeakness: Fortify Body upgrade gives only +3 max HP'], f:p=>{p.comboMult=2; p.maxHpUpMult=0.5;}},
  {id:'dwarf', e:'🎅', n:['矮人','Dwarf'], d:['特性：护甲减伤翻倍（每点护甲抵 2 点）\n削弱：{WC}总伤 ×0.85（含固定伤害一起算）','Trait: armor counts double (each point blocks 2)\nWeakness: ×0.85 total {W} damage (flat included)'], f:p=>{p.armorMult=2; p.swordMult=0.85;}},
  {id:'orc', e:'🧌', n:['兽人','Orc'], d:['特性：「强化体魄」升级时生命上限翻倍（每次 +12）\n削弱：无甲——永远无法获得护甲','Trait: Fortify Body upgrade gives double max HP (+12 each)\nWeakness: No Armor — can never gain armor'], f:p=>{p.maxHpUpMult=2; p.noArmor=true;}},
  {id:'undead', e:'🪦', n:['亡灵','Undead'], d:['特性：迷惑——所有怪物（含 Boss）攻击倒计时 +1\n削弱：一切治疗效果减半（心/药水/吸魂）+ 主动技能冷却 +1','Trait: Confusion — all monsters (incl. bosses) get +1 attack countdown\nWeakness: all healing halved (hearts/potion/drain) + active-skill cooldowns +1'], f:p=>{p.foeCdBonus=1; p.skillCdMod=(p.skillCdMod||0)+1; p.healMult=0.5;}},
  {id:'beast', e:'🐉', n:['神兽','Mythic Beasts'], d:['特性：神识——获得经验 ×2\n削弱：阴阳失衡——所有敌人攻击倒计时 −1（最低 1）','Trait: Divine Sense — gain 2× XP\nWeakness: Yin-Yang Imbalance — all foes get −1 attack countdown (minimum 1)'], f:p=>{p.foeCdBonus=-1;}},
];
