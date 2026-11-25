import { webcrypto as crypto } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ crypto });
const source = readFileSync(new URL('./shared-web/assets/engine.js', import.meta.url), 'utf8');
vm.runInContext(source + '\nthis.engine = { mutate, sanitize, wins, resetSkillRoom, SKILL_CARDS, SKILL_MAP };', ctx);
const { mutate, sanitize, resetSkillRoom, SKILL_CARDS, SKILL_MAP } = ctx.engine;

let now = Date.now();

function setupSkillRoom(walletA = 0, walletB = 0) {
  const world = { players: {}, rooms: {} };
  const act = (id, body) => mutate(world, id, body, ++now);
  act('a', { action: 'state' });
  act('b', { action: 'state' });
  world.players.a.wallet = walletA;
  world.players.b.wallet = walletB;
  act('a', { action: 'create', mode: 'normal', variant: 'skill' });
  const code = world.players.a.room;
  act('b', { action: 'join', code });
  return { world, room: world.rooms[code], act };
}

function customDuel({ cardA = null, cardB = null, moveA, moveB, hpA = 120, hpB = 120, energyA = 5, energyB = 5, streakA = 0, streakB = 0, poisonA = 0, poisonB = 0, sealA = 0, sealB = 0, extraHandA = ['04_gale_ambush'], extraHandB = ['04_gale_ambush'], deckA = ['09_vitality_nectar', '10_heal_talisman', '11_nimble_draw'], deckB = ['09_vitality_nectar', '10_heal_talisman', '11_nimble_draw'], discardA = [], discardB = [], round = 1 }) {
  const { world, room, act } = setupSkillRoom(0, 0);
  room.round = round;
  const [pa, pb] = room.players;
  pa.hp = hpA; pb.hp = hpB;
  pa.energy = energyA; pb.energy = energyB;
  pa.streak = streakA; pb.streak = streakB;
  pa.poison = poisonA; pb.poison = poisonB;
  pa.sealCost = sealA; pb.sealCost = sealB;
  pa.hand = [...(cardA ? [cardA] : []), ...extraHandA];
  pb.hand = [...(cardB ? [cardB] : []), ...extraHandB];
  pa.deck = [...deckA]; pb.deck = [...deckB];
  pa.discard = [...discardA]; pb.discard = [...discardB];
  act('a', { action: 'move', round, move: moveA, card: cardA });
  // 校验未揭晓前对手不可看到手势、技能、手牌或能量变化
  const viewB = sanitize(world, 'b');
  assert.equal(viewB.room.players[0].ready, true);
  assert.equal(viewB.room.players[0].move, undefined);
  assert.equal(viewB.room.players[0].card, undefined);
  assert.equal(viewB.room.players[0].hand, undefined);
  assert.equal(viewB.room.players[0].energy, undefined);
  act('b', { action: 'move', round, move: moveB, card: cardB });
  return { world, room, pa, pb, last: room.last };
}

// 1. 基础初始化、零金币免费建房与保密校验
{
  assert.equal(SKILL_CARDS.length, 16, '技能卡池必须为 16 张');
  const { world, room } = setupSkillRoom(0, 0);
  assert.equal(room.variant, 'skill');
  for (const p of room.players) {
    assert.equal(p.hp, 120);
    assert.equal(p.energy, 2);
    assert.equal(p.hand.length, 3);
    assert.equal(p.deck.length, 13);
    assert.equal(p.discard.length, 0);
    assert.equal(new Set([...p.hand, ...p.deck]).size, 16, '16 张卡每张 1 份无重复');
  }
  // 准备阶段隐藏开局手牌防刷开局
  room.phase = 'ready';
  assert.deepEqual(Array.from(sanitize(world, 'a').room.players[0].hand), []);
  room.phase = 'move';
  assert.equal(sanitize(world, 'a').room.players[0].hand.length, 3);
  assert.equal(world.players.a.wallet, 0, '0 金币也可创建并游玩技能模式');
}

// 2. 16 张技能卡逐卡覆盖 胜 / 负 / 平 三种手势结果
// 场景设定：A 出选定技能卡，B 不出卡；起始 HP=80（便于检验回血且不致死），能量=5，牌库充足
const OUTCOME_MOVES = {
  win: ['rock', 'scissors'],
  tie: ['rock', 'rock'],
  lose: ['rock', 'paper']
};

for (const card of SKILL_CARDS) {
  for (const [kind, [mA, mB]] of Object.entries(OUTCOME_MOVES)) {
    const { pa, pb, last } = customDuel({
      cardA: card.id, cardB: null, moveA: mA, moveB: mB,
      hpA: 80, hpB: 80, energyA: 5, energyB: 2,
      extraHandA: ['08_iron_counter', '01_flame_punch'] // 同为2费，测幻影置换稳定排序
    });
    const baseOut = kind === 'win' ? 20 : 0;
    const baseIn = kind === 'lose' ? 20 : 0;
    let expDmgToB = baseOut;
    let expDmgToA = baseIn;
    let expReflectToB = 0;
    let expHealA = 0;
    let expEnergyAAfterSettle = 5 - card.cost; // 回合切换后还会 +1
    let expStreakA = kind === 'win' ? 1 : 0;

    switch (card.id) {
      case '01_flame_punch':
        if (kind === 'win') expDmgToB = 40;
        break;
      case '02_twin_strike':
        if (kind === 'win') { expDmgToB = 24; expStreakA = 3; }
        break;
      case '03_meteor_break':
        if (kind === 'win') expDmgToB = 46;
        else if (kind === 'tie') expDmgToB = 16;
        break;
      case '04_gale_ambush':
        if (kind === 'win') expDmgToB = 30;
        else if (kind === 'tie') expDmgToB = 8;
        break;
      case '05_holy_barrier':
        if (kind === 'lose') { expDmgToA = 0; expReflectToB = 8; }
        break;
      case '06_mirror_reflect':
        if (kind === 'lose') { expDmgToA = 10; expReflectToB = 10; }
        break;
      case '07_brace_charge':
        if (kind !== 'win') expEnergyAAfterSettle = Math.min(5, expEnergyAAfterSettle + 2);
        break;
      case '08_iron_counter':
        expDmgToA = Math.max(0, expDmgToA - 14);
        break;
      case '09_vitality_nectar':
        expHealA = 24;
        break;
      case '10_heal_talisman':
        expHealA = 12;
        expDmgToA = Math.max(0, expDmgToA - 8);
        break;
      case '11_nimble_draw':
        if (kind === 'win') expDmgToB = 28;
        break;
      case '12_energy_siphon':
        expHealA = 12;
        expEnergyAAfterSettle = Math.min(5, expEnergyAAfterSettle + 1);
        break;
      case '13_venom_dart':
        assert.equal(pb.poison, 2, '毒雾飞镖施加 2 回合中毒');
        assert.equal(last.poisonTaken[1], 0, '毒雾飞镖当回合不扣血');
        break;
      case '14_fate_seal':
        if (kind !== 'lose') {
          assert.equal(pb.sealCost, 1, '命运封印在胜/平时使对手下回合费用+1');
          // B 原本 2 能量，被扣 1 剩 1，进入第 2 回合恢复 1 变 2
          assert.equal(pb.energy, 2);
        } else {
          assert.equal(pb.sealCost, 0, '命运封印落败时不生效');
          assert.equal(pb.energy, 3);
        }
        break;
      case '15_tip_scales':
        if (kind === 'lose') { expDmgToA = 0; expDmgToB = 15; expStreakA = 0; }
        break;
      case '16_phantom_swap':
        if (kind === 'lose') expDmgToA = 14;
        // 额外手牌为 ['08_iron_counter'(2费), '01_flame_punch'(2费)]，同费按稳定 ID 排序应弃掉 '01_flame_punch'
        assert.ok(pa.discard.includes('01_flame_punch'), '幻影置换同费应按稳定 ID 弃掉 01_flame_punch');
        assert.ok(pa.hand.includes('08_iron_counter'), '幻影置换应保留排序靠后的同费牌');
        break;
    }

    const expHpA = Math.min(120, 80 - expDmgToA + expHealA);
    const expHpB = Math.min(120, 80 - expDmgToB - expReflectToB);
    assert.equal(pa.hp, expHpA, `${card.id} [${kind}] A 生命不符`);
    assert.equal(pb.hp, expHpB, `${card.id} [${kind}] B 生命不符`);
    assert.equal(pa.streak, expStreakA, `${card.id} [${kind}] A 连胜不符`);
    const nextTurnBonus = card.id === '08_iron_counter' ? 1 : 0;
    assert.equal(pa.energy, Math.min(5, expEnergyAAfterSettle + 1 + nextTurnBonus), `${card.id} [${kind}] A 下回合能量不符`);
  }
}
console.log('通过：16 张技能卡 × 胜/平/负 共 48 种分支逐一核验。');

// 3. 破盾、百分比向上取整、反弹向下取整与逆转天平交互
{
  // A 1层连胜(基础22) + 灵动抽牌? 不，用 1 层连胜 + 疾风偷袭 = 20+2+10=32，再测奇数原始伤害：
  // 构造奇数原始伤害：A 使用逆转天平(15)落败 vs B 铁壁反震(-14) -> B 仅受 1 点直接伤害
  const r1 = customDuel({ cardA: '15_tip_scales', cardB: '08_iron_counter', moveA: 'rock', moveB: 'paper', hpA: 100, hpB: 100 });
  assert.equal(r1.pa.hp, 100, '逆转天平落败免除直接伤害');
  assert.equal(r1.pb.hp, 99, '逆转天平造成的 15 直接伤害应被铁壁反震 -14 减至 1');

  // 破盾陨星(46, 破盾) vs 圣光壁垒：减伤被无视(受46)，但 8 点反伤仍生效
  const r2 = customDuel({ cardA: '03_meteor_break', cardB: '05_holy_barrier', moveA: 'rock', moveB: 'scissors', hpA: 100, hpB: 100 });
  assert.equal(r2.pb.hp, 54, '破盾应无视圣光壁垒减伤');
  assert.equal(r2.pa.hp, 92, '破盾不取消圣光壁垒的 8 点反伤');

  // 破盾陨星(46, 破盾) vs 镜面反弹：减伤被无视(受46)，反弹一半(23)仍生效
  const r3 = customDuel({ cardA: '03_meteor_break', cardB: '06_mirror_reflect', moveA: 'rock', moveB: 'scissors', hpA: 100, hpB: 100 });
  assert.equal(r3.pb.hp, 54, '破盾应无视镜面反弹减伤');
  assert.equal(r3.pa.hp, 77, '破盾不取消镜面反弹 23 点反伤');

  // 破盾陨星(46, 破盾) vs 逆转天平：逆转天平不能越过破盾减伤规则(仍受46)，但仍对对手造成 15 直接伤害
  const r4 = customDuel({ cardA: '03_meteor_break', cardB: '15_tip_scales', moveA: 'rock', moveB: 'scissors', hpA: 100, hpB: 100 });
  assert.equal(r4.pb.hp, 54, '逆转天平不能免除破盾陨星的伤害');
  assert.equal(r4.pa.hp, 85, '逆转天平落败仍造成 15 点直接伤害');

  // 百分比减伤向上取整 & 反弹向下取整验证：设 B 落败用镜面反弹，A 获胜造成奇数伤害？
  // 普通基础伤害 20/22/24/26 皆为偶数；若未来调参出现奇数，在引擎中验证奇数数学规则（这里用 15_tip_scales? 15_tip_scales 只在落败触发，镜面反弹也只在落败触发，不会同回合碰撞；我们验证连胜上限 3 层 = 26 伤害 -> 13/13）
  const r5 = customDuel({ cardA: null, cardB: '06_mirror_reflect', moveA: 'rock', moveB: 'scissors', streakA: 5, hpA: 100, hpB: 100 });
  assert.equal(r5.last.rawDirect[0], 26, '连胜加成最多 3 层（+6）');
  assert.equal(r5.pb.hp, 87);
  assert.equal(r5.pa.hp, 87);
}
console.log('通过：破盾、圣光壁垒、镜面反弹、逆转天平与连胜上限交互测试。');

// 4. 中毒持续 2 回合、不吃防御减伤、重复施加只刷新不叠加；封印到期消失
{
  const { room, act } = setupSkillRoom();
  const [pa, pb] = room.players;
  pa.energy = 5; pb.energy = 5;
  pa.hand = ['13_venom_dart', '14_fate_seal'];
  pb.hand = ['05_holy_barrier', '04_gale_ambush'];
  act('a', { action: 'move', round: 1, move: 'rock', card: '13_venom_dart' });
  act('b', { action: 'move', round: 1, move: 'rock', card: null });
  pa.hand = ['14_fate_seal', '13_venom_dart'];
  act('a', { action: 'move', round: 2, move: 'rock', card: '14_fate_seal' });
  act('b', { action: 'move', round: 2, move: 'scissors', card: '05_holy_barrier' });
  assert.equal(pb.hp, 112);
  assert.equal(pb.sealCost, 1);
  // 第 3 回合验证封印费用 +1：B 设能量为 1 时无法打出原本 1 费的 04_gale_ambush
  pb.energy = 1;
  assert.throws(() => act('b', { action: 'move', round: 3, move: 'rock', card: '04_gale_ambush' }), /能量不足/, '封印使 1 费卡变为 2 费');
  pb.energy = 2;
  act('b', { action: 'move', round: 3, move: 'rock', card: '04_gale_ambush' });
  assert.equal(pb.energy, 0, '提交成功即按封印后费用扣除 2 能量');
  act('a', { action: 'move', round: 3, move: 'rock', card: '13_venom_dart' });
  assert.equal(pb.hp, 104, '第 3 回合中毒只扣 8 血，不叠加');
  assert.equal(pb.poison, 2, '重复施加毒雾只刷新剩余回合数为 2');
  assert.equal(pb.sealCost, 0, '命运封印仅持续一回合，第 4 回合自动解除');
  // 第 4、5 回合验证中毒走完归零停止
  act('a', { action: 'move', round: 4, move: 'rock', card: null });
  act('b', { action: 'move', round: 4, move: 'rock', card: null });
  assert.equal(pb.hp, 96);
  assert.equal(pb.poison, 1);
  act('a', { action: 'move', round: 5, move: 'rock', card: null });
  act('b', { action: 'move', round: 5, move: 'rock', card: null });
  assert.equal(pb.hp, 88);
  assert.equal(pb.poison, 0);
  act('a', { action: 'move', round: 6, move: 'rock', card: null });
  act('b', { action: 'move', round: 6, move: 'rock', card: null });
  assert.equal(pb.hp, 88, '中毒结束后不再扣血');
}
console.log('通过：中毒刷新不叠加、防御不减免中毒、命运封印加费与一回合到期。');

// 5. 牌库耗尽重洗弃牌堆、手牌上限 4、同回合回血抵消致死、同时归零平局、10回合剩余生命判定与非法操作拦截
{
  // 牌库耗尽重洗 + 手牌上限 4
  const r1 = customDuel({
    cardA: '11_nimble_draw', cardB: null, moveA: 'rock', moveB: 'rock',
    extraHandA: ['01_flame_punch', '02_twin_strike'], // 出牌后剩 2 张
    deckA: [], discardA: ['04_gale_ambush', '05_holy_barrier', '07_brace_charge']
  });
  // 打出 11_nimble_draw 先入弃牌堆(共4张)，再洗牌抽 2 张 -> 手牌变 4 张；进入第 2 回合抽牌因已满 4 张不再抽，牌库剩余 2 张
  assert.equal(r1.pa.hand.length, 4, '手牌上限为 4');
  assert.equal(r1.pa.deck.length, 2, '手牌已满时回合初抽牌不消耗牌库');
  assert.equal(r1.pa.discard.length, 0);

  // 同回合回血抵消致死伤害：A 剩 10 血，落败受 20 伤害，但打出元气甘露(+24) -> 10 - 20 + 24 = 14 存活！
  const r2 = customDuel({ cardA: '09_vitality_nectar', cardB: null, moveA: 'scissors', moveB: 'rock', hpA: 10, hpB: 50 });
  assert.equal(r2.pa.hp, 14, '同回合回血应抵消致死伤害');
  assert.equal(r2.room.phase, 'move');

  // 同时归零判平局：A 剩 8 血用破盾陨星(46)获胜，B 剩 30 血用圣光壁垒(反伤8)落败 -> A 8-8=0, B 30-46=0 -> 平局结束
  const r3 = customDuel({ cardA: '03_meteor_break', cardB: '05_holy_barrier', moveA: 'rock', moveB: 'scissors', hpA: 8, hpB: 30 });
  assert.equal(r3.pa.hp, 0);
  assert.equal(r3.pb.hp, 0);
  assert.equal(r3.room.phase, 'finished');
  assert.equal(r3.last.matchWinner, 0, '双方同时归零必须判定为平局');

  // 第 10 回合按剩余生命判胜负与平局
  const r4 = customDuel({ cardA: null, cardB: null, moveA: 'rock', moveB: 'rock', hpA: 65, hpB: 65, round: 10 });
  assert.equal(r4.room.phase, 'finished');
  assert.equal(r4.last.matchWinner, 0, '10 回合生命相同为平局');

  const r5 = customDuel({ cardA: null, cardB: null, moveA: 'rock', moveB: 'rock', hpA: 70, hpB: 65, round: 10 });
  assert.equal(r5.room.phase, 'finished');
  assert.equal(r5.last.matchWinner, 1, '10 回合生命高者获胜');

  // 非法操作拦截：使用牌库/弃牌堆的牌、独牌使用幻影置换、重复提交扣费保护
  const { room, act } = setupSkillRoom();
  const [pa] = room.players;
  pa.hand = ['16_phantom_swap'];
  pa.deck = ['01_flame_punch'];
  pa.discard = ['04_gale_ambush'];
  pa.energy = 5;
  assert.throws(() => act('a', { action: 'move', round: 1, move: 'rock', card: '01_flame_punch' }), /手牌中没有/, '不能使用牌库中的牌');
  assert.throws(() => act('a', { action: 'move', round: 1, move: 'rock', card: '04_gale_ambush' }), /手牌中没有/, '不能使用弃牌堆中的牌');
  assert.throws(() => act('a', { action: 'move', round: 1, move: 'rock', card: '16_phantom_swap' }), /另一张牌/, '独牌不能使用幻影置换');
  pa.hand = ['04_gale_ambush', '05_holy_barrier'];
  act('a', { action: 'move', round: 1, move: 'rock', card: '04_gale_ambush' });
  const lockedEnergy = pa.energy;
  assert.throws(() => act('a', { action: 'move', round: 1, move: 'paper', card: '05_holy_barrier' }), /已经出拳/, '锁定后不可重复出拳');
  assert.equal(pa.energy, lockedEnergy, '重复请求不可重复扣能量');

  // 再来一局重置校验
  resetSkillRoom(room);
  assert.equal(room.round, 1);
  assert.equal(room.players[0].hp, 120);
  assert.equal(room.players[0].hand.length, 3);
}
console.log('通过：重洗、手牌上限、回血免死、同时归零、10回合判平与非法牌权拦截。');

// 6. 自动模拟 600 局技能对战：检验不变量（能量/手牌/生命边界）并输出首版卡牌数据统计
{
  const TOTAL_GAMES = 600;
  let winsA = 0, winsB = 0, draws = 0, totalRounds = 0, koEnds = 0;
  const cardPlays = Object.fromEntries(SKILL_CARDS.map(c => [c.id, { plays: 0, matchWins: 0 }]));
  const moves = ['rock', 'scissors', 'paper'];

  for (let g = 0; g < TOTAL_GAMES; g++) {
    const { world, room, act } = setupSkillRoom(5000, 5000);
    const usedByA = new Set(), usedByB = new Set();
    while (room.phase !== 'finished') {
      const r = room.round;
      for (const [idx, pid] of [[0, 'a'], [1, 'b']]) {
        const p = room.players[idx];
        assert.ok(p.energy >= 0 && p.energy <= 5, '能量越界');
        assert.ok(p.hand.length <= 4, '手牌越界');
        assert.ok(p.hp > 0 && p.hp <= 120, '局中生命越界');
        const playable = p.hand.filter(cid => {
          if (cid === '16_phantom_swap' && p.hand.length < 2) return false;
          return SKILL_MAP[cid].cost + (p.sealCost > 0 ? 1 : 0) <= p.energy;
        });
        // 75% 概率打出可用最高价值牌，25% 留能量
        let chosen = null;
        if (playable.length > 0 && (g + r + idx) % 4 !== 0) {
          chosen = playable[Math.floor(Math.random() * playable.length)];
          cardPlays[chosen].plays++;
          (idx === 0 ? usedByA : usedByB).add(chosen);
        }
        act(pid, { action: 'move', round: r, move: moves[Math.floor(Math.random() * 3)], card: chosen });
      }
    }
    assert.equal(world.players.a.wallet, 5000, '技能对战不得改动钱包');
    assert.equal(world.players.b.wallet, 5000, '技能对战不得改动钱包');
    totalRounds += room.last.round;
    if (room.players[0].hp === 0 || room.players[1].hp === 0) koEnds++;
    const w = room.last.matchWinner;
    if (w === 1) { winsA++; for (const c of usedByA) cardPlays[c].matchWins++; }
    else if (w === -1) { winsB++; for (const c of usedByB) cardPlays[c].matchWins++; }
    else draws++;
  }
  console.log(`通过：${TOTAL_GAMES} 局随机策略模拟（A胜 ${winsA} / B胜 ${winsB} / 平 ${draws}，平均 ${ (totalRounds / TOTAL_GAMES).toFixed(2) } 回合，提前击倒率 ${ (koEnds / TOTAL_GAMES * 100).toFixed(1) }%，零越界异常；首版数值待真人平衡验证）。`);
}
