// Vercel serverless endpoint. Configure OPENAI_API_KEY in Vercel project environment.
module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({error:'AI is not configured yet. Add OPENAI_API_KEY in Vercel Settings → Environment Variables and redeploy.'});
  try{
    const {question,image}=req.body||{};
    if(typeof question!=='string'||!question.trim()||question.length>1800) return res.status(400).json({error:'Enter a question under 1,800 characters.'});
    if(image && (typeof image!=='string'||image.length>4200000||!/^data:image\/(jpeg|png|webp);base64,/.test(image))) return res.status(400).json({error:'Please use a JPG, PNG, or WebP image smaller than 3 MB.'});
    const content=[{type:'text',text:question}];
    if(image)content.push({type:'image_url',image_url:{url:image,detail:'low'}});
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
    let response;
    try{response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4o-mini',max_tokens:1300,messages:[{role:'system',content:'You are Culinary Cooking, a precise and encouraging culinary teacher. Respond with clearly organized helpful cooking instructions, quantities, methods, temperatures and timings where appropriate. Answer cuisine requests worldwide without pretending to exhaustively index all recipes. For image input, describe only visible ingredients and uncertainty. Explain safe raw-meat handling and FDA/USDA temperature guidance accurately. Do not assert food is safe from an image. Do not recommend home preservation practices without validated guidance. Avoid dangerous raw-fish or unrefrigerated curing suggestions.'},{role:'user',content}] }),signal:controller.signal});}finally{clearTimeout(timeout);}
    const data=await response.json();
    if(!response.ok) return res.status(response.status===429?429:502).json({error:response.status===429?'AI is busy. Please try again shortly.':'AI service request failed.'});
    return res.status(200).json({answer:data.choices?.[0]?.message?.content||'No answer was returned.'});
  }catch(e){return res.status(500).json({error:e.name==='AbortError'?'AI request timed out. Please try again.':'Could not reach the AI service.'});}
};