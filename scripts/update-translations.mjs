import fs from 'node:fs/promises';
import path from 'node:path';
import {parse} from '@babel/parser';
import traverseModule from '@babel/traverse';
const traverse=traverseModule.default||traverseModule;
const existing=JSON.parse(await fs.readFile('src/i18n/am.json','utf8').catch(()=>'{}'));
const texts=new Set();
function add(text){const s=text.replace(/\s+/g,' ').trim();if(s.length<2||s.length>15000||!/[A-Za-z]/.test(s)||/https?:|^\/|@|^[\w.-]+\/(?:[\w.-]+)|^#[a-f0-9]{3,8}$/i.test(s)||s.includes('=>')||s.includes('process.env')||s.includes('import.meta'))return;texts.add(s)}
async function scan(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='i18n')await scan(file);}else if(/\.tsx?$/.test(file)){const ast=parse(await fs.readFile(file,'utf8'),{sourceType:'module',plugins:['typescript','jsx']});traverse(ast,{JSXText(p){add(p.node.value)},StringLiteral(p){add(p.node.value)}});}}}
await scan('src');
const missing=[...texts].filter(t=>!existing[t]);
if(missing.length&&!process.env.GOOGLE_TRANSLATE_API_KEY)throw new Error('Provide GOOGLE_TRANSLATE_API_KEY securely to update the static translation catalog.');
const decode=s=>s.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
for(let i=0;i<missing.length;i+=50){const q=missing.slice(i,i+50);const r=await fetch('https://translation.googleapis.com/language/translate/v2?key='+encodeURIComponent(process.env.GOOGLE_TRANSLATE_API_KEY),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q,source:'en',target:'am',format:'text'})});const j=await r.json();if(!r.ok||j.data?.translations?.length!==q.length)throw new Error(`Translation batch failed (${r.status}).`);q.forEach((text,n)=>existing[text]=decode(j.data.translations[n].translatedText));console.log(`Translated static website text: ${Math.min(i+50,missing.length)}/${missing.length}`);}
Object.assign(existing,{
 'Arbahara':'አርባሐራ',
 'Monastery of Abuna Hara Dengeel':'የአቡነ ሐራ ድንግል ገዳም',
 'Monastery of':'ገዳመ','Abuna Hara Dengeel':'አቡነ ሐራ ድንግል',
 'Previous hero image':'ያለፈው የመነሻ ገጽ ምስል','Next hero image':'ቀጣዩ የመነሻ ገጽ ምስል',
 'Pause hero slideshow':'የምስል ቅያሪውን ለአፍታ አቁም','Play hero slideshow':'የምስል ቅያሪውን ቀጥል',
 'Icon of Christ':'የክርስቶስ ሥዕል','Sacred portrait':'ቅዱስ ሥዕል',
 'Belong & serve':'አባል ይሁኑ፣ ያገልግሉ','Make an offering':'ልገሳ ያበርክቱ',
 'Giving history':'የልገሳ መዝገብ','My membership':'የእኔ አባልነት','My tickets':'የእኔ ቲኬቶች','Membership':'አባልነት',
 '01 · Receive':'01 · እምነትን ይቀበሉ','02 · Belong':'02 · በአንድነት ይኑሩ','03 · Pass on':'03 · ለትውልድ ያስተላልፉ',
 'Ethiopian Orthodox Tewahedo Church':'የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን',
 'In the name of the Father, and of the Son, and of the Holy Spirit, one God.':'በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ።',
 'Member login':'የአባላት መግቢያ','Member portal':'የአባላት መግቢያ','Give':'ይለግሱ','Our monastery':'ገዳማችን','Faith & learning':'እምነትና ትምህርት','Archive':'ማኅደር','Visit':'ጉብኝት','Sign out':'ውጣ',
});
await fs.mkdir('src/i18n',{recursive:true});await fs.writeFile('src/i18n/am.json',JSON.stringify(Object.fromEntries(Object.entries(existing).sort(([a],[b])=>a.localeCompare(b))),null,2)+'\n');
console.log(`Amharic catalog ready: ${Object.keys(existing).length} entries. Only source-code literals were sent for translation.`);
