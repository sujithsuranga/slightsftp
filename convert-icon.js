const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const inputPng = path.join(__dirname, 'assets', 'icon.png');
const outputIco = path.join(__dirname, 'build', 'icon.ico');

console.log('Converting PNG to ICO...');
console.log('Input:', inputPng);
console.log('Output:', outputIco);

const pngBuffer = fs.readFileSync(inputPng);

toIco([pngBuffer], { resize: true, sizes: [16, 24, 32, 48, 64, 128, 256] })
  .then(buf => {
    fs.writeFileSync(outputIco, buf);
    const stats = fs.statSync(outputIco);
    console.log('\n✓ ICO file created successfully!');
    console.log('Size:', Math.round(stats.size / 1024), 'KB');
    
    // Verify it's a real ICO file
    const icoBytes = fs.readFileSync(outputIco);
    if (icoBytes[0] === 0 && icoBytes[1] === 0 && icoBytes[2] === 1 && icoBytes[3] === 0) {
      console.log('✓ Verified: Valid ICO file format');
    } else {
      console.log('✗ Warning: File might not be valid ICO format');
    }
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
