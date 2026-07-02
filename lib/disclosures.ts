// Altier Edge — Regulatory disclosures.
// Every string here appears verbatim somewhere in the prototype UI.
// All copy is paper-only, non-advisory, plain-language. No legalese.

export const PRISM_DISCLOSURE_INLINE = {
  long: 'PRISM signals are paper-portfolio signals, not investment advice. They are produced by an algorithm that looks at public data. Past patterns do not predict future results.',
  short: 'Paper portfolio signals. Not investment advice.',
};

export const PRISM_DISCLOSURE_MODAL_TITLE = 'A quick note before you see PRISM signals';

export const PRISM_DISCLOSURE_MODAL_BODY = {
  long: 'PRISM signals are an educational tool. They are made by a computer looking at public data, then turned into plain language. They are not investment advice. Use them to learn what the numbers say, not to decide what to do with real money.',
  short: 'These are paper-portfolio signals. They are not investment advice.',
};

export const FOOTER_DISCLOSURE = {
  long: 'Altier Edge is an educational tool. Nothing here is investment advice. All trades are paper trades. We do not connect to any real brokerage. See the in-app Privacy notice for how data is handled.',
  short: 'Educational tool. Not investment advice. All trades are paper trades.',
};

export const TRIAL_DISCLOSURE = {
  long: 'Your 7-day free trial gives you full access to every Altier Edge feature. After the trial, you can subscribe to keep your paper portfolio. We will never charge you automatically during the trial. Cancel anytime.',
  short: '7-day free trial. No automatic charges. Cancel anytime.',
};

export const SIGNUP_DISCLOSURE = {
  long: 'By creating an account you confirm you are 18 or older and live in Canada. Altier Edge is an educational tool. Nothing here is investment advice. We will not connect to any real brokerage on your behalf.',
  short: 'For learning only. No real money. No real trades.',
};

export const AGE_GATE_TITLE = 'Are you 18 or older?';

export const AGE_GATE_BODY = {
  long: 'Altier Edge is built for adults. We ask for your age so we can keep the experience appropriate and meet our legal duties. We do not collect any government ID.',
  short: 'Altier Edge is for adults 18 and over.',
};

export const PIPEDA_NOTICE = {
  long: 'We collect the minimum needed to run Altier Edge: your email, your investing style preference, your paper portfolio, and your watchlist. We never collect real brokerage credentials, real trade history, or government ID. Data lives in a local database for this prototype. You can delete your account and all your data at any time from Account settings.',
  short: 'We collect the minimum needed to learn. You can delete everything anytime.',
};

export const NO_ADVICE_DISCLAIMER = {
  long: 'Altier Edge is a learning tool, not a financial advisor. Articles and explainers in the Learning Hub are educational. They are not a recommendation to buy or sell any security. Talk to a registered advisor before making real investment decisions.',
  short: 'Educational only. Not financial advice.',
};

// Paper-only safety copy for paper-trading touch points.
// Used in trade modals, confirmations, and P&L displays.
export const PAPER_ONLY_SAFETY = {
  preTradeTitle: 'One last thing',
  preTradeBody: 'This is a paper trade. No real money moves. Your simulated portfolio will update as soon as you confirm.',
  postTradeToast: 'Paper trade saved. Your portfolio just updated.',
  pnlLabel: 'Paper P&L — simulated gains, not real money',
  emptyPortfolio: 'You haven\'t made any paper trades yet. Start with one stock you understand.',
  noSignals: 'No PRISM signals yet for your watchlist. Add a stock to see them.',
  loadError: 'Could not load the PRISM score right now. Refresh in a moment.',
  tradeError: 'Your paper trade didn\'t save. We will retry once — if it still fails, restart the app.',
};

// Trial paywall copy
export const PAYWALL_COPY = {
  title: 'Your trial has ended',
  body: 'You can keep your paper portfolio and all the Plain Score history by subscribing. We will never share your data.',
  keep: 'What you keep: paper portfolio, watchlist, and Learning Hub access.',
  priceLabel: '$4.99 CAD per month',
  subscribe: 'Subscribe (coming soon)',
  remindLater: 'Remind me tomorrow',
  alreadySubscribed: 'Already subscribed?',
  // Day 5–7 reminder sequence
  day5: 'Two days left in your free trial.',
  day6: 'Your free trial ends tomorrow.',
  day7: 'Your free trial ends today.',
};

// Altier Edge canonical disclosure strings — locked copy.
// All strings here are pulled verbatim into the marketing site + inside pages.
export const ALTIER_DISCLOSURES = {
  prismInline: '[ PRISM is a paper-trading signal. Not investment advice. ]',
  prismScore: '[ PRISM scores what the data shows. PRISM does not predict. ]',
  arenaMechanic: '[ Credits are earned inside the app. Not purchased. Cash out not available. ]',
  arenaRank: '[ Paper-trading only · credits, not cash · PRISM is a signal, not advice ]',
  merch: '[ Merch rewards are not transferable for cash. ]',
  leaderboardSettlement: '[ Refresh is a re-rank, not a tick · settlement at 4:30 p.m. ET ]',
  trialWindow: '[ Trial ends on day 7 unless you stay. We do not auto-charge before day 8. ]',
};