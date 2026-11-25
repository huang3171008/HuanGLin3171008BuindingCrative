import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../game/package.json', import.meta.url));
const { WebSocket } = require('ws');
const address = process.env.SMOKE_WSS_URL || 'wss://64.83.48.200:8443/ws';
const clients = [];

function waitFor(test, label) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const value = test();
      if (value) { clearInterval(timer); resolve(value); }
      else if (Date.now() - start > 15000) { clearInterval(timer); reject(Error(label)); }
    }, 25);
  });
}

async function client(origin, rulesVersion = 2) {
  const c = { events: [], state: null };
  c.ws = new WebSocket(address, { origin });
  clients.push(c);
  c.ws.on('message', b => {
    const m = JSON.parse(b);
    c.events.push(m);
    if (m.type === 'state') c.state = m.state;
  });
  await new Promise((resolve, reject) => { c.ws.once('open', resolve); c.ws.once('error', reject); });
  const auth = { type: 'auth', credential: randomBytes(32).toString('hex'), protocol: 2 };
  if (rulesVersion !== null) auth.rulesVersion = rulesVersion;
  c.ws.send(JSON.stringify(auth));
  await waitFor(() => c.events.find(x => x.type === 'authenticated') && c.state, '认证失败');
  return c;
}

async function sendAction(c, name, data = {}, id = randomUUID()) {
  c.ws.send(JSON.stringify({ type: 'action', id, action: name, data }));
  const reply = await waitFor(() => c.events.find(x => x.id === id && ['ack', 'error'].includes(x.type)), `请求超时: ${name}`);
  c.events.splice(c.events.indexOf(reply), 1);
  return reply;
}

async function ok(c, name, data = {}, id) {
  const reply = await sendAction(c, name, data, id);
  assert.equal(reply.type, 'ack', reply.message);
  return reply;
}

try {
  // 1. 验证旧版客户端仍可正常认证，但被拦截进入技能房
  const legacy = await client('https://appassets.androidplatform.net', null);
  const a = await client('https://appassets.androidplatform.net', 2);
  const b = await client('guessgame://game', 2);

  await ok(a, 'create', { mode: 'normal', variant: 'skill' });
  await waitFor(() => a.state.room?.code && a.state.room?.variant === 'skill', '公网技能房创建失败');
  const sCode = a.state.room.code;
  assert.match(sCode, /^\d{6}$/);

  const legacyJoin = await sendAction(legacy, 'join', { code: sCode });
  assert.equal(legacyJoin.type, 'error');
  assert.match(legacyJoin.message, /更新应用/);

  // 2. 验证新版双端通过 6 位房间码完成技能对战首回合结算、保密与零金币变动
  await ok(b, 'join', { code: sCode });
  await waitFor(() => a.state.room?.phase === 'ready' && b.state.room?.phase === 'ready', '技能房准备状态未同步');
  const sm = a.state.room.matchId;
  await ok(a, 'ready', { ready: true, matchId: sm });
  await ok(b, 'ready', { ready: true, matchId: sm });
  await ok(a, 'start', { matchId: sm });
  await waitFor(() => a.state.room?.phase === 'move' && a.state.room.players[0].hand.length === 3, '公网技能房未发牌');

  const playable = a.state.room.players[0].hand.find(id => !['16_phantom_swap', '03_meteor_break', '15_tip_scales'].includes(id)) || null;
  await ok(a, 'move', { round: 1, matchId: sm, move: 'rock', card: playable });
  await waitFor(() => b.state.room?.players[0]?.ready === true, '公网等待状态未同步');
  assert.equal(b.state.room.players[0].card, undefined, '对手未揭晓技能不得泄露');
  await ok(b, 'move', { round: 1, matchId: sm, move: 'scissors', card: null });
  await waitFor(() => a.state.room?.round === 2 && b.state.room?.round === 2, '公网技能房下一回合未同步');
  assert.equal(a.state.wallet, 5000);
  assert.equal(b.state.wallet, 5000);
  assert.ok(b.state.room.players[1].hp < 120);
  await ok(b, 'leave');
  await waitFor(() => a.state.room === null && b.state.room === null, '离开技能房未同步');

  // 3. 验证经典 6 位房间码模式（含旧客户端兼容）正常运作
  await ok(legacy, 'create', { mode: 'normal' });
  await waitFor(() => legacy.state.room?.code, '旧客户端创建经典房失败');
  await ok(b, 'join', { code: legacy.state.room.code });
  await waitFor(() => legacy.state.room?.phase === 'ready', '经典房准备未同步');
  const cm = legacy.state.room.matchId;
  await ok(legacy, 'ready', { ready: true, matchId: cm });
  await ok(b, 'ready', { ready: true, matchId: cm });
  await ok(legacy, 'start', { matchId: cm });
  await waitFor(() => legacy.state.room?.phase === 'move', '经典房开始未同步');
  await ok(legacy, 'move', { round: 1, matchId: cm, move: 'rock', tier: 10, stake: 10 });
  await ok(b, 'move', { round: 1, matchId: cm, move: 'scissors', tier: 10, stake: 10 });
  await waitFor(() => legacy.state.room?.round === 2, '经典房结算未同步');
  assert.equal(legacy.state.wallet, 5000);
  assert.equal(b.state.wallet, 4980);
  await ok(b, 'leave');

  console.log('公网 WSS 冒烟通过：6 位房间码技能对战 + 经典金币模式 + 旧版客户端兼容拦截全部正常。');
} finally {
  for (const c of clients) c.ws.terminate();
}
