const fs = require('fs');
const path = require('path');

const filesToFix = [
  './app/(tabs)/booking.tsx',
  './app/(tabs)/profile.tsx', 
  './app/booking-confirmation.tsx',
  './app/chat.tsx',
  './app/complaint.tsx',
  './app/login.tsx',
  './app/room-details.tsx',
  './app/service-details.tsx',
  './app/services.tsx'
];

filesToFix.forEach(filePath => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace different patterns of useAuth usage
    content = content.replace(
      /const\s+{\s*user\s*}\s*=\s*useAuth\(\);/g,
      'const auth = useAuth();\n  const user = auth?.user;'
    );
    
    content = content.replace(
      /const\s+{\s*user,\s*signOut\s*}\s*=\s*useAuth\(\);/g,
      'const auth = useAuth();\n  const user = auth?.user;\n  const signOut = auth?.signOut;'
    );
    
    content = content.replace(
      /const\s+{\s*signIn,\s*loading\s*}\s*=\s*useAuth\(\);/g,
      'const auth = useAuth();\n  const signIn = auth?.signIn;\n  const loading = auth?.loading;'
    );
    
    content = content.replace(
      /const\s+{\s*signUp\s*}\s*=\s*useAuth\(\);/g,
      'const auth = useAuth();\n  const signUp = auth?.signUp;'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
  }
});

console.log('Done!');