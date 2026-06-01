// Generates assets/icon.ico for the desktop installer from the MOBILE app's icon
// (the Flutter macOS appiconset PNGs), so desktop + mobile share one brand icon.
import pngToIco from 'png-to-ico';
import { writeFileSync, mkdirSync } from 'fs';

const base = 'C:/inventory-platform/inventory-management-app/flutter_app/macos/Runner/Assets.xcassets/AppIcon.appiconset';
const files = ['app_icon_256.png', 'app_icon_128.png', 'app_icon_64.png', 'app_icon_32.png'].map(f => `${base}/${f}`);

const buf = await pngToIco(files);
mkdirSync('assets', { recursive: true });
writeFileSync('assets/icon.ico', buf);
console.log('wrote assets/icon.ico', buf.length, 'bytes');
