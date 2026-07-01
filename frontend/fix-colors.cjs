const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'pages');

const files = [
  'Perfil.jsx',
  'MisSolicitudes.jsx',
  'MisServicios.jsx',
  'Calificar.jsx',
  'SolicitarServicio.jsx',
  'Buscar.jsx',
  'Mapa.jsx',
];

const replacements = [
  { search: /rgba\(9,\s*35,\s*36,\s*0\.4\)/g, replace: 'rgba(255, 255, 255, 0.6)' },
  { search: /rgba\(169,\s*210,\s*182,\s*0\.12\)/g, replace: 'rgba(0, 0, 0, 0.05)' },
  { search: /rgba\(0,\s*17,\s*18,\s*0\.4\)/g, replace: 'rgba(255, 255, 255, 0.6)' },
  { search: /rgba\(169,\s*210,\s*182,\s*0\.08\)/g, replace: 'rgba(0, 0, 0, 0.05)' },
  { search: /rgba\(169,\s*210,\s*182,\s*0\.06\)/g, replace: 'rgba(0, 0, 0, 0.05)' },
  { search: /rgba\(169,\s*210,\s*182,\s*0\.1\)/g, replace: 'rgba(0, 0, 0, 0.04)' },
  { search: /rgba\(169,\s*210,\s*182,\s*0\.5\)/g, replace: 'rgba(0, 0, 0, 0.2)' },
  { search: /rgba\(193,\s*200,\s*193,\s*0\.5\)/g, replace: 'oklch(0.45 0.03 240)' },
  { search: /#cde8e8/g, replace: 'oklch(0.25 0.06 240)' },
  { search: /#a9d2b6/g, replace: 'oklch(0.40 0.18 255)' },
  { search: /linear-gradient\(135deg,\s*#a9d2b6,\s*#1e4f43\)/g, replace: 'linear-gradient(135deg, oklch(0.40 0.18 255), oklch(0.72 0.13 200))' },
  { search: /linear-gradient\(135deg,\s*#bde2ca,\s*#256f5a\)/g, replace: 'linear-gradient(135deg, oklch(0.45 0.18 255), oklch(0.77 0.13 200))' },
  { search: /#001718/g, replace: 'white' }
];

files.forEach((file) => {
  const filePath = path.join(directoryPath, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    replacements.forEach(({ search, replace }) => {
      content = content.replace(search, replace);
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${file}`);
    } else {
      console.log(`No changes needed for ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
