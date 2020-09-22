module.exports = {
  roots: [ '<rootDir>/test/'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  reporters: ['default',  'jest-sonar'],
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.[tj]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
}
