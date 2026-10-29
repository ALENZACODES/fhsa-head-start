# FHSA Head Start

**Live:** https://alenzacodes.github.io/fhsa-head-start/

An interactive simulator that shows how much faster a First Home Savings Account (FHSA) can get a first-time buyer in Ontario to a down payment than saving the same amount in a TFSA, and where the money comes from: your own contributions, reinvested tax refunds, and investment growth.

Move five levers: down payment target, monthly saving, marginal tax rate (up to 53.53%, Ontario's top combined rate), expected annual return, and whether you reinvest your tax refunds. The page shows the time to your target, the 5-year balance against a TFSA, a month-by-month chart, and a breakdown at your goal whose parts add up exactly to the balance.

## The rules it uses

From the CRA's [Contributing to your FHSA](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account/contributing-your-fhsa.html) page:

- FHSA participation room is **$8,000 per calendar year**, with a **$40,000 lifetime limit**.
- FHSA contributions are **deductible**, so the model estimates a refund of *that year's FHSA contributions × your marginal tax rate*.
- Qualifying withdrawals to buy a first home are tax-free.

TFSA contributions get no deduction, so the TFSA-only path earns no refund.

## Model assumptions (kept simple on purpose)

- You save the same amount at the end of every month, starting in January. Returns compound monthly.
- Each year's refund arrives the following April. Refunds are earned either way. The toggle only decides whether they are reinvested. When reinvested, they go into the FHSA within its room, and that deposit is itself a deductible contribution. Anything over the $8,000/year or $40,000 lifetime room, including reinvested refunds, goes to a TFSA top-up. The model assumes you have TFSA room for it.
- Not modelled: carry-forward of unused FHSA room, the FHSA's maximum participation period, TFSA room limits, changes in your tax rate, fees or market swings.

The model is in [`model.js`](model.js) and runs month by month. [`tests/model.test.js`](tests/model.test.js) checks it against an independent reimplementation, the annual and lifetime caps, and a hand-checkable case: $667/month at 30% and 0% return reaches $40,000 in 60 months and earns $12,000 in refunds. Run it with `node tests/model.test.js`.

## How it was built

The first version was built with Google Gemini Canvas. I then rewrote the calculation and the layout by hand. Gemini's breakdown didn't add up to the balance, its refund labels contradicted each other, and the page showed $0 until you moved a slider. Charts use [Chart.js](https://www.chartjs.org/).

## Not advice

This is for illustration only and is not financial or tax advice. Your actual refund depends on your full tax situation. Check your FHSA room with the CRA, for example in My Account or on your notice of assessment, before contributing.

© 2026 John K. All rights reserved.
