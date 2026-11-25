const MOVE = ['rock','scissors','paper'];
const NAMES = ['小狐狸','小熊','小兔子','小熊猫','机器人','外星人','宇航员','魔法师','小猫','画家'];
const SKILL_MAX_HP = 120, SKILL_INIT_ENERGY = 2, SKILL_MAX_ENERGY = 5, SKILL_HAND_LIMIT = 4, SKILL_MAX_STREAK = 3;
const SKILL_CARDS = [
  { id: '01_flame_punch', school: '强攻', name: '烈焰重拳', cost: 2, trigger: '获胜时', desc: '手势获胜时，本回合直接伤害额外 +20。' },
  { id: '02_twin_strike', school: '强攻', name: '双星连击', cost: 2, trigger: '获胜时', desc: '手势获胜时直接伤害额外 +4；结算后的连胜值在正常 +1 后再 +2，仍受 3 层上限限制。' },
  { id: '03_meteor_break', school: '强攻', name: '破盾陨星', cost: 3, trigger: '获胜/平局', desc: '获胜时将本次直接伤害设为 46，且无视减伤；平局时造成 16 点直接伤害，落败无额外效果。' },
  { id: '04_gale_ambush', school: '强攻', name: '疾风偷袭', cost: 1, trigger: '获胜/平局', desc: '获胜时直接伤害额外 +10；平局时造成 8 点直接伤害。' },
  { id: '05_holy_barrier', school: '防守', name: '圣光壁垒', cost: 1, trigger: '落败时', desc: '落败时本回合受到的直接伤害减为 0，并造成 8 点反伤；破盾可无视该减伤。' },
  { id: '06_mirror_reflect', school: '防守', name: '镜面反弹', cost: 2, trigger: '落败时', desc: '落败时受到的直接伤害减半，同时反弹原始直接伤害的一半；破盾可无视减伤，但不取消反弹。' },
  { id: '07_brace_charge', school: '防守', name: '蓄势待发', cost: 1, trigger: '平局/落败', desc: '平局或落败时，结算后获得 2 能量并抽 1 张，受上限约束。' },
  { id: '08_iron_counter', school: '防守', name: '铁壁反震', cost: 2, trigger: '本回合生效', desc: '本回合受到的直接伤害 -14，最低为 0；下一回合开始额外获得 1 能量。' },
  { id: '09_vitality_nectar', school: '回复', name: '元气甘露', cost: 2, trigger: '不论胜负', desc: '不论胜负，结算时回复 24 生命。' },
  { id: '10_heal_talisman', school: '回复', name: '治愈护符', cost: 1, trigger: '不论胜负', desc: '回复 12 生命，本回合受到的直接伤害 -8，最低为 0。' },
  { id: '11_nimble_draw', school: '回复', name: '灵动抽牌', cost: 1, trigger: '不论胜负', desc: '结算时抽 2 张；手势获胜时直接伤害额外 +8。' },
  { id: '12_energy_siphon', school: '回复', name: '能量虹吸', cost: 2, trigger: '不论胜负', desc: '回复 12 生命并获得 1 能量；获胜时再抽 1 张。' },
  { id: '13_venom_dart', school: '技巧', name: '毒雾飞镖', cost: 1, trigger: '不论胜负', desc: '对手从下回合起连续 2 回合末损失 8 生命；重复施加只刷新剩余时间，不叠加。' },
  { id: '14_fate_seal', school: '技巧', name: '命运封印', cost: 2, trigger: '获胜/平局', desc: '获胜或平局时使对手能量 -1，最低 0；其下一回合出卡费用 +1，仅持续一回合。双方已锁定的卡不受影响。' },
  { id: '15_tip_scales', school: '技巧', name: '逆转天平', cost: 3, trigger: '落败时', desc: '落败时免除本回合受到的直接伤害，并对对手造成 15 点直接伤害；不改变手势胜负，也不能越过破盾减伤规则。' },
  { id: '16_phantom_swap', school: '技巧', name: '幻影置换', cost: 1, trigger: '需另有手牌', desc: '需要手中有另一张牌才能使用；结算时弃掉其他手牌中费用最高的一张，同费按稳定卡牌 ID 排序，再抽 2 张；落败时受到的直接伤害 -6。' }
];
const SKILL_MAP = Object.fromEntries(SKILL_CARDS.map(c => [c.id, c]));

const wins = (a,b) => a === b ? 0 : ({rock:'scissors',scissors:'paper',paper:'rock'}[a] === b ? 1 : -1);
const err = message => { throw new Error(message); };
const integer = n => Number.isSafeInteger(n);
const copy = value => JSON.parse(JSON.stringify(value));

function randInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let x;
  do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
  return x % max;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function drawCards(p, count) {
  let drawn = 0;
  for (let k = 0; k < count; k++) {
    if (p.hand.length >= SKILL_HAND_LIMIT) break;
    if (p.deck.length === 0 && p.discard.length > 0) {
      p.deck = shuffle(p.discard);
      p.discard = [];
    }
    if (p.deck.length === 0) break;
    p.hand.push(p.deck.pop());
    drawn++;
  }
  return drawn;
}

function makeSkillPlayer(id, character) {
  const p = {
    id, character, net: 0, high: 0, move: null, guess: null,
    hp: SKILL_MAX_HP, energy: SKILL_INIT_ENERGY, streak: 0,
    poison: 0, sealCost: 0, nextRoundEnergy: 0,
    deck: shuffle(SKILL_CARDS.map(c => c.id)), hand: [], discard: [],
    card: null, paidCost: 0
  };
  drawCards(p, 3);
  return p;
}

function resetSkillRoom(r) {
  r.round = 1;
  r.last = null;
  r.players = r.players.map(p => makeSkillPlayer(p.id, p.character));
}

function clean(world, now) {
  for (const [code, room] of Object.entries(world.rooms)) if (now - room.updated > 86400000) { for (const p of room.players) if (world.players[p.id]?.room === code) world.players[p.id].room = null; delete world.rooms[code]; }
  for (const [id, p] of Object.entries(world.players)) if (!p.room && now - p.seen > 90*86400000) delete world.players[id];
}

function sanitize(world, id) {
  const me = world.players[id], r = me.room && world.rooms[me.room];
  if (!r) return { wallet: me.wallet, character: me.character, room: null };
  const i = r.players.findIndex(p => p.id === id), other = r.players[1 - i];
  const isSkill = r.variant === 'skill';
  const hideHand = r.phase === 'waiting' || r.phase === 'ready';
  return {
    wallet: me.wallet,
    character: me.character,
    room: {
      code: r.code,
      mode: r.mode,
      variant: r.variant || 'classic',
      round: r.round,
      phase: r.phase,
      players: r.players.map((p, j) => {
        const isMe = j === i;
        if (isSkill) {
          return {
            character: p.character, net: 0, high: 0, ready: !!p.move, guessed: false, isMe,
            hp: p.hp, maxHp: SKILL_MAX_HP, streak: p.streak, poison: p.poison, sealCost: p.sealCost,
            ...(isMe ? {
              move: hideHand ? null : p.move,
              card: hideHand ? null : p.card,
              paidCost: hideHand ? 0 : (p.paidCost || 0),
              energy: p.energy,
              maxEnergy: SKILL_MAX_ENERGY,
              hand: hideHand ? [] : [...p.hand],
              deckCount: hideHand ? SKILL_CARDS.length : p.deck.length,
              discardCount: hideHand ? 0 : p.discard.length
            } : {})
          };
        }
        return {
          character: p.character, net: p.net, high: p.high, ready: !!p.move, guessed: !!p.guess, isMe,
          ...(isMe ? { move: p.move, stake: p.stake, tier: p.tier, guess: p.guess } : {})
        };
      }),
      last: r.last,
      hasOpponent: !!other
    }
  };
}

function finishNormal(world, r) {
  const [a, b] = r.players; let bonus = [0, 0];
  if (a.net >= 0 && b.net >= 0 && a.net !== b.net) { let wi = a.net > b.net ? 0 : 1, li = 1 - wi; let value = Math.min(Math.floor(r.players[li].net / 2), world.players[r.players[li].id].wallet); bonus[wi] = value; bonus[li] = -value; }
  else if (a.net >= 0 && b.net < 0) bonus[0] = a.net;
  else if (b.net >= 0 && a.net < 0) bonus[1] = b.net;
  for (let i = 0; i < 2; i++) world.players[r.players[i].id].wallet += bonus[i];
  r.last.final = { nets: [a.net, b.net], bonus }; r.phase = 'finished';
}

function settleNormal(world, r) {
  const [a, b] = r.players, outcome = wins(a.move, b.move); let changes = [];
  for (let i = 0; i < 2; i++) { let p = r.players[i], delta = -p.tier + (i === 0 ? outcome : -outcome) * p.stake * (p.tier / 10); world.players[p.id].wallet += delta; p.net += delta; changes.push(delta); }
  r.last = { round: r.round, moves: [a.move, b.move], outcome, changes, fees: [a.tier, b.tier], stakes: [a.stake, b.stake] };
  for (const p of r.players) { p.move = null; p.tier = null; p.stake = null; }
  if (r.round === 10) finishNormal(world, r); else r.round++;
}

function settleSkill(world, r) {
  const p = r.players, outcome = wins(p[0].move, p[1].move);
  const res = [outcome, -outcome];
  const cards = [p[0].card, p[1].card];
  const preStreak = [p[0].streak, p[1].streak];
  const hpBefore = [p[0].hp, p[1].hp];

  // 1. 打出的卡先进入各自弃牌堆
  for (let i = 0; i < 2; i++) {
    if (cards[i]) p[i].discard.push(cards[i]);
  }

  // 2. 计算双方原始直接伤害与破盾标志
  const rawDirect = [0, 0], pierce = [false, false];
  for (let i = 0; i < 2; i++) {
    if (res[i] === 1) rawDirect[i] = 20 + Math.min(SKILL_MAX_STREAK, preStreak[i]) * 2;
    const c = cards[i];
    if (c === '01_flame_punch' && res[i] === 1) rawDirect[i] += 20;
    else if (c === '02_twin_strike' && res[i] === 1) rawDirect[i] += 4;
    else if (c === '03_meteor_break') {
      if (res[i] === 1) { rawDirect[i] = 46; pierce[i] = true; }
      else if (res[i] === 0) rawDirect[i] = 16;
    } else if (c === '04_gale_ambush') {
      if (res[i] === 1) rawDirect[i] += 10;
      else if (res[i] === 0) rawDirect[i] = 8;
    } else if (c === '11_nimble_draw' && res[i] === 1) rawDirect[i] += 8;
    else if (c === '15_tip_scales' && res[i] === -1) rawDirect[i] = 15;
  }

  // 3. 计算防御减伤与附加反伤（反伤不再触发连锁或减伤）
  const directTaken = [0, 0], reflectTaken = [0, 0];
  for (let d = 0; d < 2; d++) {
    const a = 1 - d, raw = rawDirect[a], ignoreRed = pierce[a], dc = cards[d];
    let dmg = raw;
    if (dc === '05_holy_barrier' && res[d] === -1) {
      if (!ignoreRed) dmg = 0;
      reflectTaken[a] += 8;
    } else if (dc === '06_mirror_reflect' && res[d] === -1) {
      if (!ignoreRed) dmg = Math.ceil(raw / 2);
      reflectTaken[a] += Math.floor(raw / 2);
    } else if (dc === '08_iron_counter') {
      if (!ignoreRed) dmg = Math.max(0, raw - 14);
    } else if (dc === '10_heal_talisman') {
      if (!ignoreRed) dmg = Math.max(0, raw - 8);
    } else if (dc === '15_tip_scales' && res[d] === -1) {
      if (!ignoreRed) dmg = 0;
    } else if (dc === '16_phantom_swap' && res[d] === -1) {
      if (!ignoreRed) dmg = Math.max(0, raw - 6);
    }
    directTaken[d] = dmg;
  }

  // 4. 计算本回合已有持续伤害、回复、能量、封印、下回合回能与抽弃牌
  const poisonTaken = [0, 0], healed = [0, 0], energyGain = [0, 0], energyDrain = [0, 0], nextSeal = [0, 0], nextEnergy = [0, 0], drawQueue = [0, 0];
  for (let i = 0; i < 2; i++) {
    if (p[i].poison > 0) {
      poisonTaken[i] = 8;
      p[i].poison -= 1;
    }
  }
  for (let i = 0; i < 2; i++) {
    const o = 1 - i, c = cards[i];
    if (c === '07_brace_charge' && res[i] <= 0) {
      energyGain[i] += 2;
      drawQueue[i] += 1;
    } else if (c === '08_iron_counter') {
      nextEnergy[i] += 1;
    } else if (c === '09_vitality_nectar') {
      healed[i] += 24;
    } else if (c === '10_heal_talisman') {
      healed[i] += 12;
    } else if (c === '11_nimble_draw') {
      drawQueue[i] += 2;
    } else if (c === '12_energy_siphon') {
      healed[i] += 12;
      energyGain[i] += 1;
      if (res[i] === 1) drawQueue[i] += 1;
    } else if (c === '13_venom_dart') {
      p[o].poison = 2;
    } else if (c === '14_fate_seal' && res[i] >= 0) {
      energyDrain[o] += 1;
      nextSeal[o] = 1;
    } else if (c === '16_phantom_swap') {
      if (p[i].hand.length > 0) {
        const sorted = [...p[i].hand].sort((x, y) => (SKILL_MAP[y].cost - SKILL_MAP[x].cost) || (x < y ? -1 : x > y ? 1 : 0));
        const dropId = sorted[0];
        const idx = p[i].hand.indexOf(dropId);
        if (idx >= 0) p[i].hand.splice(idx, 1);
        p[i].discard.push(dropId);
      }
      drawQueue[i] += 2;
    }
  }

  // 应用能量、封印、下回合加能、技能抽牌与连胜更新
  for (let i = 0; i < 2; i++) {
    p[i].energy = Math.max(0, Math.min(SKILL_MAX_ENERGY, p[i].energy + energyGain[i] - energyDrain[i]));
    p[i].sealCost = nextSeal[i];
    p[i].nextRoundEnergy = nextEnergy[i];
    if (drawQueue[i] > 0) drawCards(p[i], drawQueue[i]);
    if (res[i] === 1) {
      const add = 1 + (cards[i] === '02_twin_strike' ? 2 : 0);
      p[i].streak = Math.min(SKILL_MAX_STREAK, preStreak[i] + add);
    } else {
      p[i].streak = 0;
    }
  }

  // 5. 统一扣血和回血（回血可抵消同回合伤害，限制 0～120）
  for (let i = 0; i < 2; i++) {
    const totalDmg = directTaken[i] + reflectTaken[i] + poisonTaken[i];
    p[i].hp = Math.max(0, Math.min(SKILL_MAX_HP, p[i].hp - totalDmg + healed[i]));
  }

  let matchWinner = null;
  if (p[0].hp === 0 || p[1].hp === 0) {
    matchWinner = (p[0].hp === 0 && p[1].hp === 0) ? 0 : (p[1].hp === 0 ? 1 : -1);
  } else if (r.round === 10) {
    matchWinner = p[0].hp === p[1].hp ? 0 : (p[0].hp > p[1].hp ? 1 : -1);
  }

  r.last = {
    round: r.round,
    moves: [p[0].move, p[1].move],
    outcome,
    changes: [0, 0],
    cards,
    rawDirect,
    directTaken,
    reflectTaken,
    poisonTaken,
    healed,
    hpBefore,
    hpAfter: [p[0].hp, p[1].hp],
    pierced: pierce,
    matchWinner
  };

  for (const pl of p) {
    pl.move = null;
    pl.card = null;
    pl.paidCost = 0;
  }

  if (matchWinner !== null) {
    r.phase = 'finished';
  } else {
    r.round += 1;
    for (let i = 0; i < 2; i++) {
      p[i].energy = Math.min(SKILL_MAX_ENERGY, p[i].energy + 1 + p[i].nextRoundEnergy);
      p[i].nextRoundEnergy = 0;
      drawCards(p[i], 1);
    }
  }
}

function settleBet(world, r) {
  const [a, b] = r.players, outcome = wins(a.move, b.move), changes = outcome === 0 ? [0, 0] : [outcome * 2 * a.stake, -outcome * 2 * b.stake];
  const handChanges = [...changes];
  let correct;
  if (r.mode === 'guessMove') correct = [a.guess === b.move, b.guess === a.move];
  else correct = outcome === 0 ? null : [a.guess === (outcome === 1 ? 'win' : 'lose'), b.guess === (outcome === -1 ? 'win' : 'lose')];
  if (correct) { if (correct[0] !== correct[1]) { const win = correct[0] ? 0 : 1, lose = 1 - win; changes[win] += r.players[lose].stake; changes[lose] -= r.players[lose].stake; } else { changes[0] -= a.stake; changes[1] -= b.stake; } }
  for (let i = 0; i < 2; i++) { world.players[r.players[i].id].wallet += changes[i]; r.players[i].net += changes[i]; }
  r.last = { round: 1, moves: [a.move, b.move], outcome, guesses: [a.guess, b.guess], correct, stakes: [a.stake, b.stake], handChanges, guessChanges: changes.map((v, i) => v - handChanges[i]), changes }; r.phase = 'finished';
}

function mutate(world, id, body, now) {
  clean(world, now); let me = world.players[id]; if (!me) me = world.players[id] = { wallet: 5000, character: 0, room: null, seen: now }; me.seen = now;
  const action = body.action || 'state';
  if (action === 'state') return;
  if (action === 'character') { if (!integer(body.character) || body.character < 0 || body.character >= NAMES.length) err('请选择有效角色'); if (me.room) err('请先离开房间再更换角色'); me.character = body.character; return; }
  if (action === 'leave') { const r = world.rooms[me.room]; if (r) { for (const p of r.players) if (world.players[p.id]) world.players[p.id].room = null; delete world.rooms[me.room]; } me.room = null; return; }
  if (action === 'create') {
    if (me.room) err('请先离开当前房间');
    if (!['normal', 'guessMove', 'guessOutcome'].includes(body.mode)) err('请选择游戏模式');
    const variant = body.variant === undefined ? 'classic' : body.variant;
    if (!['classic', 'skill'].includes(variant)) err('请选择有效规则');
    if (variant === 'skill' && body.mode !== 'normal') err('只有普通模式支持技能规则');
    if (variant !== 'skill') {
      if (body.mode === 'normal' && me.wallet < 100) err('普通模式需要至少 100 金币，才能支付 10 回合的最低入场费');
      if (body.mode !== 'normal' && me.wallet < 30) err('竞猜模式至少需要 30 金币');
    }
    let code; do { code = Array.from(crypto.getRandomValues(new Uint8Array(6)), x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join(''); } while (world.rooms[code]);
    const hostPlayer = variant === 'skill' ? makeSkillPlayer(id, me.character) : { id, character: me.character, net: 0, high: 0, move: null, guess: null };
    world.rooms[code] = { code, mode: body.mode, variant, round: 1, phase: 'waiting', players: [hostPlayer], last: null, updated: now }; me.room = code; return;
  }
  if (action === 'join') {
    if (me.room) err('请先离开当前房间');
    const code = String(body.code || '').trim().toUpperCase(), r = world.rooms[code];
    if (!r) err('没有找到这个房间，请检查房间码');
    if (r.players.length !== 1 || r.phase !== 'waiting') err('房间已满或对局已开始');
    if (r.players[0].id === id) err('不能加入自己的房间');
    if (r.variant !== 'skill') {
      if (r.mode === 'normal' && me.wallet < 100) err('普通模式需要至少 100 金币');
      if (r.mode !== 'normal' && me.wallet < 30) err('竞猜模式至少需要 30 金币');
    }
    const guestPlayer = r.variant === 'skill' ? makeSkillPlayer(id, me.character) : { id, character: me.character, net: 0, high: 0, move: null, guess: null };
    r.players.push(guestPlayer); me.room = code; r.phase = 'move'; r.updated = now; return;
  }
  const r = world.rooms[me.room]; if (!r || r.players.length !== 2) err('请等待另一位玩家加入'); const p = r.players.find(x => x.id === id); if (!p) err('你不在这个房间中');
  if (action === 'move') {
    if (body.round !== undefined && body.round !== r.round) err('回合已变化，请重新选择');
    if (r.phase !== 'move' || p.move) err('本回合已经出拳');
    if (!MOVE.includes(body.move)) err('请选择手势');
    if (r.variant === 'skill') {
      const rawCard = body.card === undefined || body.card === null || body.card === '' ? null : body.card;
      if (rawCard !== null) {
        if (typeof rawCard !== 'string' || !SKILL_MAP[rawCard]) err('无效技能卡');
        const idx = p.hand.indexOf(rawCard);
        if (idx < 0) err('手牌中没有这张技能卡');
        if (rawCard === '16_phantom_swap' && p.hand.length < 2) err('幻影置换需要手中有另一张牌才能使用');
        const cost = SKILL_MAP[rawCard].cost + (p.sealCost > 0 ? 1 : 0);
        if (p.energy < cost) err('能量不足，无法使用该技能卡');
        p.energy -= cost;
        p.hand.splice(idx, 1);
        p.card = rawCard;
        p.paidCost = cost;
      } else {
        p.card = null;
        p.paidCost = 0;
      }
      p.move = body.move;
      r.updated = now;
      if (r.players.every(x => x.move)) settleSkill(world, r);
      return;
    }
    const stake = Number(body.stake); if (!integer(stake) || stake < 1) err('请输入有效投入金币');
    if (r.mode === 'normal') { const tier = Number(body.tier); if (![10, 20, 30].includes(tier)) err('请选择入场费'); if (tier === 30 && p.high >= 2) err('30 金币场次每把最多选择两次'); const remaining = 10 - r.round; const max = Math.floor((me.wallet - tier - remaining * 10) / (tier / 10)); if (stake > max) err('投入过高，请保留后续回合的最低入场费'); p.tier = tier; if (tier === 30) p.high++; }
    else { if (![10, 20, 50, 100].includes(stake)) err('请选择竞猜投入'); if (me.wallet < stake * 3) err('金币不足，需至少准备投入额的 3 倍'); }
    p.stake = stake; p.move = body.move; r.updated = now;
    if (r.players.every(x => x.move)) { if (r.mode === 'normal') settleNormal(world, r); else r.phase = 'guess'; } return;
  }
  if (action === 'guess') {
    if (r.variant === 'skill') err('技能模式无需竞猜');
    if (body.round !== undefined && body.round !== r.round) err('回合已变化，请重新选择');
    if (r.phase !== 'guess' || p.guess) err('现在不能竞猜'); const choices = r.mode === 'guessMove' ? MOVE : ['win', 'lose']; if (!choices.includes(body.guess)) err('请选择竞猜结果'); p.guess = body.guess; r.updated = now; if (r.players.every(x => x.guess)) settleBet(world, r); return;
  }
  err('无效操作');
}
