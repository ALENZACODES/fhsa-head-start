// Independent re-implementation (year/month loop written separately) + property tests vs site/model.js
const M = require('../model.js');
let fails = 0; const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

function indep({ monthly, taxRate, annualReturn, reinvest, target }) {
  const i = (1 + annualReturn) ** (1 / 12) - 1;
  let F = 0, T = 0, only = 0, life = 0, refundDue = 0, earned = 0, gm = -1, om = -1, invested = 0;
  for (let y = 1; y <= 50; y++) {
    let used = 0;
    for (let mo = 1; mo <= 12; mo++) {
      const m = (y - 1) * 12 + mo;
      F += F * i; T += T * i; only += only * i;
      const roomNow = () => Math.max(0, Math.min(8000 - used, 40000 - life));
      if (mo === 4 && refundDue && reinvest) { const x = Math.min(refundDue, roomNow()); F += x; used += x; life += x; T += refundDue - x; invested += refundDue; }
      if (mo === 4) refundDue = 0;
      const x = Math.min(monthly, roomNow()); F += x; used += x; life += x; T += monthly - x; only += monthly;
      if (mo === 12) { refundDue = used * taxRate; earned += refundDue; }
      if (gm < 0 && F + T >= target - 1e-6) gm = m;
      if (om < 0 && only >= target - 1e-6) om = m;
      if (m === 60) var five = { bal: F + T, only, earned, invested };
    }
    if (gm > 0 && om > 0 && y >= 5) break;
  }
  return { gm, om, five };
}

// (a) sanity case
const A = { monthly: 667, taxRate: 0.30, annualReturn: 0, reinvest: false, target: 40000 };
const a = M.simulate(A);
ok(a.goalMonth === 60, 'a months ' + a.goalMonth);
ok(near(a.at60.refundsEarned, 12000), 'a refunds ' + a.at60.refundsEarned);
ok(near(a.goal.growth, 0) && near(a.at60.growth, 0), 'a growth');
ok(near(a.at60.balance, 40020) && near(a.at60.tfsaOnly, 40020), 'a balances');
ok(a.yearLog.every(y => y.fhsaDeposits <= 8000 + 1e-9), 'a annual cap');
console.log('(a) months', a.goalMonth, 'TFSA months', a.tfsaGoalMonth, 'refunds earned', a.at60.refundsEarned, 'growth', a.goal.growth, '5yr', a.at60.balance, 'FHSA lifetime', a.at60.fhsaLifetime);

// (b) default case
const D = { monthly: 500, taxRate: 0.4341, annualReturn: 0.05, reinvest: true, target: 40000 };
const d = M.simulate(D), g = d.goal;
const parts = [g.ownFhsa, g.ownTfsa, g.refundsReinvested, g.growth];
ok(near(parts.reduce((x, y) => x + y), g.balance, 1e-6), 'default parts sum');
const rp = M.roundParts(parts, g.balance), pp = M.percentParts(rp);
ok(rp.reduce((x, y) => x + y) === Math.round(g.balance), 'rounded sum');
ok(pp.reduce((x, y) => x + y) === 100, 'pct sum');
ok(near(g.ownFhsa + g.ownTfsa, 500 * g.month), 'own = 500*months');
console.log('(b) default: goal month', g.month, 'TFSA month', d.tfsaGoalMonth, 'faster by', d.tfsaGoalMonth - g.month);
console.log('    balance at goal', g.balance.toFixed(2), 'parts', rp, 'pcts', pp, 'refunds earned by goal', g.refundsEarned.toFixed(2));
console.log('    5yr: FHSA strat', d.at60.balance.toFixed(2), 'TFSA', d.at60.tfsaOnly.toFixed(2), 'lead', (d.at60.balance - d.at60.tfsaOnly).toFixed(2), 'refunds earned yrs1-5', d.at60.refundsEarned.toFixed(2), 'reinvested by m60', d.at60.refundsReinvested.toFixed(2), 'FHSA lifetime m60', d.at60.fhsaLifetime.toFixed(2));
console.log('    yearLog', JSON.stringify(d.yearLog));

// toggle OFF: refunds earned but not in balance, balance == TFSA only
const off = M.simulate({ ...D, reinvest: false });
ok(near(off.at60.balance, off.at60.tfsaOnly, 1e-6), 'off balance = tfsa');
ok(off.at60.refundsEarned > 0 && off.at60.refundsReinvested === 0, 'off refunds earned, not reinvested');
ok(off.goalMonth === off.tfsaGoalMonth, 'off same timeline');
console.log('    toggle OFF: months', off.goalMonth, '5yr', off.at60.balance.toFixed(2), 'refunds earned yrs1-5', off.at60.refundsEarned.toFixed(2), 'cash received by m60', off.at60.refundsCash.toFixed(2));

// (c) monotonic + cross-check vs independent + caps, on a grid
let n = 0;
for (const reinvest of [true, false]) for (const target of [20000, 40000, 65000, 100000]) for (const ret of [0, 0.03, 0.05, 0.08]) for (const tax of [0.2, 0.3, 0.4341, 0.5353]) {
  let prev = Infinity;
  for (let monthly = 50; monthly <= 1000; monthly += 50) {
    const p = { monthly, taxRate: tax, annualReturn: ret, reinvest, target };
    const s = M.simulate(p), q = indep(p); n++;
    ok(s.goalMonth === q.gm && s.tfsaGoalMonth === q.om, 'indep months ' + JSON.stringify(p) + ` ${s.goalMonth}/${q.gm}`);
    ok(near(s.at60.balance, q.five.bal, 1e-6) && near(s.at60.refundsEarned, q.five.earned, 1e-6), 'indep 5yr ' + JSON.stringify(p));
    ok(s.yearLog.every(y => y.fhsaDeposits <= 8000 + 1e-9), 'annual cap ' + JSON.stringify(p));
    ok(s.at60.fhsaLifetime <= 40000 + 1e-9 && s.months.length && (s.goal ? s.goal.fhsaLifetime <= 40000 + 1e-9 : true), 'life cap');
    ok(s.at60.refundsEarned <= 40000 * tax + 1e-6, 'max refunds');
    if (s.goal) { const G = s.goal; ok(near(G.ownFhsa + G.ownTfsa + G.refundsReinvested + G.growth, G.balance, 1e-6), 'sum ' + JSON.stringify(p)); }
    if (ret === 0) ok(near(s.at60.growth, 0) && (!s.goal || near(s.goal.growth, 0)), 'zero growth');
    if (s.goalMonth > 0) { ok(s.goalMonth <= prev, 'monotone months ' + JSON.stringify(p)); prev = s.goalMonth; }
    if (target > 40000 && ret === 0 && s.goal) ok(s.goal.ownTfsa + s.goal.refTfsa > 0 && s.goal.fhsaLifetime <= 40000 + 1e-9, 'topup >40k ' + JSON.stringify(p));
  }
}
// higher tax -> bigger 5-yr lead (reinvest on)
for (const monthly of [200, 500, 667, 900]) for (const ret of [0, 0.05]) {
  let prevLead = -1;
  for (const tax of [0.2, 0.3, 0.4341, 0.5353]) {
    const s = M.simulate({ monthly, taxRate: tax, annualReturn: ret, reinvest: true, target: 40000 });
    const lead = s.at60.balance - s.at60.tfsaOnly; ok(lead > prevLead, 'tax lead ' + monthly + ' ' + tax); prevLead = lead;
  }
}
const leads = [0.2, 0.3, 0.4341, 0.5353].map(t => { const s = M.simulate({ ...D, taxRate: t }); return Math.round(s.at60.balance - s.at60.tfsaOnly); });
console.log('(c) 5-yr lead at $500/5% by tax 20/30/43.41/53.53%:', leads.join(', '));
const mons = [300, 400, 500, 600, 667].map(c => M.simulate({ ...D, monthly: c }).goalMonth);
console.log('    months to $40k by $300/400/500/600/667:', mons.join(', '));
const z = M.simulate({ ...D, annualReturn: 0 }); console.log('    0% return default: growth at goal', z.goal.growth, 'months', z.goalMonth);
const big = M.simulate({ ...D, target: 80000 }), bg = big.goal;
console.log('    target $80k default: months', bg.month, 'TFSA', big.tfsaGoalMonth, 'FHSA lifetime', bg.fhsaLifetime.toFixed(2), 'parts', M.roundParts([bg.ownFhsa, bg.ownTfsa, bg.refundsReinvested, bg.growth], bg.balance), 'balance', Math.round(bg.balance), 'refunds to TFSA', bg.refTfsa.toFixed(2));
const b2 = M.simulate({ monthly: 667, taxRate: 0.3, annualReturn: 0, reinvest: false, target: 80000 });
console.log('    target $80k, $667, 30%, 0%, OFF: months', b2.goalMonth, 'FHSA own', b2.goal.ownFhsa, 'TFSA top-up', b2.goal.ownTfsa);
console.log(n, 'grid cases;', fails ? fails + ' FAILURES' : 'ALL PASS');
process.exit(fails ? 1 : 0);
