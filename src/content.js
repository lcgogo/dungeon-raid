// Player-facing descriptions. This file is bundled into the game HTML at build time.
// Keep gameplay values and state-dependent rows in the engine; this module only owns copy.
const CONTENT = {
  tile: {
    sword: [
      `连接 2 个及以上的{W}攻击怪物。{WC}可直接拖过 👹；若火法师已开启「火焰链」，本回合还可划过幽灵等剑免疫 Boss 把它们点燃。`,
      `Link 2+ {W} tiles to attack. A {WC} passes straight through 👹; if Fire Mage's Flame Chain is active, this turn it can also pass through sword-immune bosses such as Ghosts to ignite them.`
    ],
    shield: [
      '连接盾累积「护甲」，攒满就 +1 减伤。受击时先用减伤抵消，剩下的才掉血，但每次至少掉 1 滴。',
      'Linking shields fills Armor; fill the bar for +1 damage reduction. Damage reduction soaks each hit, but you always lose at least 1 HP.'
    ],
    poisonHeart: [
      '被污染怪 🦠 染绿的心。连接它不再回血，反而按等量【扣血】（无视护甲）！炸掉污染怪后，场上的绿毒心会立刻复原成普通红心。',
      'A heart corrupted by the Corruptor 🦠. Linking it DRAINS that much HP instead of healing (ignores armor)! Once the Corruptor is bombed away, the green poison hearts immediately revert to normal hearts.'
    ],
    blackHeart: [
      '巫医「万物皆毒」把棋子燃成的黑毒心。连接它不回血，而是把这些生命当毒灌给全场怪（同蛊毒口径）。红心照常回血——按需取舍连红还是连黑。',
      'Burned into being by the Witch Doctor\'s “All is Poison”. Linking it heals nothing — it poisons all foes instead (like Hex). Red hearts still heal; choose which to link.'
    ],
    heart: ['连接 2 颗及以上的心回复生命。', 'Link 2+ hearts to restore HP.'],
    coin: ['连接 2 枚及以上的金币赚钱，用于商店购买。', 'Link 2+ coins to earn gold for the shop.'],
    ignited: ['这个目标已被火焰链点燃，会在每回合持续掉血，直到死亡。', 'This target is ignited by Flame Chain and keeps taking burn damage every turn until it dies.'],
    enemy: [
      `左上是攻击力，右上是倒计时。每行动一次倒计时 −1，归零就攻击你：先用护甲抵消，剩下的才掉血，但每次至少掉 1 滴。用{WC}串过它就能攻击，伤害够高直接点杀。`,
      `Top-left is its attack, top-right its timer. The timer drops by 1 each action; at 0 it attacks — your armor soaks most of it, but you always lose at least 1 HP. Drag a {WC} through it to attack; enough damage kills it.`
    ]
  }
};
