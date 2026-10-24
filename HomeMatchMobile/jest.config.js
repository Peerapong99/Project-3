module.exports = {
  preset: '@react-native/jest-preset',
  transform: {'^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'},
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@react-native-vector-icons)/)'],
  setupFilesAfterEnv: ['./jest.setup.js'],
};
