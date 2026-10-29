/* FHSA Head Start - month-by-month model. (c) 2026 John K. All rights reserved.
 * Simple, transparent assumptions:
 *  - Contributions are made at the end of each month; returns compound monthly.
 *  - Year 1 starts in January. FHSA room: $8,000 per calendar year, $40,000 lifetime.
 *  - FHSA contributions are deductible: refund = that year's FHSA contributions x marginal rate.
 *  - Each year's refund arrives the following April. If "reinvest" is on, it is deposited
 *    then (FHSA first, within room; any overflow goes to the TFSA). Reinvested refunds that
 *    go into the FHSA are contributions too, so they also use room and earn a refund.
 *  - Money that does not fit in FHSA room goes to a TFSA top-up (TFSA room assumed available).
 *  - The "TFSA only" path saves the same monthly amount in a TFSA, with no refund.
 */
(function (root) {
  var FHSA_ANNUAL = 8000, FHSA_LIFETIME = 40000, EPS = 1e-6;

  function simulate(p) {
    var monthly = +p.monthly, rate = +p.taxRate, ret = +p.annualReturn;
    var reinvest = !!p.reinvest, target = +p.target, maxMonths = p.maxMonths || 600;
    var r = Math.pow(1 + ret, 1 / 12) - 1;

    var fhsa = 0, tfsaTop = 0, tfsaOnly = 0;
    var lifetime = 0, yearDeposits = 0, pendingRefund = 0;
    var ownFhsa = 0, ownTfsa = 0, refFhsa = 0, refTfsa = 0, growth = 0, tfsaOnlyGrowth = 0;
    var refundsEarned = 0, refundsCash = 0, maxYearDeposits = 0;
    var yearLog = [], months = [];
    var goal = null, tfsaGoalMonth = -1, at60 = null;

    function chartEnd(a, b) { return Math.min(Math.ceil((Math.max(60, a, b) + 6) / 12) * 12, 240); }

  function room() { return Math.max(0, Math.min(FHSA_ANNUAL - yearDeposits, FHSA_LIFETIME - lifetime)); }

    for (var m = 1; m <= maxMonths; m++) {
      var mon = (m - 1) % 12 + 1;
      if (mon === 1) yearDeposits = 0;

      // 1. growth on existing balances
      var g = (fhsa + tfsaTop) * r;
      fhsa *= 1 + r; tfsaTop *= 1 + r; growth += g;
      var g2 = tfsaOnly * r; tfsaOnly += g2; tfsaOnlyGrowth += g2;

      // 2. last year's refund lands in April
      if (mon === 4 && pendingRefund > 0) {
        if (reinvest) {
          var rf = Math.min(pendingRefund, room());
          fhsa += rf; lifetime += rf; yearDeposits += rf; refFhsa += rf;
          tfsaTop += pendingRefund - rf; refTfsa += pendingRefund - rf;
        } else {
          refundsCash += pendingRefund;
        }
        pendingRefund = 0;
      }

      // 3. this month's contribution
      var toF = Math.min(monthly, room());
      fhsa += toF; lifetime += toF; yearDeposits += toF; ownFhsa += toF;
      tfsaTop += monthly - toF; ownTfsa += monthly - toF;
      tfsaOnly += monthly;
      if (yearDeposits > maxYearDeposits) maxYearDeposits = yearDeposits;

      // 4. year end: refund earned on this year's FHSA contributions
      if (mon === 12) {
        var refund = yearDeposits * rate;
        refundsEarned += refund; pendingRefund = refund;
        yearLog.push({ year: m / 12, fhsaDeposits: yearDeposits, refund: refund });
      }

      var bal = fhsa + tfsaTop;
      var snap = {
        month: m, balance: bal, fhsa: fhsa, tfsaTop: tfsaTop, tfsaOnly: tfsaOnly,
        ownFhsa: ownFhsa, ownTfsa: ownTfsa, refFhsa: refFhsa, refTfsa: refTfsa,
        refundsReinvested: refFhsa + refTfsa, growth: growth, tfsaOnlyGrowth: tfsaOnlyGrowth,
        refundsEarned: refundsEarned, refundsCash: refundsCash, fhsaLifetime: lifetime,
        maxYearDeposits: maxYearDeposits
      };
      months.push({ month: m, balance: bal, tfsaOnly: tfsaOnly });
      if (m === 60) at60 = snap;
      if (!goal && target > 0 && bal >= target - EPS) goal = snap;
      if (tfsaGoalMonth < 0 && target > 0 && tfsaOnly >= target - EPS) tfsaGoalMonth = m;
      if (goal && tfsaGoalMonth > 0 && m >= chartEnd(goal.month, tfsaGoalMonth)) break;
    }
    return {
      goal: goal, goalMonth: goal ? goal.month : -1, tfsaGoalMonth: tfsaGoalMonth,
      at60: at60, months: months, yearLog: yearLog,
      maxRefundPossible: FHSA_LIFETIME * rate
    };
  }

  // Round parts so they add up exactly to Math.round(total) (largest remainder).
  function roundParts(parts, total) {
    var t = Math.round(total);
    var fl = parts.map(function (v) { return Math.floor(v + EPS); });
    var diff = t - fl.reduce(function (a, b) { return a + b; }, 0);
    var order = parts.map(function (v, i) { return { i: i, rem: v - fl[i] }; })
      .sort(function (a, b) { return b.rem - a.rem; });
    for (var k = 0; k < order.length && diff > 0; k++, diff--) fl[order[k].i]++;
    for (var j = order.length - 1; j >= 0 && diff < 0; j--) {
      if (fl[order[j].i] > 0) { fl[order[j].i]--; diff++; }
    }
    return fl;
  }

  function percentParts(amounts) {
    var sum = amounts.reduce(function (a, b) { return a + b; }, 0);
    if (sum <= 0) return amounts.map(function () { return 0; });
    return roundParts(amounts.map(function (a) { return a / sum * 100; }), 100);
  }

  var api = { simulate: simulate, chartEnd: function (a, b) { return Math.min(Math.ceil((Math.max(60, a, b) + 6) / 12) * 12, 240); }, roundParts: roundParts, percentParts: percentParts,
    FHSA_ANNUAL: FHSA_ANNUAL, FHSA_LIFETIME: FHSA_LIFETIME };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FHSAModel = api;
})(this);
