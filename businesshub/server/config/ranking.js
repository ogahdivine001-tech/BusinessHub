// Ranking knobs, configurable instead of buried in code.
//
//   RANKING_MIN_REVIEWS   reviews a business needs before it can appear in
//                         "Top rated" (default 3). Stops one lucky 5-star
//                         review from topping the list.
//   RANKING_PRIOR_WEIGHT  how many "average" reviews every business is
//                         assumed to start with (default 5). Higher = new
//                         businesses climb more slowly. This is the standard
//                         Bayesian average used by large review sites.
function getRankingConfig(env = process.env) {
  const n = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 1 ? Math.floor(Number(v)) : d);
  return {
    minReviews: n(env.RANKING_MIN_REVIEWS, 3),
    priorWeight: n(env.RANKING_PRIOR_WEIGHT, 5),
  };
}
module.exports = { getRankingConfig };
