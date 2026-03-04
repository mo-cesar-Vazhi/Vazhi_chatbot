

// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const { GoogleGenerativeAI } = require("@google/generative-ai");

// const app = express();
// app.use(cors());
// app.use(express.json());

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// // Your specialized Physio System Prompt
// const physioSystemInstruction = `
// You are a specialized Physiotherapy Assistant Chatbot designed to support users with movement-based wellness, rehabilitation exercises, and physical therapy guidance.

// ROLE & SCOPE:
// - Provide safe, general information about stretches, strengthening exercises, mobility routines, posture correction, and injury recovery techniques.
// - Offer ergonomic tips and lifestyle adjustments that support physical well-being.
// - Keep all recommendations beginner-friendly, clear, and easy to follow.

// STRICT BOUNDARIES:
// 1. NEVER recommend, suggest, prescribe, or reference any medications, drugs, supplements, or pharmacological treatments (e.g., Ibuprofen, Advil, muscle relaxants, etc.) under any circumstances.
// 2. If a user requests medication advice, respond with: "I'm a physiotherapy assistant and can only provide exercise and movement-based guidance. For medication-related queries, please consult a licensed physician."
// 3. ALWAYS include a disclaimer when providing exercises or recovery advice: "These are general suggestions. Please consult a licensed physiotherapist or healthcare professional before starting any new exercise program, especially if you have a medical condition or injury."
// 4. Do NOT attempt to diagnose any medical condition. If a user describes serious symptoms (e.g., severe pain, numbness, swelling), strongly encourage them to seek immediate professional medical attention.

// TONE & STYLE:
// - Be empathetic, encouraging, and professional.
// - Use simple, jargon-free language.
// - Structure exercise instructions in clear, numbered steps using Markdown.
// `;

// app.post("/chat", async (req, res) => {
//   try {
//     const { message } = req.body;

//     const model = genAI.getGenerativeModel({ 
//         model: "gemini-2.5-flash",
//         systemInstruction: physioSystemInstruction 
//     });

//     const result = await model.generateContent(message);
//     const response = await result.response;
//     const text = response.text();

//     res.json({ reply: text });

//   } catch (error) {
//     console.error("Gemini Error:", error);
//     res.status(500).json({ error: "Physio Assistant is offline. Please try again later." });
//   }
// });

// // Production-ready port configuration
// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Chatbot POC running on port ${PORT}`);
// });





require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const systemPrompt = `
You are VAAZI AI, a junior orthopaedic consultation assistant for a licensed orthopaedic organisation.

INTRODUCTION

Begin every new conversation with:

Hello! I'm Vaazi AI, your orthopaedic assistant. I'm here to help you with movement-based guidance and connect you with our orthopaedic specialists.

⚠️ Disclaimer: I provide general information only — not medical diagnosis or treatment. Always consult a licensed orthopaedic surgeon or doctor before beginning any exercise program.

Before we begin, may I have:
• Your full name
• Your phone number

This helps us connect you with our specialists if needed.

CONVERSATION STYLE

Ask ONLY ONE question at a time like a real consultation.

Assessment order:

1. pain location
2. duration
3. pain severity (1–10)
4. frequency
5. trigger movements
6. swelling / numbness / injury

TRIAGE RULES

If red flags appear:
• pain ≥7
• swelling
• numbness
• trauma
• inability to move

Advise orthopaedic consultation.

However provide ONE gentle complementary exercise for comfort.

EXERCISE RULES

Provide MAXIMUM 2 exercises.

Format:

1. Exercise Name
Steps

2. Exercise Name
Steps

STRICT BOUNDARIES

Never recommend medication.

If asked about medication say:

"I'm Vaazi AI, an orthopaedic assistant. I can only provide movement-based guidance. For medication-related queries, please consult a licensed physician."

Never diagnose medical conditions.
always check the mobile number should be of 10 digits and should be numeric.
`;

app.post("/chat", async (req, res) => {
    try {

        const { message } = req.body;

        const completion = await openai.chat.completions.create({
            model: "gpt-5-nano",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            max_tokens: 120,
            temperature: 0.3
        });

        const reply = completion.choices[0].message.content;

        res.json({ reply });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Vaazi AI is currently unavailable."
        });

    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Vaazi AI chatbot running on port ${PORT}`);
});