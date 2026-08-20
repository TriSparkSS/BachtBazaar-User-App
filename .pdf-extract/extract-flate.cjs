const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { PNG } = require('pngjs');
const zlib = require('zlib');

async function main() {
  const pdfjsPath = pathToFileURL(
    path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs'),
  ).href;
  const pdfjs = await import(pdfjsPath);

  const data = new Uint8Array(
    fs.readFileSync('c:/Users/Android Developer/Downloads/Untitled design (4).pdf'),
  );
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
  const page = await doc.getPage(1);
  const ops = await page.getOperatorList();
  const OPS = pdfjs.OPS;

  const names = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (
      ops.fnArray[i] === OPS.paintImageXObject ||
      ops.fnArray[i] === OPS.paintInlineImageXObject
    ) {
      names.push(ops.argsArray[i][0]);
    }
  }
  console.log('image ops', names.length, names.slice(0, 20));

  let idx = 0;
  for (const name of names) {
    try {
      const img = await new Promise((resolve, reject) => {
        page.objs.get(name, resolve);
        setTimeout(() => reject(new Error('timeout ' + name)), 8000);
      });
      if (!img || !img.width || !img.height || !img.data) continue;
      const w = img.width;
      const h = img.height;
      // Phone mockups are ~340x740
      if (w < 300 || h < 600 || w > 500 || h > 900) {
        console.log('skip', name, w, h);
        continue;
      }
      idx++;
      const png = new PNG({ width: w, height: h });
      const src = img.data;
      const channels = src.length / (w * h);
      for (let p = 0; p < w * h; p++) {
        const si = p * channels;
        const di = p * 4;
        if (channels >= 3) {
          png.data[di] = src[si];
          png.data[di + 1] = src[si + 1];
          png.data[di + 2] = src[si + 2];
          png.data[di + 3] = channels >= 4 ? src[si + 3] : 255;
        } else {
          const g = src[si];
          png.data[di] = g;
          png.data[di + 1] = g;
          png.data[di + 2] = g;
          png.data[di + 3] = 255;
        }
      }
      const out = path.join(__dirname, `decoded_${idx}_${w}x${h}.png`);
      fs.writeFileSync(out, PNG.sync.write(png));
      console.log('wrote', out);
    } catch (e) {
      console.log('fail', name, e.message);
    }
  }
  console.log('done', idx);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
