// Compatibility endpoint for the original translation controls. Only the
// source-reviewed static catalog is served; visitor/member text is never sent
// to a third-party translation service at runtime.
const amharic = require('../src/i18n/am.json');
module.exports = async (req,res) => {
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    const {texts,target='am'}=body;
    if(!Array.isArray(texts)||!texts.length||texts.length>128||texts.some(t=>typeof t!=='string'||t.length>15000)||texts.reduce((n,t)=>n+t.length,0)>100000)return res.status(400).json({error:'Provide up to 128 text strings within the request limit.'});
    if(!['am','en'].includes(target))return res.status(400).json({error:'Choose English or Amharic.'});
    return res.status(200).json({translations:texts.map(t=>target==='am'?(amharic[t.replace(/\s+/g,' ').trim()]||t):t),source:'static-website-catalog'});
  }catch{return res.status(400).json({error:'Invalid translation request.'});}
};
