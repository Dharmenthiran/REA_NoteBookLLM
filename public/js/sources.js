// sources.js - Document parsing, chunking, indexing & UI management
import { getActiveNotebook, updateActiveNotebook } from './storage.js';

// Chunk a source document into semantic passages (200-400 words) with overlap
export const chunkDocument = (text, chunkSize = 300, overlap = 50) => {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    if (currentWordCount + words.length <= chunkSize) {
      currentChunk.push(para);
      currentWordCount += words.length;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n\n'));
      }
      currentChunk = [para];
      currentWordCount = words.length;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  // Fallback if no paragraphs found
  if (chunks.length === 0 && text.trim().length > 0) {
    const allWords = text.trim().split(/\s+/);
    for (let i = 0; i < allWords.length; i += (chunkSize - overlap)) {
      chunks.push(allWords.slice(i, i + chunkSize).join(' '));
    }
  }

  return chunks;
};

// Compute simple TF-IDF / keyword similarity for local semantic grounding
export const searchGroundedChunks = (query, activeSources, topK = 4) => {
  const queryTerms = query.toLowerCase().match(/\b[a-z0-9_-]{3,}\b/g) || [];
  if (queryTerms.length === 0) return [];

  const candidates = [];

  activeSources.forEach(source => {
    const chunks = chunkDocument(source.content);
    chunks.forEach((chunkText, idx) => {
      const lowerChunk = chunkText.toLowerCase();
      let score = 0;

      queryTerms.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'g');
        const matches = lowerChunk.match(regex);
        if (matches) {
          score += matches.length * 2.5; // Term frequency boost
        } else if (lowerChunk.includes(term)) {
          score += 1.0;
        }
      });

      // Bonus if chunk contains numbers, technical terms, or definitions
      if (score > 0) {
        candidates.push({
          sourceId: source.id,
          sourceTitle: source.title,
          chunkIndex: idx,
          text: chunkText,
          score
        });
      }
    });
  });

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, topK);
};

// Client-side PDF text extraction using PDF.js
export const extractPdfText = async (file) => {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js library is not available');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += `--- Page ${i} ---\n` + pageText + '\n\n';
  }

  return fullText;
};

// Parse uploaded files (.pdf, .txt, .md, .json, .csv)
export const parseUploadedFile = async (file) => {
  const name = file.name;
  const ext = name.split('.').pop().toLowerCase();

  let content = '';
  let type = 'file';

  if (ext === 'pdf') {
    type = 'pdf';
    content = await extractPdfText(file);
  } else if (['txt', 'md', 'markdown'].includes(ext)) {
    type = ext === 'txt' ? 'text' : 'md';
    content = await file.text();
  } else if (ext === 'json') {
    type = 'code';
    const raw = await file.text();
    try {
      const parsed = JSON.parse(raw);
      content = JSON.stringify(parsed, null, 2);
    } catch {
      content = raw;
    }
  } else if (ext === 'csv') {
    type = 'data';
    content = await file.text();
  } else {
    type = 'file';
    content = await file.text();
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const title = name.replace(/\.[^/.]+$/, "");

  return {
    id: 'src-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    title,
    type,
    content,
    wordCount,
    active: true,
    dateAdded: new Date().toISOString()
  };
};

// Render Sources List in the Left Panel
export const renderSourcesList = (onSourceToggle, onSourceDelete, onSourceView) => {
  const notebook = getActiveNotebook();
  const container = document.getElementById('sources-list-container');
  const countBadge = document.getElementById('sources-count-badge');
  const wordCountTotal = document.getElementById('sources-wordcount-total');
  const selectAllToggle = document.getElementById('select-all-sources-toggle');
  const activeCountText = document.getElementById('active-sources-count-text');
  const groundingStatusText = document.getElementById('grounding-status-text');

  if (!container || !notebook) return;

  const sources = notebook.sources || [];
  countBadge.textContent = sources.length;

  const activeSources = sources.filter(s => s.active);
  const totalWords = sources.reduce((acc, s) => acc + (s.wordCount || 0), 0);
  const activeWords = activeSources.reduce((acc, s) => acc + (s.wordCount || 0), 0);

  wordCountTotal.textContent = `${totalWords.toLocaleString()} words total`;
  activeCountText.textContent = `${activeSources.length} of ${sources.length} sources active`;
  groundingStatusText.textContent = `${activeSources.length} Sources Active · ${activeWords.toLocaleString()} Words`;

  selectAllToggle.checked = sources.length > 0 && activeSources.length === sources.length;
  selectAllToggle.indeterminate = activeSources.length > 0 && activeSources.length < sources.length;

  if (sources.length === 0) {
    container.innerHTML = `
      <div class="empty-sources-msg">
        <div class="empty-sources-icon">
          <i data-lucide="folder-open" style="width: 24px; height: 24px;"></i>
        </div>
        <div>No sources uploaded yet</div>
        <button class="primary-btn" id="empty-add-source-btn" style="padding: 6px 14px; font-size: 0.8rem;">
          <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
          <span>Add first source</span>
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    const emptyBtn = document.getElementById('empty-add-source-btn');
    if (emptyBtn) {
      emptyBtn.addEventListener('click', () => {
        document.getElementById('add-source-modal').classList.add('active');
      });
    }
    return;
  }

  container.innerHTML = sources.map(source => {
    let iconName = 'file-text';
    let iconStyle = 'color: var(--accent-cyan-light);';
    if (source.type === 'pdf') iconName = 'file';
    else if (source.type === 'youtube') {
      iconName = 'video';
      iconStyle = 'color: #EF4444;';
    }
    else if (source.type === 'url') iconName = 'globe';
    else if (source.type === 'code') iconName = 'code';
    else if (source.type === 'data') iconName = 'table';

    return `
      <div class="source-card ${source.active ? 'active' : ''}" data-id="${source.id}">
        <div class="source-checkbox-wrap">
          <input type="checkbox" class="source-item-toggle" data-id="${source.id}" ${source.active ? 'checked' : ''}>
        </div>
        <div class="source-icon">
          <i data-lucide="${iconName}" style="width: 16px; height: 16px; ${iconStyle}"></i>
        </div>
        <div class="source-info" title="${source.title}">
          <div class="source-title">${source.title}</div>
          <div class="source-meta">
            <span>${(source.wordCount || 0).toLocaleString()} words</span>
            <span>•</span>
            <span style="text-transform: uppercase; ${source.type === 'youtube' ? 'color: #F87171; font-weight: 600;' : ''}">${source.type}</span>
            ${source.author ? `<span>• ${source.author}</span>` : ''}
          </div>
        </div>
        <div class="source-actions">
          <button class="source-card-btn view-source-btn" data-id="${source.id}" title="View source content">
            <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
          </button>
          <button class="source-card-btn delete-source-btn" data-id="${source.id}" title="Remove source">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();

  // Attach event handlers
  container.querySelectorAll('.source-item-toggle').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      const id = checkbox.getAttribute('data-id');
      onSourceToggle(id, checkbox.checked);
    });
  });

  container.querySelectorAll('.delete-source-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this source?')) {
        onSourceDelete(id);
      }
    });
  });

  container.querySelectorAll('.view-source-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      onSourceView(id);
    });
  });

  container.querySelectorAll('.source-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.source-actions') || e.target.closest('.source-checkbox-wrap')) return;
      const id = card.getAttribute('data-id');
      onSourceView(id);
    });
  });
};
