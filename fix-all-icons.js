const fs = require('fs');
const path = require('path');

// Список всех файлов где есть lucide-react-native
const files = [
  'app/(tabs)/index.tsx',
  'app/(tabs)/profile.tsx',
  'app/booking-confirmation.tsx',
  'app/chat.tsx',
  'app/complaint.tsx',
  'app/room-details.tsx',
  'app/service-details.tsx',
  'app/services.tsx',
  'app/booking.tsx',
  'components/ChatWidget.tsx',
  'components/CustomAlert.tsx'
];

// Карта замены иконок
const iconReplacements = {
  'ArrowRight': 'arrow-forward',
  'Star': 'star',
  'User': 'person',
  'Phone': 'call',
  'Mail': 'mail',
  'Search': 'search',
  'Filter': 'filter',
  'Plus': 'add',
  'Minus': 'remove',
  'ChevronLeft': 'chevron-back',
  'ChevronRight': 'chevron-forward',
  'HelpCircle': 'help-circle-outline',
  'LogOut': 'log-out',
  'AlertTriangle': 'alert-circle',
  'CheckCircle': 'checkmark-circle',
  'BrainCircuit': 'bulb',
  'X': 'close',
  'Send': 'send',
  'MessageCircle': 'chatbubble-outline',
  'Calendar': 'calendar',
  'CalendarIcon': 'calendar',
  'SearchIcon': 'search'
};

function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Заменяем импорт lucide-react-native на @expo/vector-icons
    content = content.replace(
      /import\s*\{[^}]+\}\s*from\s*['"]lucide-react-native['"];?/g,
      "import { Ionicons } from '@expo/vector-icons';"
    );
    
    // Заменяем каждую иконку
    Object.keys(iconReplacements).forEach(oldIcon => {
      // Паттерн для самозакрывающихся тегов <Icon />
      const selfClosingRegex = new RegExp(`<${oldIcon}\\s*([^>]*?)\\s*/>`, 'g');
      content = content.replace(selfClosingRegex, (match, props) => {
        // Извлекаем size и color из props если есть
        const sizeMatch = props.match(/size={(\d+)}/);
        const colorMatch = props.match(/color=["']([^"']+)["']/);
        
        let newProps = props;
        // Убираем старые size и color
        newProps = newProps.replace(/size={(\d+)}/, '');
        newProps = newProps.replace(/color=["']([^"']+)["']/, '');
        
        // Добавляем name, size и color в правильном формате
        const size = sizeMatch ? sizeMatch[1] : '24';
        const color = colorMatch ? `"${colorMatch[1]}"` : '"#000"';
        
        return `<Ionicons name="${iconReplacements[oldIcon]}" size={${size}} color=${color} ${newProps.trim()} />`;
      });
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Исправляем все файлы
console.log('Starting to fix all lucide-react-native imports...\n');
files.forEach(file => {
  fixFile(file);
});

console.log('\n✅ Done! All files have been fixed.');
console.log('Please reload the app (press R in terminal)');