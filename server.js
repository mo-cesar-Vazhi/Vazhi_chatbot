
// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const OpenAI = require("openai");
// const { Pool } = require("pg");

// const app = express();

// app.use(cors());
// app.use(express.json({ limit: "50mb" }));
// app.use(express.urlencoded({ limit: "50mb", extended: true }));

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT,
//   ssl: { rejectUnauthorized: false }
// });

// const systemPrompt = `
// You are VAAZI AI, a junior orthopaedic consultation assistant for a licensed orthopaedic organisation.

// Chat Rule
// in the very begining of the converastion display a message to user to type "Hi" or "Hello" to start the consultation. Do not proceed with any questions until user greets you. If user sends any message without greeting, reply with:

// INTRODUCTION

// Begin every new conversation with:

// Hello! I'm Vaazi AI, your orthopaedic assistant. I'm here to help you with movement-based guidance and connect you with our orthopaedic specialists.

// ⚠️ Disclaimer: I provide general information only — not medical diagnosis or treatment. Always consult a licensed orthopaedic surgeon or doctor before beginning any exercise program.

// Before we begin, may I have:
// * Your full name
// * Your phone number

// This helps us connect you with our specialists if needed.

// CONVERSATION STYLE

// Ask ONLY ONE question at a time like a real consultation.

// Assessment order:

// 1. pain location
// 2. duration
// 3. pain severity (1–10)
// 4. frequency
// 5. trigger movements
// 6. swelling / numbness / injury

// TRIAGE RULES

// If red flags appear:
// * pain ≥7
// * swelling
// * numbness
// * trauma
// * inability to move

// Advise orthopaedic consultation.

// However provide ONE gentle complementary exercise for comfort.

// EXERCISE RULES

// Provide MAXIMUM 2 exercises.

// Format:

// 1. Exercise Name
// Steps

// 2. Exercise Name
// Steps

// STRICT BOUNDARIES

// Never recommend medication.

// If asked about medication say:

// "I'm Vaazi AI, an orthopaedic assistant. I can only provide movement-based guidance. For medication-related queries, please consult a licensed physician."

// Never diagnose medical conditions.
// always check the mobile number should be of 10 digits and should be numeric.

// IMAGE HANDLING
// You are a multimodal AI with vision capabilities. YOU CAN SEE IMAGES.
// If the user uploads an image (like a prescription, exercise form, or related document), you MUST analyze it, transcribe its text, read it out, and give a general overview.
// Do not EVER say "I can't recognize or interpret images directly." You have full vision capabilities.
// If it is a prescription, you may read out the written text or general notes, but DO NOT recommend or explain medications.
// Maintain all strict boundaries (no diagnosis, no medication recommendations) even when reading images.

// `;


// async function extractUserDetails(message) {

//   if (!message) return { name: null, phone: null };

//   const response = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     temperature: 0,
//     messages: [
//       {
//         role: "system",
//         content: `
// Extract name and phone number from the text.

// Return JSON only.

// {
// "name":"...",
// "phone":"..."
// }

// If missing return null.
// `
//       },
//       { role: "user", content: message }
//     ]
//   });

//   try {
//     return JSON.parse(response.choices[0].message.content);
//   } catch {
//     return { name: null, phone: null };
//   }
// }

// async function detectImageType(image) {
//   const response = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [
//       {
//         role: "user",
//         content: [
//           { type: "text", text: "Identify the type of this medical image. Return only one word: prescription, xray, report, exercise, or other." },
//           { type: "image_url", image_url: { url: image } }
//         ]
//       }
//     ]
//   });

//   return response.choices[0].message.content.trim().toLowerCase();
// }


// app.get("/", (req, res) => {
//   res.json({ status: "Vaazi AI server running" });
// });


// app.post("/chat", async (req, res) => {

//   try {
//     let { conversation_id, message, image } = req.body;

//     if (!message && !image) {
//       return res.status(400).json({ error: "Provide message or image" });
//     }

//     let user_id = null;

//     if (message) {

//       const extracted = await extractUserDetails(message) || {};
//       const name = extracted.name || null;
//       const phone = extracted.phone || null;

//       // Store name temporarily if phone not given yet
//       if (name && !phone && conversation_id) {
//         await pool.query(
//           "UPDATE conversations SET temp_name=$1 WHERE conversation_id=$2",
//           [name, conversation_id]
//         );
//       }

//       if (phone) {

//         const existingUser = await pool.query(
//           "SELECT user_id FROM users WHERE phone_number=$1",
//           [phone]
//         );

//         if (existingUser.rows.length > 0) {
//           user_id = existingUser.rows[0].user_id;
//         } else {
//           // get stored name from conversation
//           const tempNameRes = await pool.query(
//             "SELECT temp_name FROM conversations WHERE conversation_id=$1",
//             [conversation_id]
//           );

//           const storedName = tempNameRes.rows[0]?.temp_name;
//           const finalName = name || storedName || "Unknown";

//           const newUser = await pool.query(
//             "INSERT INTO users (full_name, phone_number) VALUES ($1,$2) RETURNING user_id",
//             [finalName, phone]
//           );

//           user_id = newUser.rows[0].user_id;

//           await pool.query(
//             "UPDATE conversations SET user_id=$1 WHERE conversation_id=$2",
//             [user_id, conversation_id]
//           );

//           // ✅ CLEAR TEMP NAME AFTER USER IS CREATED
//           await pool.query(
//             "UPDATE conversations SET temp_name=NULL WHERE conversation_id=$1",
//             [conversation_id]
//           );
//         }

//         // If a conversation already exists, link this user_id to it
//         if (conversation_id) {
//           await pool.query(
//             "UPDATE conversations SET user_id=$1 WHERE conversation_id=$2 AND user_id IS NULL",
//             [user_id, conversation_id]
//           );
//         }
//       }
//     }


//     if (!conversation_id) {

//       const convRes = await pool.query(
//         "INSERT INTO conversations (user_id) VALUES ($1) RETURNING conversation_id",
//         [user_id || null]
//       );

//       conversation_id = convRes.rows[0].conversation_id;

//       await pool.query(
//         "INSERT INTO messages (conversation_id, sender_role, message_text) VALUES ($1,$2,$3)",
//         [conversation_id, "system", systemPrompt]
//       );
//     }


//     const historyRes = await pool.query(
//       "SELECT sender_role, message_text FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC",
//       [conversation_id]
//     );

//     const history = historyRes.rows.map(row => ({
//       role: row.sender_role,
//       content: row.message_text
//     }));

//     let imageType = null;

//     if (image && image.startsWith("data:image")) {
//       imageType = await detectImageType(image);
//     }

//     let userContent = [];

//     if (message) {
//       userContent.push({ type: "text", text: message });
//     }

//     if (image) {
//       userContent.push({
//         type: "image_url",
//         image_url: { url: image }
//       });
//     }

//     history.push({
//       role: "user",
//       content: userContent.length === 1 ? userContent[0].text : userContent
//     });


//     const dbMessage =
//       message && message.trim() !== ""
//         ? message
//         : "[Image uploaded]";

//     await pool.query(
//       `INSERT INTO messages 
//       (conversation_id, sender_role, message_text, image_url, image_type)
//       VALUES ($1,$2,$3,$4,$5)`,
//       [conversation_id, "user", dbMessage, image || null, imageType]
//     );


//     let reply;

//     if (image) {
//       const response = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [
//           {
//             role: "system",
//             content: systemPrompt
//           },
//           {
//             role: "user",
//             content: [
//               { type: "text", text: message || "Analyze this image." },
//               { type: "image_url", image_url: { url: image } }
//             ]
//           }
//         ]
//       });

//       reply = response.choices[0].message.content;

//     } else {

//       const completion = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: history,
//         max_tokens: 500
//       });

//       reply = completion.choices[0].message.content;
//     }


//     await pool.query(
//       "INSERT INTO messages (conversation_id, sender_role, message_text) VALUES ($1,$2,$3)",
//       [conversation_id, "assistant", reply]
//     );


//     res.json({
//       reply,
//       conversation_id,
//       image_type: imageType
//     });

//   } catch (error) {

//     console.error("SERVER ERROR:", error);

//     res.status(500).json({
//       error: "Server Error. Please try again."
//     });

//   }

// });


// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Vaazi AI chatbot running on port ${PORT}`);
// });





require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const { Pool } = require("pg");

const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || "vaazi_secret_key_2024";

// ─── JWT MIDDLEWARE ───────────────────────────────────────────────────────────

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied. Please log in." });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token. Please log in again." });
  }
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

function buildSystemPrompt(userName) {
  return `
You are VAAZI AI, a junior orthopaedic consultation assistant for a licensed orthopaedic organisation.

INTRODUCTION

The user is already registered and logged in. Their name is ${userName}. Greet them warmly by name when they say Hi.

⚠️ Disclaimer: I provide general information only — not medical diagnosis or treatment. Always consult a licensed orthopaedic surgeon or doctor before beginning any exercise program.

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
* pain ≥7
* swelling
* numbness
* trauma
* inability to move

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

IMAGE HANDLING
You are a multimodal AI with vision capabilities. YOU CAN SEE IMAGES.
If the user uploads an image (like a prescription, exercise form, or related document), you MUST analyze it, transcribe its text, read it out, and give a general overview.
Do not EVER say "I can't recognize or interpret images directly." You have full vision capabilities.
If it is a prescription, you may read out the written text or general notes, but DO NOT recommend or explain medications.
Maintain all strict boundaries (no diagnosis, no medication recommendations) even when reading images.
`;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function detectImageType(image) {

  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Identify the type of this medical image. Return only one word: prescription, xray, report, exercise, or other."
          },
          {
            type: "input_image",
            image_url: image
          }
        ]
      }
    ]
  });

  return response.output_text.trim().toLowerCase();
}



app.get("/", (req, res) => {
  res.json({ status: "Vaazi AI server running" });
});



app.post("/auth/register", async (req, res) => {
  try {
    const { full_name, phone_number } = req.body;

    if (!full_name || !phone_number) {
      return res.status(400).json({ error: "Full name and phone number are required." });
    }

    if (!/^[0-9]{10}$/.test(phone_number)) {
      return res.status(400).json({ error: "Phone number must be exactly 10 digits." });
    }

    const existing = await pool.query(
      "SELECT user_id, full_name, phone_number FROM users WHERE phone_number=$1",
      [phone_number]
    );

    if (existing.rows.length > 0) {
      // Already registered — just log them in
      const existingUser = existing.rows[0];
      const token = jwt.sign(
        { user_id: existingUser.user_id, full_name: existingUser.full_name, phone_number: existingUser.phone_number },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.status(200).json({
        message: `Welcome back, ${existingUser.full_name}! You are already registered.`,
        token,
        user: { user_id: existingUser.user_id, full_name: existingUser.full_name, phone_number: existingUser.phone_number }
      });
    }

    const result = await pool.query(
      "INSERT INTO users (full_name, phone_number) VALUES ($1,$2) RETURNING user_id, full_name, phone_number",
      [full_name.trim(), phone_number]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { user_id: user.user_id, full_name: user.full_name, phone_number: user.phone_number },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Registration successful!",
      token,
      user: { user_id: user.user_id, full_name: user.full_name, phone_number: user.phone_number }
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ─── AUTH: LOGIN ──────────────────────────────────────────────────────────────

app.post("/auth/login", async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({ error: "Phone number is required." });
    }

    if (!/^[0-9]{10}$/.test(phone_number)) {
      return res.status(400).json({ error: "Phone number must be exactly 10 digits." });
    }

    const result = await pool.query(
      "SELECT user_id, full_name, phone_number FROM users WHERE phone_number=$1",
      [phone_number]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "No account found with this phone number. Please register first." });
    }

    const user = result.rows[0];
    const token = jwt.sign(
      { user_id: user.user_id, full_name: user.full_name, phone_number: user.phone_number },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful!",
      token,
      user: { user_id: user.user_id, full_name: user.full_name, phone_number: user.phone_number }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ─── CHAT ─────────────────────────────────────────────────────────────────────

app.post("/chat", verifyToken, async (req, res) => {
  try {
    let { conversation_id, message, image } = req.body;

    if (!message && !image) {
      return res.status(400).json({ error: "Provide message or image." });
    }

    // User info comes directly from the JWT token (no need to ask the chatbot)
    const { user_id, full_name, phone_number } = req.user;

    const systemPrompt = buildSystemPrompt(full_name);

    // ── New conversation ──────────────────────────────────────────────────────
    if (!conversation_id) {
      const convRes = await pool.query(
        "INSERT INTO conversations (user_id) VALUES ($1) RETURNING conversation_id",
        [user_id]
      );
      conversation_id = convRes.rows[0].conversation_id;

      // Store system prompt
      await pool.query(
        "INSERT INTO messages (conversation_id, sender_role, message_text) VALUES ($1,$2,$3)",
        [conversation_id, "system", systemPrompt]
      );

      // Store greeting as first assistant message
      const greeting = `👋 Type **Hi** to start the conversation!\n\n⚠️ **Disclaimer:** I provide general information only — not medical diagnosis or treatment. Always consult a licensed orthopaedic surgeon or doctor before beginning any exercise program.`;
      await pool.query(
        "INSERT INTO messages (conversation_id, sender_role, message_text) VALUES ($1,$2,$3)",
        [conversation_id, "assistant", greeting]
      );
    }

    // ── Load conversation history ─────────────────────────────────────────────
    const historyRes = await pool.query(
      "SELECT sender_role, message_text FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC",
      [conversation_id]
    );

    const history = historyRes.rows.map(row => ({
      role: row.sender_role,
      content: row.message_text
    }));

    // ── Detect image type ─────────────────────────────────────────────────────
    let imageType = null;
    if (image) {
      imageType = await detectImageType(image);
    }

    // ── Build user content ────────────────────────────────────────────────────
    let userContent = [];
    if (message) userContent.push({ type: "text", text: message });
    if (image) userContent.push({ type: "image_url", image_url: { url: image } });

    history.push({ role: "user", content: userContent });

    // ── Save user message to DB ───────────────────────────────────────────────
    const dbMessage = message && message.trim() !== "" ? message : "[Image uploaded]";
    await pool.query(
      `INSERT INTO messages (conversation_id, sender_role, message_text, image_url, image_type)
       VALUES ($1,$2,$3,$4,$5)`,
      [conversation_id, "user", dbMessage, image || null, imageType]
    );

    // ── Call OpenAI ───────────────────────────────────────────────────────────
    let reply;

    if (image) {

      history.push({
        role: "user",
        content: [
          { type: "text", text: message || "Analyze this image." },
          { type: "image_url", image_url: { url: image } }
        ]
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 500,
        messages: history
      });

      reply = response.choices[0].message.content;
    } else {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 500,
        messages: history
      });
      reply = completion.choices[0].message.content;
    }

    // ── Save assistant reply ──────────────────────────────────────────────────
    await pool.query(
      "INSERT INTO messages (conversation_id, sender_role, message_text) VALUES ($1,$2,$3)",
      [conversation_id, "assistant", reply]
    );

    res.json({ reply, conversation_id, image_type: imageType });

  } catch (error) {
    console.error("CHAT ERROR:", error);
    res.status(500).json({ error: "Server Error. Please try again." });
  }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Vaazi AI chatbot running on port ${PORT}`);
});