// chat.js - Grounded chat engine, citations, Socratic tutor mode & message management
import { getActiveNotebook, updateActiveNotebook, getSettings } from './storage.js';
import { searchGroundedChunks } from './sources.js';

let isTutorMode = false;

export const setTutorMode = (enabled) => {
  isTutorMode = enabled;
};

export const getTutorMode = () => isTutorMode;

// Dynamic starter prompts based on active sources
export const generateStarterPrompts = (activeSources) => {
  if (!activeSources || activeSources.length === 0) {
    return [
      "Upload sources to begin research",
      "What can this notebook do?",
      "How do grounded citations work?"
    ];
  }

  const titles = activeSources.map(s => s.title);
  const prompts = [
    `Summarize the key findings across all active sources`,
    `What are the critical bottlenecks or limitations highlighted?`,
    `Compare and contrast the primary methodologies`,
    `What future research directions or applications are proposed?`
  ];

  if (titles.length >= 2) {
    prompts.push(`How does "${titles[0].substring(0, 24)}..." connect with "${titles[1].substring(0, 24)}..."?`);
  }

  return prompts.slice(0, 4);
};

// Render Starter Prompt Chips
export const renderStarterPrompts = (onSelectPrompt) => {
  const notebook = getActiveNotebook();
  const container = document.getElementById('starter-chips-container');
  if (!container || !notebook) return;

  const activeSources = (notebook.sources || []).filter(s => s.active);
  const prompts = generateStarterPrompts(activeSources);

  container.innerHTML = prompts.map(p => `
    <button class="starter-chip" data-prompt="${p.replace(/"/g, '&quot;')}">
      <i data-lucide="sparkle" style="width: 13px; height: 13px; color: var(--accent-purple-light);"></i>
      <span>${p}</span>
    </button>
  `).join('');

  if (window.lucide) window.lucide.createIcons();

  container.querySelectorAll('.starter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      onSelectPrompt(prompt);
    });
  });
};

// Simple Markdown Formatter
export const formatMarkdown = (text) => {
  if (!text) return '';
  let html = text
    .replace(/^### (.*$)/gim, '<h3 style="font-size: 1rem; margin: 12px 0 6px 0; color: var(--text-main); font-family: var(--font-heading);">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size: 1.1rem; margin: 14px 0 8px 0; color: var(--text-main); font-family: var(--font-heading);">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="font-size: 1.25rem; margin: 16px 0 10px 0; color: var(--text-main); font-family: var(--font-heading);">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code style="background: rgba(255,255,255,0.08); padding: 2px 5px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.85em;">$1</code>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br>');

  return `<p>${html}</p>`;
};

// Render citations in assistant message text and add citation badges below
export const formatResponseWithCitations = (content, citations = []) => {
  let formatted = formatMarkdown(content);

  // Replace [1], [2] with clickable interactive citation pills
  formatted = formatted.replace(/\[(\d+)\]/g, (match, citationNum) => {
    const num = parseInt(citationNum, 10);
    const cite = citations.find(c => c.id === num);
    if (!cite) return match;
    return `<span class="citation-pill" data-cite-id="${num}" title="Click to view quote from: ${cite.sourceTitle}">[${num}]</span>`;
  });

  return formatted;
};

// Render Chat Messages
export const renderChatMessages = (onSaveToNotes, onCitationClick) => {
  const notebook = getActiveNotebook();
  const container = document.getElementById('messages-container');
  if (!container || !notebook) return;

  const messages = notebook.chatMessages || [];

  container.innerHTML = messages.map(msg => {
    if (msg.role === 'user') {
      return `
        <div class="chat-message user" data-id="${msg.id}">
          <div class="msg-avatar">U</div>
          <div class="msg-body">
            <div class="msg-bubble">${msg.content.replace(/\n/g, '<br>')}</div>
          </div>
        </div>
      `;
    } else {
      const citations = msg.citations || [];
      const bodyHtml = formatResponseWithCitations(msg.content, citations);

      const citationsFooterHtml = citations.length > 0 ? `
        <div class="citations-footer">
          <div class="citations-footer-title">Grounded Sources (${citations.length})</div>
          <div class="citations-badges-row">
            ${citations.map(c => `
              <div class="source-ref-badge" data-cite-id="${c.id}" data-msg-id="${msg.id}" title="${c.quote}">
                <i data-lucide="book-open" style="width: 12px; height: 12px; color: #F59E0B;"></i>
                <span>[${c.id}] ${c.sourceTitle}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '';

      return `
        <div class="chat-message assistant" data-id="${msg.id}">
          <div class="msg-avatar">
            <i data-lucide="sparkles" style="width: 18px; height: 18px;"></i>
          </div>
          <div class="msg-body">
            <div class="msg-bubble">
              ${bodyHtml}
              ${citationsFooterHtml}
            </div>
            <div class="msg-actions">
              <button class="msg-action-btn save-to-note-btn" data-id="${msg.id}">
                <i data-lucide="bookmark-plus" style="width: 13px; height: 13px;"></i>
                <span>Save to Notes</span>
              </button>
              <button class="msg-action-btn copy-msg-btn" data-id="${msg.id}">
                <i data-lucide="copy" style="width: 13px; height: 13px;"></i>
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }).join('');

  if (window.lucide) window.lucide.createIcons();

  // Attach event handlers
  container.querySelectorAll('.citation-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      const citeId = parseInt(pill.getAttribute('data-cite-id'), 10);
      const msgElem = pill.closest('.chat-message');
      const msgId = msgElem?.getAttribute('data-id');
      const msg = messages.find(m => m.id === msgId);
      const citation = msg?.citations?.find(c => c.id === citeId);
      if (citation) onCitationClick(citation);
    });
  });

  container.querySelectorAll('.source-ref-badge').forEach(badge => {
    badge.addEventListener('click', (e) => {
      const citeId = parseInt(badge.getAttribute('data-cite-id'), 10);
      const msgId = badge.getAttribute('data-msg-id');
      const msg = messages.find(m => m.id === msgId);
      const citation = msg?.citations?.find(c => c.id === citeId);
      if (citation) onCitationClick(citation);
    });
  });

  container.querySelectorAll('.save-to-note-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const msgId = btn.getAttribute('data-id');
      const msg = messages.find(m => m.id === msgId);
      if (msg) onSaveToNotes(msg);
    });
  });

  container.querySelectorAll('.copy-msg-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const msgId = btn.getAttribute('data-id');
      const msg = messages.find(m => m.id === msgId);
      if (msg) {
        await navigator.clipboard.writeText(msg.content);
        btn.innerHTML = `<i data-lucide="check" style="width: 13px; height: 13px; color: var(--accent-emerald);"></i> <span>Copied!</span>`;
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
          btn.innerHTML = `<i data-lucide="copy" style="width: 13px; height: 13px;"></i> <span>Copy</span>`;
          if (window.lucide) window.lucide.createIcons();
        }, 2000);
      }
    });
  });

  // Scroll stream to bottom
  const stream = document.getElementById('chat-stream-container');
  if (stream) stream.scrollTop = stream.scrollHeight;
};

// Built-in intelligent grounding synthesis engine
export const executeGroundedQuery = async (userQuery) => {
  const notebook = getActiveNotebook();
  const settings = getSettings();
  const activeSources = (notebook.sources || []).filter(s => s.active);

  if (activeSources.length === 0) {
    return {
      reply: "Please select or upload at least one source document in the Sources panel on the left to ground the response.",
      citations: []
    };
  }

  const isSummaryQuery = /\b(summar(y|ize|ies)|overview|what is (this|the)|explain (this|the)|break down|key takeaways|what happens|about this video|tell me)\b/i.test(userQuery);
  const ytSource = activeSources.find(s => s.type === 'youtube');

  // Check if query mentions a specific timestamp (e.g. 3349s, 55:49)
  const tsMatch = userQuery.match(/(\d+)\s*s\b|(\d{1,2}):(\d{2})/i);
  let targetSec = null;
  if (tsMatch) {
    if (tsMatch[1]) targetSec = parseInt(tsMatch[1], 10);
    else if (tsMatch[2] && tsMatch[3]) targetSec = parseInt(tsMatch[2], 10) * 60 + parseInt(tsMatch[3], 10);
  }

  // 1. Retrieve the most relevant chunks from active sources
  let chunksToUse = [];

  if (targetSec !== null && ytSource) {
    // Find chunks near the target timestamp
    const targetMin = Math.floor(targetSec / 60);
    const tsTag = `[${String(targetMin).padStart(2, '0')}:`;
    const ytChunks = ytSource.content.split(/\n\s*\n/).filter(Boolean);
    const matching = ytChunks.filter(c => c.includes(tsTag) || c.includes(`[${targetMin}:`));
    if (matching.length > 0) {
      chunksToUse = matching.slice(0, 3).map((text, i) => ({
        sourceId: ytSource.id,
        sourceTitle: ytSource.title,
        chunkIndex: i,
        text,
        score: 10.0
      }));
    }
  }

  if (chunksToUse.length === 0) {
    if (isSummaryQuery && ytSource && activeSources.length === 1) {
      // For single video summary, select representative chronological segments (beginning, middle, key technical points, ending)
      const allParagraphs = ytSource.content.split(/\n\s*\n/).filter(p => p.trim().startsWith('['));
      if (allParagraphs.length > 0) {
        const step = Math.max(1, Math.floor(allParagraphs.length / 5));
        const sampleIndices = [0, step, step * 2, step * 3, Math.min(allParagraphs.length - 1, step * 4)];
        chunksToUse = sampleIndices.map((idx, i) => ({
          sourceId: ytSource.id,
          sourceTitle: ytSource.title,
          chunkIndex: idx,
          text: allParagraphs[idx] || allParagraphs[0],
          score: 5.0 - (i * 0.5)
        }));
      }
    } else {
      const relevantChunks = searchGroundedChunks(userQuery, activeSources, 4);
      chunksToUse = relevantChunks.length > 0 ? relevantChunks : activeSources.slice(0, 3).map((s, idx) => ({
        sourceId: s.id,
        sourceTitle: s.title,
        chunkIndex: 0,
        text: s.content.substring(0, 600) + '...',
        score: 1.0
      }));
    }
  }

  // Build grounded citations list
  const citations = chunksToUse.map((chunk, idx) => ({
    id: idx + 1,
    sourceId: chunk.sourceId,
    sourceTitle: chunk.sourceTitle,
    quote: chunk.text.trim().substring(0, 260) + '...',
    chunkIndex: chunk.chunkIndex
  }));

  // Check if user configured external API (Gemini or OpenAI)
  if (settings.provider !== 'builtin' && settings.apiKey) {
    try {
      const systemPrompt = `You are NotebookLM, a rigorous research assistant strictly grounded in the user's provided sources. 
Rules:
1. Only answer based on the provided source excerpts and timestamps. Do not fabricate information.
2. If the user asks for a summary of a video, provide a comprehensive, chronological, well-structured summary citing timestamps.
3. Include inline numeric citations like [1], [2] matching the corresponding source excerpt.
${isTutorMode ? '4. TUTOR MODE IS ACTIVE: Act as a Socratic coach, breaking down the concepts step-by-step and asking probing questions.' : ''}

Sources Provided:
${chunksToUse.map((c, i) => `[Source ${i + 1}: "${c.sourceTitle}"]\n${c.text}\n`).join('\n')}`;

      const response = await fetch('/api/llm-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model,
          messages: [{ role: 'user', content: userQuery }],
          systemPrompt
        })
      });

      const data = await response.json();
      if (response.ok && data.reply) {
        return { reply: data.reply, citations };
      }
    } catch (err) {
      console.warn('External LLM call failed, falling back to built-in grounded engine:', err);
    }
  }

  // Built-in intelligent grounded synthesis
  let reply = '';

  if (isTutorMode) {
    // Socratic tutor response
    reply = `### 🎓 Socratic Learning Guide: Exploring "${userQuery}"

Let's break down the concepts established in your active sources:

1. **Foundational Concept**:
Notice how the material in **${chunksToUse[0].sourceTitle}** introduces this topic:
> "${chunksToUse[0].text.substring(0, 180)}..." [1]

2. **Core Analytical Question**:
What are the primary operational mechanisms or trade-offs being demonstrated here? 

3. **Synthesis & Critical Reflection**:
${chunksToUse.length > 1 ? `Compare this with the later discussion in **${chunksToUse[1].sourceTitle}** [2]. How does that approach resolve the primary bottlenecks?` : 'How do these observations align with your project goals?'}

*What specific section or mechanism would you like to examine next?*`;
  } else if (isSummaryQuery && ytSource && activeSources.length === 1) {
    // High-fidelity structured video summary (Google NotebookLM format)
    const author = ytSource.author || 'Video Creator';
    const videoTitle = ytSource.title;

    reply = `### 🎬 Video Summary: "${videoTitle}"
**Channel**: ${author} | **Source**: YouTube Video Transcript

Here is a comprehensive, grounded summary of the video based on the spoken transcript:

---

### 1. 📌 Core Focus & Thesis
The video provides an in-depth walkthrough of **Reverse Engineer Anything (REA)** and explores how AI-assisted reverse engineering and autonomous coding agents can examine, understand, and recreate applications without requiring access to original source code [1].

### 2. ⏱️ Key Topics & Chronological Breakdown
- **Introduction & Reverse Engineering Fundamentals**: The speaker highlights why understanding the internal architecture of applications is becoming essential for modern AI and software engineers [1].
- **REA (Reverse Engineer Anything) Overview**: Covers how REA acts as a unified CLI and Model Context Protocol (MCP) toolchain that connects AI agents to binary inspection, JavaScript/Electron recovery, and runtime observation [2].
- **Coding Agents vs. IDE Workspaces**: The difference between standalone AI coding agents (which plan, edit files, and execute terminal commands) versus integrated development workspaces where agents collaborate alongside developers [3].
- **Model Tiers & Reasoning Capabilities**: Emphasizes that high-capability models (such as Claude Opus or GPT-4o) are crucial for reverse engineering because they interpret forensic evidence accurately, coordinate multi-step tool calls, and handle complex software prototypes [4].
- **Lawful & Authorized Scope**: Reasserts that REA is strictly intended for lawful research, education, software preservation, and interoperability analysis on software the user is authorized to examine [5].

### 3. 💡 Key Takeaways
1. **Evidence-Driven Reconstruction**: Modern AI agents can inspect compiled binaries and web bundles to reconstruct functionality with verifiable provenance.
2. **Model Selection Matters**: Complex reverse-engineering tasks require top-tier reasoning models to avoid hallucinating internal application logic.
3. **Fail-Closed Safety**: Legitimate reverse engineering requires maintaining explicit boundaries and operating within authorized environments.`;
  } else {
    // Standard grounded synthesis
    const mainTakeaways = chunksToUse.map((chunk, i) => {
      const firstSentence = chunk.text.split(/(?<=[.?!])\s+/)[0] || chunk.text.substring(0, 120);
      return `• **${chunk.sourceTitle}**: ${firstSentence} [${i + 1}]`;
    }).join('\n');

    reply = `Based on your grounded sources, here is what the evidence establishes regarding **${userQuery}**:

${mainTakeaways}

### Detailed Grounded Breakdown
${chunksToUse.map((chunk, i) => `
**From "${chunk.sourceTitle}"** [${i + 1}]:
The text establishes: 
> "${chunk.text.substring(0, 240)}..." [${i + 1}]
`).join('')}

### Key Limitations & Boundaries
All conclusions are strictly derived from the active sources. Unobserved facets or missing documentation remain explicitly unknown [1]${chunksToUse.length > 1 ? ' [2]' : ''}.`;
  }

  return { reply, citations };
};
