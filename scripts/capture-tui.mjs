/** Exporta o frame Ratatui para SVG/PNG, sem redesenhar controles ou adicionar moldura de terminal. */
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const root=resolve(import.meta.dirname,'..');
const binary=resolve(root,'target/debug/setupvibe');
const destination=resolve(root,'docs/assets/tui');mkdirSync(destination,{recursive:true});
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const browser=await chromium.launch({headless:true});
try{
  for(const [name,edition,width,height,tab]of [['desktop-home','desktop',129,44,0],['desktop-apps','desktop',129,44,1],['server-apps','server',80,24,1],['metrics','desktop',160,50,3]]){
    const frame=JSON.parse(execFileSync(binary,['--data-dir','/home/dev/.local/share/setupvibe','--edition',edition,'--output','json','tui','--snapshot','--width',String(width),'--height',String(height),'--tab',String(tab)],{encoding:'utf8',maxBuffer:8*1024*1024})).data;
    const cw=12,ch=24;
    const cells=frame.cells.map(c=>`<rect x="${c.x*cw}" y="${c.y*ch}" width="${cw}" height="${ch}" fill="${c.bg==='inherit'?frame.tokens.background:c.bg}"/>${c.text===' '?'':`<text x="${c.x*cw}" y="${c.y*ch+18}" fill="${c.fg==='inherit'?frame.tokens.text:c.fg}" textLength="${cw}" lengthAdjust="spacingAndGlyphs">${escape(c.text)}</text>`}`).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width*cw}" height="${height*ch}" viewBox="0 0 ${width*cw} ${height*ch}" role="img" aria-label="Frame real da TUI SetupVibe ${edition}, ${width} por ${height}"><g font-family="monospace" font-size="19">${cells}</g></svg>`;
    writeFileSync(resolve(destination,`${name}.svg`),svg+'\n');
    const page=await browser.newPage({viewport:{width:width*cw,height:height*ch},deviceScaleFactor:1});
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await page.screenshot({path:resolve(destination,`${name}.png`)});await page.close();
    console.log(`${name}: ${width}x${height}`);
  }
}finally{await browser.close();}
