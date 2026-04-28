module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 插件必須放在最後一行
      'react-native-reanimated/plugin',
    ],
  };
};