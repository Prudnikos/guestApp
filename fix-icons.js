const fs = require('fs');
const path = require('path');

const iconMap = {
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
  'HelpCircle': 'help-circle',
  'LogOut': 'log-out',
  'AlertTriangle': 'alert-circle',
  'CheckCircle': 'checkmark-circle',
  'BrainCircuit': 'bulb',
  'X': 'close',
  'Send': 'send'
};

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Заменяем импорты
  Object.keys(iconMap).forEach(oldIcon => {
    const regex = new RegExp(`<${oldIcon}([^>]*)/>`, 'g');
    content = content.replace(regex, `<Ionicons name="${iconMap[oldIcon]}"$1/>`);
  });
  
  // Заменяем импорт
  content = content.replace(
    /import \{[^}]+\} from ['"]lucide-react-native['"];?/g,
    "import { Ionicons } from '@expo/vector-icons';"
  );
  
  fs.writeFileSync(filePath, content);
}

// Обрабатываем все файлы
const files = [
  'app/(tabs)/index.tsx',
  'app/(tabs)/search.tsx', 
  'app/(tabs)/profile.tsx',
  'app/booking-confirmation.tsx',
  'components/ChatWidget.tsx',
  'app/room-details.tsx',
  'app/service-details.tsx',
  'app/chat.tsx',
  'app/complaint.tsx',
  'components/CustomAlert.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    replaceInFile(filePath);
    console.log(`Fixed: ${file}`);
  }
});

console.log('Done!');