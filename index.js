module.exports = process.env.ANALYSIS_COV
  ? require('./lib-cov')
  : require('./lib');
