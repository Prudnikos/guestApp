const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Добавляем полифиллы для совместимости с Hermes
config.resolver.platforms = ['native', 'ios', 'android'];

module.exports = config;