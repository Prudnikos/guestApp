module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'], // Явно указываем корень проекта
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'], // Явно указываем, какие файлы искать
          alias: {
            '@': '.',
          },
        },
      ],
      'react-native-reanimated/plugin', // <-- ДОБАВЬТЕ ЭТУ СТРОКУ
    ],
  };
};