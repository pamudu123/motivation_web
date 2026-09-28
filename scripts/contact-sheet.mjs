import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const source=process.argv[2] || 'test-results/release';
const target='docs/screenshots';await mkdir(target,{recursive:true});
const items=[
  ['Desktop opening','scroll-desktop-0.png'],['Desktop collection','scroll-desktop-1.png'],['Desktop themes','scroll-desktop-2.png'],
  ['Phone collection','phone-daily.png'],['Phone discovery','phone-mood-section.png'],['Phone archive','phone-archive-section.png'],
  ['Compact phone','compact-daily.png'],['Tablet collection','tablet-daily.png'],['Reduced motion','reduced-daily.png'],
];
const cells=[];const w=400;const h=350;
for(let i=0;i<items.length;i++) {
  const [label,file]=items[i];const x=(i%3)*w;const y=Math.floor(i/3)*h;
  const frame=await sharp(`${source}/${file}`).resize(w-20,h-44,{fit:'contain',background:'#141515'}).png().toBuffer();
  cells.push({input:frame,left:x+10,top:y+34});
  const title=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="30"><text x="12" y="22" font-family="Arial" font-size="13" fill="#f5f3ed">${label}</text></svg>`);
  cells.push({input:title,left:x,top:y});
}
await sharp({create:{width:w*3,height:h*3,channels:3,background:'#141515'}}).composite(cells).jpeg({quality:88}).toFile(`${target}/contact-sheet.jpg`);
await sharp(`${source}/scroll-desktop-0.png`).jpeg({quality:88}).toFile(`${target}/desktop.jpg`);
console.log(`Saved ${target}/contact-sheet.jpg and desktop.jpg`);
