module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['config', 'arch', 'routing', 'sms', 'otp', 'pricing', 'ranking', 'geo',
       'search', 'comparison', 'contributions', 'account', 'ui', 'db', 'ci', 'docs', 'deps'],
    ],
    'subject-case': [0],
  },
};
