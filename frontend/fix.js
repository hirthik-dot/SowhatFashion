const fs = require('fs');
let code = fs.readFileSync('d:/ProjectsD/soWhat/frontend/src/components/homepage/CatalogueHome.tsx', 'utf8');

// Replace all occurrences of cat.toLowerCase().replace('-', 's')
code = code.replace(/replace\('-', 's'\)/g, "replace('-', '')");
// Replace without spaces too
code = code.replace(/replace\('-','s'\)/g, "replace('-','')");

fs.writeFileSync('d:/ProjectsD/soWhat/frontend/src/components/homepage/CatalogueHome.tsx', code);
console.log('Fixed');
