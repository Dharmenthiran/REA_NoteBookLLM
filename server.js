const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

const { YoutubeTranscript } = require('youtube-transcript');

function extractYoutubeVideoId(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1).split('?')[0];
    }
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') || (u.pathname.startsWith('/shorts/') ? u.pathname.split('/')[2] : null);
    }
  } catch {}
  return null;
}

function formatTimestamp(offsetSeconds) {
  const m = Math.floor(offsetSeconds / 60);
  const s = Math.floor(offsetSeconds % 60);
  return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`;
}

// URL scraper endpoint to ingest web articles and YouTube transcripts as sources
app.post('/api/fetch-url', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Only http and https URLs are supported' });
    }

    // 1. CHECK IF THIS IS A YOUTUBE VIDEO URL
    const ytVideoId = extractYoutubeVideoId(url);
    if (ytVideoId) {
      console.log(`[YouTube Ingestion] Detected video ID: ${ytVideoId}`);
      
      // Fetch oEmbed metadata for title & author
      let videoTitle = `YouTube Video (${ytVideoId})`;
      let authorName = 'YouTube Creator';
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytVideoId}&format=json`);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          videoTitle = oembedData.title || videoTitle;
          authorName = oembedData.author_name || authorName;
        }
      } catch (e) {
        console.warn('oEmbed fetch error:', e.message);
      }

      // Fetch transcript using YoutubeTranscript
      try {
        const transcriptCues = await YoutubeTranscript.fetchTranscript(url);
        if (transcriptCues && transcriptCues.length > 0) {
          // Format transcript cues into readable paragraphs with timestamps
          let formattedContent = `# 🎬 ${videoTitle}\n`;
          formattedContent += `**Channel / Creator**: ${authorName}\n`;
          formattedContent += `**Source URL**: ${url}\n`;
          formattedContent += `**Total Spoken Cues**: ${transcriptCues.length}\n\n`;
          formattedContent += `## 📜 Full Spoken Video Transcript (Timestamped)\n\n`;

          let currentTimestamp = '';
          let currentGroup = [];

          for (const cue of transcriptCues) {
            const offsetSec = Math.floor(cue.offset / 1000);
            const ts = formatTimestamp(offsetSec);
            if (!currentTimestamp) currentTimestamp = ts;
            currentGroup.push(cue.text.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'));

            if (currentGroup.join(' ').split(/\s+/).length >= 45) {
              formattedContent += `${currentTimestamp} ${currentGroup.join(' ')}\n\n`;
              currentGroup = [];
              currentTimestamp = '';
            }
          }

          if (currentGroup.length > 0) {
            formattedContent += `${currentTimestamp || '[00:00]'} ${currentGroup.join(' ')}\n\n`;
          }

          const wordCount = formattedContent.split(/\s+/).filter(Boolean).length;
          console.log(`[YouTube Ingestion] Successfully extracted ${transcriptCues.length} cues (${wordCount} words) for: ${videoTitle}`);

          return res.json({
            title: videoTitle,
            url,
            content: formattedContent,
            wordCount,
            type: 'youtube',
            author: authorName,
            videoId: ytVideoId
          });
        }
      } catch (ytErr) {
        console.warn(`[YouTube Ingestion] Transcript extraction failed: ${ytErr.message}`);
        // If automatic caption extraction fails, fetch page description
      }
    }

    // 2. STANDARD WEB PAGE INGESTION
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch URL: HTTP ${response.status}` });
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;

    // Strip scripts, styles, navigation, footer, and SVG
    let cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Limit text length to reasonable size
    if (cleanText.length > 50000) {
      cleanText = cleanText.substring(0, 50000) + '... [Content truncated]';
    }

    return res.json({
      title,
      url,
      content: cleanText,
      wordCount: cleanText.split(/\s+/).filter(Boolean).length,
      type: 'url'
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to fetch URL content: ${err.message}` });
  }
});

// Proxy endpoint for external LLM APIs (Gemini / OpenAI) if users prefer routing through backend
app.post('/api/llm-proxy', async (req, res) => {
  const { provider, apiKey, model, messages, systemPrompt, temperature } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    if (provider === 'gemini') {
      const geminiModel = model || 'gemini-1.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

      const contents = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const body = {
        contents,
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        generationConfig: {
          temperature: temperature ?? 0.7,
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return res.json({ reply });
    } else if (provider === 'openai') {
      const openaiModel = model || 'gpt-4o-mini';
      const endpoint = 'https://api.openai.com/v1/chat/completions';

      const formattedMessages = [];
      if (systemPrompt) {
        formattedMessages.push({ role: 'system', content: systemPrompt });
      }
      formattedMessages.push(...messages);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: formattedMessages,
          temperature: temperature ?? 0.7
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      const reply = data.choices?.[0]?.message?.content || '';
      return res.json({ reply });
    } else {
      return res.status(400).json({ error: 'Unsupported provider' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Fallback all routes to index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  NotebookLM Rebuild (Aetheria Notebook) running!`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`=================================================`);
});
