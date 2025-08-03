const y="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";class i{static async generateQuestions(t,e){var o,m;const{content:r,customPrompt:n,numQuestions:c=5,difficulty:a="mixed",language:u="vi"}=e,l=n||this.getDefaultPrompt(c,a,u),p=t.apiKey||y;try{const s=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${p}`},body:JSON.stringify({model:t.model||"gpt-3.5-turbo",messages:[{role:"system",content:l},{role:"user",content:`Nội dung để tạo câu hỏi:

${r}`}],temperature:.7,max_tokens:2e3})});if(!s.ok)throw new Error(`OpenAI API Error: ${s.status} ${s.statusText}`);const d=(m=(o=(await s.json()).choices[0])==null?void 0:o.message)==null?void 0:m.content;return this.parseQuestionsFromText(d)}catch(s){throw console.error("OpenAI Service Error:",s),s}}static getDefaultPrompt(t,e,r){return`
Bạn là một chuyên gia tạo câu hỏi trắc nghiệm chất lượng cao. Hãy tạo ${t} câu hỏi trắc nghiệm bằng ${r==="vi"?"tiếng Việt":"English"} dựa trên nội dung được cung cấp.

Yêu cầu:
- Mỗi câu hỏi có 4 đáp án (A, B, C, D)
- Chỉ có 1 đáp án đúng
- Câu hỏi phải liên quan trực tiếp đến nội dung
- Độ khó: ${e}
- Bao gồm giải thích cho đáp án đúng
- Đảm bảo câu hỏi có tính phân biệt cao

Trả về định dạng JSON chính xác như sau:
{
  "questions": [
    {
      "text": "Câu hỏi ở đây",
      "answers": [
        {"text": "Đáp án A", "isCorrect": true},
        {"text": "Đáp án B", "isCorrect": false},
        {"text": "Đáp án C", "isCorrect": false},
        {"text": "Đáp án D", "isCorrect": false}
      ],
      "explanation": "Giải thích tại sao đáp án A đúng",
      "points": 10,
      "difficulty": "medium"
    }
  ]
}

CHỈ trả về JSON, không có text khác.`}static parseQuestionsFromText(t){try{const e=t.replace(/```json|```/g,"").trim(),r=JSON.parse(e);if(!r.questions||!Array.isArray(r.questions))throw new Error("Invalid JSON structure");return r.questions.map((n,c)=>({id:`ai-${Date.now()}-${c}`,text:n.text,type:"multiple",answers:n.answers.map((a,u)=>({id:String.fromCharCode(97+u),text:a.text,isCorrect:a.isCorrect})),explanation:n.explanation,points:n.points||10}))}catch(e){throw console.error("Failed to parse AI response:",e),console.log("Raw response:",t),new Error("Không thể phân tích câu trả lời từ AI. Vui lòng thử lại.")}}}class w{static async generateQuestions(t,e){var p;const{content:r,customPrompt:n,numQuestions:c=5,difficulty:a="mixed",language:u="vi"}=e,l=n||i.getDefaultPrompt(c,a,u);try{const o=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":t.apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:t.model||"claude-3-sonnet-20240229",max_tokens:2e3,system:l,messages:[{role:"user",content:`Nội dung để tạo câu hỏi:

${r}`}]})});if(!o.ok)throw new Error(`Claude API Error: ${o.status} ${o.statusText}`);const s=(p=(await o.json()).content[0])==null?void 0:p.text;return i.parseQuestionsFromText(s)}catch(o){throw console.error("Claude Service Error:",o),o}}static getDefaultPrompt(t,e,r){return i.getDefaultPrompt(t,e,r)}}class x{static async generateQuestions(t,e){var p,o,m;const{content:r,customPrompt:n,numQuestions:c=5,difficulty:a="mixed",language:u="vi"}=e,l=n||i.getDefaultPrompt(c,a,u);try{const s=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${t.model||"gemini-pro"}:generateContent?key=${t.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:`${l}

Nội dung để tạo câu hỏi:

${r}`}]}],generationConfig:{temperature:.7,maxOutputTokens:2e3}})});if(!s.ok)throw new Error(`Gemini API Error: ${s.status} ${s.statusText}`);const d=(m=(o=(p=(await s.json()).candidates[0])==null?void 0:p.content)==null?void 0:o.parts[0])==null?void 0:m.text;return i.parseQuestionsFromText(d)}catch(s){throw console.error("Gemini Service Error:",s),s}}static getDefaultPrompt(t,e,r){return i.getDefaultPrompt(t,e,r)}}class f{static async generateQuestions(t,e){const{content:r,customPrompt:n,numQuestions:c=5,difficulty:a="mixed",language:u="vi"}=e,l=n||i.getDefaultPrompt(c,a,u),p=t.baseURL||"http://localhost:11434";try{const o=await fetch(`${p}/api/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:t.model||"llama2",prompt:`${l}

Nội dung để tạo câu hỏi:

${r}`,stream:!1,options:{temperature:.7,num_predict:2e3}})});if(!o.ok)throw new Error(`Local AI Error: ${o.status} ${o.statusText}`);const s=(await o.json()).response;return i.parseQuestionsFromText(s)}catch(o){throw console.error("Local AI Service Error:",o),o}}static getDefaultPrompt(t,e,r){return i.getDefaultPrompt(t,e,r)}}class v{static async generateQuestions(t,e){try{switch(t.provider){case"openai":return await i.generateQuestions(t,e);case"claude":return await w.generateQuestions(t,e);case"gemini":return await x.generateQuestions(t,e);case"local":return await f.generateQuestions(t,e);default:throw new Error(`Unsupported AI provider: ${t.provider}`)}}catch(r){throw console.error("AI Service Error:",r),r}}static getAvailableModels(t){switch(t){case"openai":return["gpt-3.5-turbo","gpt-4","gpt-4-turbo-preview"];case"claude":return["claude-3-sonnet-20240229","claude-3-opus-20240229","claude-3-haiku-20240307"];case"gemini":return["gemini-pro","gemini-pro-vision"];case"local":return["llama2","codellama","mistral","phi"];default:return[]}}static validateConfig(t){return!t.apiKey&&t.provider!=="local"?{valid:!1,error:"API key is required"}:t.provider==="local"&&!t.baseURL?{valid:!1,error:"Base URL is required for local AI"}:{valid:!0}}}export{v as AIService,w as ClaudeService,y as DEFAULT_OPENAI_API_KEY,x as GeminiService,f as LocalAIService,i as OpenAIService};
