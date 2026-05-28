import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize standard Gemini SDK client proxy
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please add it via Settings > Secrets panel.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

async function start() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Helper error wrapper
  const handleApiError = (res: express.Response, err: any) => {
    console.error('Gemini Server Proxy Error:', err);
    res.status(500).json({
      error: err.message || 'An unexpected Gemini error occurred.',
      details: 'Check if your Gemini API key is active and correctly set in AI Studio Secrets.',
    });
  };

  // endpoint: rewrite, critique, or outline text
  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      const { text, command, modelSelection } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Source text is required' });
      }

      const client = getGeminiClient();
      const model = modelSelection || 'gemini-3.5-flash';

      let prompt = '';
      if (command === 'summarize') {
        prompt = `Analyze this text and provide an elegant, structured summary with bullet points, capturing all core insights, arguments, and takeaways:\n\n${text}`;
      } else if (command === 'critique') {
        prompt = `Critique this text thoroughly. Detail its strengths, areas for stylistic correction, clarity analysis, and precise paragraphs for improvement:\n\n${text}`;
      } else if (command === 'outline') {
        prompt = `Take this text and structure it into a clean, hierarchical study outline, breaking it down into major concepts and child definitions, perfect for studying:\n\n${text}`;
      } else if (command === 'rewrite-minimal') {
        prompt = `Rewrite this text in a sleek, minimalist, high-impact style, removing any clutter or filler words:\n\n${text}`;
      } else if (command === 'rewrite-academic') {
        prompt = `Rewrite this text in an authoritative, academic, and logically descriptive tone with elegant word choices:\n\n${text}`;
      } else if (command === 'rewrite-creative') {
        prompt = `Rewrite this text in a vivid, creative, and engaging style filled with metaphors and literary flair:\n\n${text}`;
      } else {
        prompt = `${command}\n\nApply this request directly on the following text:\n\n${text}`;
      }

      const response = await client.models.generateContent({
        model,
        contents: prompt,
      });

      res.json({ result: response.text });
    } catch (err) {
      handleApiError(res, err);
    }
  });

  // endpoint: research or fact-check using Google Search grounding
  app.post('/api/gemini/ground', async (req, res) => {
    try {
      const { prompt, contextText } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const client = getGeminiClient();
      const combinedPrompt = contextText 
        ? `Document Context:\n"""\n${contextText}\n"""\n\nQuestion or Fact-Check:\n${prompt}\n\nPlease research the web and answer objectively, referencing specific sources found.`
        : prompt;

      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: combinedPrompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      // Extract sources
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks.map((chunk: any) => ({
        title: chunk.web?.title || 'Web Source',
        uri: chunk.web?.uri || '',
      })).filter((s: any) => s.uri !== '');

      res.json({
        result: response.text,
        sources,
      });
    } catch (err) {
      handleApiError(res, err);
    }
  });

  // endpoint: generate flashcards using structured schema
  app.post('/api/gemini/flashcards', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Source text is required' });
      }

      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Generate a list of high-quality active-recall study flashcards (front and back pairs) from this content. Break down key definitions, processes, or core principles:\n\n${text}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: 'A unique short id (e.g. card_1)' },
                front: { type: Type.STRING, description: 'The question or retrieval prompt to put on the front of the card.' },
                back: { type: Type.STRING, description: 'The precise, clear answer or definition to put on the back.' },
                topic: { type: Type.STRING, description: 'The sub-topic or theme of this flashcard.' }
              },
              required: ['id', 'front', 'back', 'topic'],
            },
          },
        },
      });

      const cards = JSON.parse(response.text || '[]');
      res.json({ cards });
    } catch (err) {
      handleApiError(res, err);
    }
  });

  // endpoint: generate mutiple-choice study quiz questions
  app.post('/api/gemini/quiz', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Source text is required' });
      }

      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Create a 5-question multiple choice conceptual quiz on the following material. Challenge the study user with conceptual questions, NOT trivial lookups. Ensure options are robustly written:\n\n${text}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER, description: '0-based index of the correct option' },
                explanation: { type: Type.STRING, description: 'Detailed, engaging explanation why this option is correct and others are not.' }
              },
              required: ['question', 'options', 'correctIndex', 'explanation'],
            },
          },
        },
      });

      const questions = JSON.parse(response.text || '[]');
      res.json({ questions });
    } catch (err) {
      handleApiError(res, err);
    }
  });

  // endpoint: generate initial concept nodes for the mind-map sandbox
  app.post('/api/gemini/mindmap', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Source text is required' });
      }

      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Analyze this content and extract 4 to 6 main core concepts or themes to place on a spatial mind map. Provide positions (x: 100-500, y: 100-400):\n\n${text}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING, description: 'Sleek, short label (1-3 words) representing the concept' },
                    details: { type: Type.STRING, description: 'A short summary/expansion of this node' },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER }
                  },
                  required: ['id', 'label', 'details', 'x', 'y'],
                }
              },
              connections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    from: { type: Type.STRING },
                    to: { type: Type.STRING }
                  },
                  required: ['from', 'to']
                }
              }
            },
            required: ['nodes', 'connections']
          },
        },
      });

      const mindmap = JSON.parse(response.text || '{"nodes":[],"connections":[]}');
      res.json(mindmap);
    } catch (err) {
      handleApiError(res, err);
    }
  });

  // endpoint: expand specific node with sub-concepts
  app.post('/api/gemini/mindmap/expand', async (req, res) => {
    try {
      const { concept, currentNodesCount } = req.body;
      if (!concept) {
        return res.status(400).json({ error: 'Concept name is required' });
      }

      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Generate exactly 3 child concepts expanding on "${concept}". Assign them simple coordinates around the parent node.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: 'Short child concept name (1-3 words)' },
                details: { type: Type.STRING, description: 'Brief expansion explaining its connection' },
                offsetX: { type: Type.NUMBER, description: 'Relative x offset from parent node, range [-120 to 120]' },
                offsetY: { type: Type.NUMBER, description: 'Relative y offset from parent node, range [-120 to 120]' }
              },
              required: ['label', 'details', 'offsetX', 'offsetY']
            }
          }
        }
      });

      const children = JSON.parse(response.text || '[]');
      res.json({ children });
    } catch (err) {
      handleApiError(res, err);
    }
  });

  // endpoint: text-to-speech with Kore/Puck/Fenrir/Zephyr models
  app.post('/api/gemini/tts', async (req, res) => {
    try {
      const { text, voice } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text to speak is required' });
      }

      const client = getGeminiClient();
      const selectedVoice = voice || 'Zephyr';

      const response = await client.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(500).json({ error: 'No audio generated by the model' });
      }

      res.json({ audio: base64Audio });
    } catch (err) {
      handleApiError(res, err);
    }
  });

  // Express serves compiled Vite app in Production, otherwise mounts Vite dev server in middlewareMode
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production serving from built files
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server launched successfully on port ${port}`);
  });
}

start().catch((err) => {
  console.error('Fatal initialization error:', err);
});
