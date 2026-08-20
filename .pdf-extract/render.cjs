const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

function parseColor(c) {
  if (typeof c !== 'string') return [0, 0, 0, 1];
  if (c.startsWith('#')) {
    const h = c.slice(1);
    if (h.length === 3) {
      return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), 1];
    }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
  if (m) return [+m[1], +m[2], +m[3], m[4] !== undefined ? +m[4] : 1];
  return [0, 0, 0, 1];
}

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
  const scale = 1.5;
  const viewport = page.getViewport({ scale });
  const width = Math.floor(viewport.width);
  const height = Math.floor(viewport.height);
  console.log('render size', width, height);

  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 255;
    png.data[i + 1] = 255;
    png.data[i + 2] = 255;
    png.data[i + 3] = 255;
  }

  function blitImage(img, dx, dy, dw, dh, sx, sy, sw, sh) {
    sx = sx || 0;
    sy = sy || 0;
    sw = sw == null ? img.width : sw;
    sh = sh == null ? img.height : sh;
    dw = dw == null ? sw : dw;
    dh = dh == null ? sh : dh;
    for (let j = 0; j < dh; j++) {
      const syi = Math.min(img.height - 1, Math.floor(sy + (j * sh) / dh));
      const dyi = Math.floor(dy + j);
      if (dyi < 0 || dyi >= height) continue;
      for (let i = 0; i < dw; i++) {
        const sxi = Math.min(img.width - 1, Math.floor(sx + (i * sw) / dw));
        const dxi = Math.floor(dx + i);
        if (dxi < 0 || dxi >= width) continue;
        const si = (syi * img.width + sxi) * 4;
        const di = (dyi * width + dxi) * 4;
        const a = (img.data[si + 3] ?? 255) / 255;
        if (a <= 0) continue;
        png.data[di] = Math.round(img.data[si] * a + png.data[di] * (1 - a));
        png.data[di + 1] = Math.round(img.data[si + 1] * a + png.data[di + 1] * (1 - a));
        png.data[di + 2] = Math.round(img.data[si + 2] * a + png.data[di + 2] * (1 - a));
        png.data[di + 3] = 255;
      }
    }
  }

  class NodeCanvas {
    constructor(w, h) {
      this.width = w;
      this.height = h;
    }
    getContext(type) {
      if (type !== '2d') throw new Error(type);
      const ctx = {
        canvas: this,
        fillStyle: '#ffffff',
        strokeStyle: '#000000',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        _transform: [1, 0, 0, 1, 0, 0],
        _stack: [],
        setTransform(a, b, c, d, e, f) {
          this._transform = [a, b, c, d, e, f];
        },
        transform(a, b, c, d, e, f) {
          const [a0, b0, c0, d0, e0, f0] = this._transform;
          this._transform = [
            a0 * a + c0 * b,
            b0 * a + d0 * b,
            a0 * c + c0 * d,
            b0 * c + d0 * d,
            a0 * e + c0 * f + e0,
            b0 * e + d0 * f + f0,
          ];
        },
        save() {
          this._stack.push({
            t: [...this._transform],
            fill: this.fillStyle,
            stroke: this.strokeStyle,
            a: this.globalAlpha,
          });
        },
        restore() {
          const s = this._stack.pop();
          if (!s) return;
          this._transform = s.t;
          this.fillStyle = s.fill;
          this.strokeStyle = s.stroke;
          this.globalAlpha = s.a;
        },
        beginPath() {},
        moveTo() {},
        lineTo() {},
        bezierCurveTo() {},
        quadraticCurveTo() {},
        closePath() {},
        rect() {},
        clip() {},
        fill() {},
        stroke() {},
        fillRect(x, y, w, h) {
          const [r, g, b] = parseColor(this.fillStyle);
          const x0 = Math.max(0, Math.floor(x));
          const y0 = Math.max(0, Math.floor(y));
          const x1 = Math.min(width, Math.ceil(x + w));
          const y1 = Math.min(height, Math.ceil(y + h));
          for (let yy = y0; yy < y1; yy++) {
            for (let xx = x0; xx < x1; xx++) {
              const i = (yy * width + xx) * 4;
              png.data[i] = r;
              png.data[i + 1] = g;
              png.data[i + 2] = b;
              png.data[i + 3] = 255;
            }
          }
        },
        strokeRect() {},
        clearRect(x, y, w, h) {
          this.fillStyle = '#ffffff';
          this.fillRect(x, y, w, h);
        },
        drawImage(img, ...args) {
          let sx = 0,
            sy = 0,
            sw = img.width,
            sh = img.height,
            dx,
            dy,
            dw,
            dh;
          if (args.length === 2) {
            dx = args[0];
            dy = args[1];
            dw = sw;
            dh = sh;
          } else if (args.length === 4) {
            dx = args[0];
            dy = args[1];
            dw = args[2];
            dh = args[3];
          } else {
            sx = args[0];
            sy = args[1];
            sw = args[2];
            sh = args[3];
            dx = args[4];
            dy = args[5];
            dw = args[6];
            dh = args[7];
          }
          blitImage(img, dx, dy, dw, dh, sx, sy, sw, sh);
        },
        measureText(t) {
          return { width: String(t || '').length * 6 };
        },
        fillText() {},
        strokeText() {},
        createPattern() {
          return null;
        },
        createLinearGradient() {
          return { addColorStop() {} };
        },
        createRadialGradient() {
          return { addColorStop() {} };
        },
        createImageData(w, h) {
          return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
        },
        getImageData(x, y, w, h) {
          const out = new Uint8ClampedArray(w * h * 4);
          for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) {
              const si = ((y + j) * width + (x + i)) * 4;
              const di = (j * w + i) * 4;
              out[di] = png.data[si];
              out[di + 1] = png.data[si + 1];
              out[di + 2] = png.data[si + 2];
              out[di + 3] = png.data[si + 3];
            }
          }
          return { width: w, height: h, data: out };
        },
        putImageData(img, x, y) {
          for (let j = 0; j < img.height; j++) {
            for (let i = 0; i < img.width; i++) {
              const dx = x + i;
              const dy = y + j;
              if (dx < 0 || dy < 0 || dx >= width || dy >= height) continue;
              const si = (j * img.width + i) * 4;
              const di = (dy * width + dx) * 4;
              png.data[di] = img.data[si];
              png.data[di + 1] = img.data[si + 1];
              png.data[di + 2] = img.data[si + 2];
              png.data[di + 3] = img.data[si + 3];
            }
          }
        },
      };
      return ctx;
    }
  }

  // Decode embedded JPEG image XObjects via operator list
  const ops = await page.getOperatorList();
  const OPS = pdfjs.OPS;
  const imageNames = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === OPS.paintImageXObject || ops.fnArray[i] === OPS.paintImageXObjectRepeat) {
      imageNames.push(ops.argsArray[i][0]);
    }
  }
  console.log('image paints', imageNames.length, 'unique', [...new Set(imageNames)].length);

  // Ensure images are resolved
  for (const name of [...new Set(imageNames)]) {
    await new Promise((resolve) => {
      page.objs.get(name, resolve);
    });
  }

  // Build decoded images map
  const decoded = {};
  for (const name of [...new Set(imageNames)]) {
    const img = page.objs.get(name);
    if (!img) continue;
    if (img.data && img.width && img.height) {
      // already RGBA-ish
      let data = img.data;
      if (data.length === img.width * img.height * 3) {
        const rgba = new Uint8ClampedArray(img.width * img.height * 4);
        for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
          rgba[j] = data[i];
          rgba[j + 1] = data[i + 1];
          rgba[j + 2] = data[i + 2];
          rgba[j + 3] = 255;
        }
        data = rgba;
      } else if (data.length === img.width * img.height) {
        const rgba = new Uint8ClampedArray(img.width * img.height * 4);
        for (let i = 0, j = 0; i < data.length; i++, j += 4) {
          rgba[j] = data[i];
          rgba[j + 1] = data[i];
          rgba[j + 2] = data[i];
          rgba[j + 3] = 255;
        }
        data = rgba;
      }
      decoded[name] = { width: img.width, height: img.height, data };
      console.log('decoded', name, img.width, img.height, data.length);
    }
  }

  // Manual paint using CTM from ops — walk transforms
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  function multiply(m1, m2) {
    return [
      m1[0] * m2[0] + m1[2] * m2[1],
      m1[1] * m2[0] + m1[3] * m2[1],
      m1[0] * m2[2] + m1[2] * m2[3],
      m1[1] * m2[2] + m1[3] * m2[3],
      m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
      m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
    ];
  }

  // Apply PDF->viewport transform
  const vt = viewport.transform; // [scale,0,0,-scale,0,height]
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (fn === OPS.save) stack.push([...ctm]);
    else if (fn === OPS.restore) ctm = stack.pop() || ctm;
    else if (fn === OPS.transform) ctm = multiply(ctm, args);
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
      const name = args[0];
      const img = decoded[name];
      if (!img) continue;
      // Image is drawn in unit square [0,1]x[0,1] then CTM maps it
      const m = multiply(vt, ctm);
      // corners: (0,0), (1,0), (0,1)
      const x0 = m[4];
      const y0 = m[5];
      const x1 = m[0] + m[4];
      const y1 = m[1] + m[5];
      const x2 = m[2] + m[4];
      const y2 = m[3] + m[5];
      // axis-aligned bbox blit (designs are usually axis aligned)
      const dx = Math.min(x0, x1, x2);
      const dy = Math.min(y0, y1, y2);
      const dw = Math.abs(m[0]) || Math.abs(x1 - x0);
      const dh = Math.abs(m[3]) || Math.abs(y2 - y0);
      blitImage(img, dx, dy, dw, dh);
    } else if (fn === OPS.setFillRGBColor) {
      // ignore for now
    }
  }

  const out = path.join(__dirname, 'page-full.png');
  fs.writeFileSync(out, PNG.sync.write(png));
  console.log('wrote', out, fs.statSync(out).size);

  // Also export each decoded image as PNG for inspection
  let n = 0;
  for (const [name, img] of Object.entries(decoded)) {
    n++;
    const p = new PNG({ width: img.width, height: img.height });
    p.data = Buffer.from(img.data);
    const fp = path.join(__dirname, `decoded_${n}_${name}.png`);
    fs.writeFileSync(fp, PNG.sync.write(p));
    console.log('saved', fp, img.width, 'x', img.height);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
