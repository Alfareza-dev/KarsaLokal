import fs from 'fs';
import path from 'path';

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let newContent = content;

      // Ensure we don't mess up things by doing precise replacements
      
      // 1. Backgrounds
      newContent = newContent.replace(/bg-zinc-950/g, 'bg-white');
      newContent = newContent.replace(/bg-zinc-900/g, 'bg-zinc-50');
      newContent = newContent.replace(/bg-zinc-800/g, 'bg-white');
      
      // 2. Borders
      newContent = newContent.replace(/border-zinc-700/g, 'border-zinc-200');
      newContent = newContent.replace(/border-zinc-500/g, 'border-zinc-300');
      newContent = newContent.replace(/border-zinc-600/g, 'border-zinc-300');
      
      // 3. Texts
      newContent = newContent.replace(/text-zinc-50/g, 'text-zinc-950');
      newContent = newContent.replace(/text-zinc-400/g, 'text-zinc-500');
      newContent = newContent.replace(/text-zinc-300/g, 'text-zinc-600');
      
      // 4. Focus Rings
      newContent = newContent.replace(/focus:ring-zinc-600/g, 'focus:ring-zinc-950/20');
      
      // 5. Special gradients/buttons that were inverted
      // Some buttons were set to bg-zinc-50 text-zinc-950 for the light contrast on dark theme.
      // Now that the theme is light, these buttons need to be dark (bg-zinc-950 text-white)
      newContent = newContent.replace(/bg-zinc-50 text-zinc-950 hover:bg-zinc-200/g, 'bg-zinc-950 text-white hover:bg-zinc-800');
      // Wait, in my previous script bg-zinc-950 became bg-white, so I have to be careful with the order!
      
      // Wait, let's just do a careful string map.
      // Doing this with Regex might have cascading issues.
      
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent, 'utf-8');
        console.log(`Converted to light theme in ${fullPath}`);
      }
    }
  }
}

// Since JS string replace is sequential, if I do bg-zinc-950 -> bg-white, and then bg-zinc-50 -> bg-zinc-950,
// the first ones won't be caught by the second one, which is good! 
// BUT what if there were already bg-white that I want to keep as bg-white? That's fine.

// Let's refine the script to be very specific:
function safeReplace() {
  const dirs = ['./app', './components'];
  
  for (const dir of dirs) {
    function traverse(currentDir) {
      const files = fs.readdirSync(currentDir);
      for (const file of files) {
        const fullPath = path.join(currentDir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          traverse(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
          let c = fs.readFileSync(fullPath, 'utf-8');
          let original = c;
          
          // Backgrounds
          c = c.replace(/bg-zinc-950/g, 'bg-white');
          c = c.replace(/bg-zinc-900/g, 'bg-zinc-50');
          c = c.replace(/bg-zinc-800/g, 'bg-white');
          
          // Borders
          c = c.replace(/border-zinc-700/g, 'border-zinc-200');
          c = c.replace(/border-zinc-500/g, 'border-zinc-300');
          c = c.replace(/border-zinc-600/g, 'border-zinc-300');
          c = c.replace(/focus:border-zinc-500/g, 'focus:border-zinc-950');
          
          // Texts
          c = c.replace(/text-zinc-50/g, 'text-zinc-950');
          c = c.replace(/text-zinc-400/g, 'text-zinc-500');
          c = c.replace(/text-zinc-300/g, 'text-zinc-600');
          
          // Special Button inversions (the ones I set to zinc-50 earlier)
          // Wait, if I replace text-zinc-50 to text-zinc-950 above, this button string is now "bg-zinc-50 text-zinc-950 hover:bg-zinc-200"!
          // Let's fix that specific combo:
          c = c.replace(/bg-zinc-50 text-zinc-950 hover:bg-zinc-200/g, 'bg-zinc-950 text-white hover:bg-zinc-800');
          
          if (c !== original) {
            fs.writeFileSync(fullPath, c, 'utf-8');
            console.log(`Updated ${fullPath}`);
          }
        }
      }
    }
    traverse(dir);
  }
}

safeReplace();
