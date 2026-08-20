const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync('c:/Users/Android Developer/Downloads/Untitled design (4).pdf'));
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
  const page = await doc.getPage(1);
  const scale = 2;
  const viewport = page.getViewport({ scale });
  const width = Math.floor(viewport.width);
  const height = Math.floor(viewport.height);
  console.log('render size', width, height);

  const png = new PNG({ width, height });
  // fill white
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 255; png.data[i+1] = 255; png.data[i+2] = 255; png.data[i+3] = 255;
  }

  class NodeCanvas {
    constructor(w, h) { this.width = w; this.height = h; this._png = png; }
    getContext(type) {
      if (type !== '2d') throw new Error(type);
      const self = this;
      const ctx = {
        canvas: self,
        fillStyle: '#ffffff',
        strokeStyle: '#000000',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        _transform: [1,0,0,1,0,0],
        setTransform(a,b,c,d,e,f) { this._transform = [a,b,c,d,e,f]; },
        transform(a,b,c,d,e,f) {
          const [a0,b0,c0,d0,e0,f0] = this._transform;
          this._transform = [
            a0*a + c0*b, b0*a + d0*b,
            a0*c + c0*d, b0*c + d0*d,
            a0*e + c0*f + e0, b0*e + d0*f + f0
          ];
        },
        save() { this._stack = this._stack || []; this._stack.push({t:[...this._transform], fill:this.fillStyle, stroke:this.strokeStyle, a:this.globalAlpha}); },
        restore() { const s = (this._stack||[]).pop(); if(!s) return; this._transform=s.t; this.fillStyle=s.fill; this.strokeStyle=s.stroke; this.globalAlpha=s.a; },
        beginPath() { this._path = []; },
        moveTo() {},
        lineTo() {},
        bezierCurveTo() {},
        quadraticCurveTo() {},
        closePath() {},
        rect() {},
        clip() {},
        fill() {},
        stroke() {},
        fillRect(x,y,w,h) {
          // approximate fill for backgrounds
          const color = parseColor(this.fillStyle);
          const x0 = Math.max(0, Math.floor(x));
          const y0 = Math.max(0, Math.floor(y));
          const x1 = Math.min(width, Math.ceil(x+w));
          const y1 = Math.min(height, Math.ceil(y+h));
          for (let yy=y0; yy<y1; yy++) {
            for (let xx=x0; xx<x1; xx++) {
              const i = (yy*width + xx)*4;
              png.data[i]=color[0]; png.data[i+1]=color[1]; png.data[i+2]=color[2]; png.data[i+3]=255;
            }
          }
        },
        strokeRect() {},
        clearRect(x,y,w,h) { this.fillStyle='#ffffff'; this.fillRect(x,y,w,h); },
        drawImage(img, ...args) {
          // drawImage(img, dx, dy) or (img, dx, dy, dw, dh) or (img, sx,sy,sw,sh,dx,dy,dw,dh)
          let sx=0,sy=0,sw=img.width,sh=img.height,dx,dy,dw,dh;
          if (args.length === 2) { dx=args[0]; dy=args[1]; dw=sw; dh=sh; }
          else if (args.length === 4) { dx=args[0]; dy=args[1]; dw=args[2]; dh=args[3]; }
          else { sx=args[0]; sy=args[1]; sw=args[2]; sh=args[3]; dx=args[4]; dy=args[5]; dw=args[6]; dh=args[7]; }
          if (!img || !img.data) return;
          // nearest neighbor blit
          for (let j=0; j<dh; j++) {
            const syi = Math.floor(sy + (j * sh)/dh);
            const dyi = Math.floor(dy + j);
            if (dyi < 0 || dyi >= height) continue;
            for (let i=0; i<dw; i++) {
              const sxi = Math.floor(sx + (i * sw)/dw);
              const dxi = Math.floor(dx + i);
              if (dxi < 0 || dxi >= width) continue;
              const si = (syi * img.width + sxi) * 4;
              const di = (dyi * width + dxi) * 4;
              const a = img.data[si+3] / 255;
              if (a <= 0) continue;
              png.data[di] = Math.round(img.data[si]*a + png.data[di]*(1-a));
              png.data[di+1] = Math.round(img.data[si+1]*a + png.data[di+1]*(1-a));
              png.data[di+2] = Math.round(img.data[si+2]*a + png.data[di+2]*(1-a));
              png.data[di+3] = 255;
            }
          }
        },
        measureText(t) { return { width: (t||'').length * 6 }; },
        fillText() {},
        strokeText() {},
        createImageData(w,h) { return { width:w, height:h, data: new Uint8ClampedArray(w*h*4) }; },
        getImageData(x,y,w,h) {
          const out = new Uint8ClampedArray(w*h*4);
          for (let j=0;j<h;j++) for (let i=0;i<w;i++) {
            const si=((y+j)*width + (x+i))*4; const di=(j*w+i)*4;
            out[di]=png.data[si]; out[di+1]=png.data[si+1]; out[di+2]=png.data[si+2]; out[di+3]=png.data[si+3];
          }
          return { width:w, height:h, data: out };
        },
        putImageData(img, x, y) {
          for (let j=0;j<img.height;j++) for (let i=0;i<img.width;i++) {
            const dx=x+i, dy=y+j; if (dx<0||dy<0||dx>=width||dy>=height) continue;
            const si=(j*img.width+i)*4; const di=(dy*width+dx)*4;
            png.data[di]=img.data[si]; png.data[di+1]=img.data[si+1]; png.data[di+2]=img.data[si+2]; png.data[di+3]=img.data[si+3];
          }
        }
      };
      return ctx;
    }
  }

  function parseColor(c) {
    if (typeof c !== 'string') return [0,0,0];
    if (c.startsWith('#')) {
      const h = c.slice(1);
      if (h.length===3) return [parseInt(h[0]+h[0],16),parseInt(h[1]+h[1],16),parseInt(h[2]+h[2],16)];
      return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
    }
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return [+m[1],+m[2],+m[3]];
    return [0,0,0];
  }

  // Custom canvas factory for pdfjs
  const canvasFactory = {
    create(w,h) {
      const canvas = new NodeCanvas(w,h);
      return { canvas, context: canvas.getContext('2d') };
    },
    reset(canvasAndContext, w, h) {
      canvasAndContext.canvas.width = w;
      canvasAndContext.canvas.height = h;
    },
    destroy(canvasAndContext) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
    }
  };

  // Also need Image for jpeg decode - use jpeg-js if available, else skip
  let jpeg;
  try { jpeg = require('jpeg-js'); } catch {}
  
  // Monkeypatch: when pdfjs creates Image, we need decode. Use pdfjs internal.
  // Better approach: use page.objs after render ops with OPS.paintImageXObject

  const ops = await page.getOperatorList();
  const OPS = pdfjs.OPS;
  console.log('unique ops', [...new Set(ops.fnArray)].map(n => Object.keys(OPS).find(k=>OPS[k]===n) || n).slice(0,50));

  // Extract image objects by resolving resources
  await page.getOperatorList();
  // Force load objs via getOperatorList already done; iterate objs after paint
  // Use pdf page render with our factory:
  try {
    await page.render({
      canvasContext: canvasFactory.create(width, height).context,
      viewport,
      canvasFactory
    }).promise;
    console.log('render completed');
  } catch (e) {
    console.error('render error', e.message);
  }

  const out = path.join('.pdf-extract', 'page-full.png');
  fs.writeFileSync(out, PNG.sync.write(png));
  console.log('wrote', out, fs.statSync(out).size);
}

main().catch(e => { console.error(e); process.exit(1); });
