// app.js - Main Application Coordinator for Aetheria NotebookLM Rebuild
import { 
  getAppData, 
  saveAppData, 
  getActiveNotebook, 
  updateActiveNotebook, 
  getSettings, 
  saveSettings 
} from './storage.js';

import { 
  renderSourcesList, 
  parseUploadedFile 
} from './sources.js';

import { 
  renderStarterPrompts, 
  renderChatMessages, 
  executeGroundedQuery, 
  setTutorMode, 
  getTutorMode 
} from './chat.js';

import { 
  initVoices, 
  renderTranscript, 
  toggleAudioPlayback, 
  skipAudio, 
  setPlaybackSpeed, 
  generateAudioOverview,
  generateStudyGuide, 
  generateBriefingDoc, 
  generateFAQ, 
  generateTimeline, 
  generateMindMap 
} from './studio.js';

import { 
  renderNotesList, 
  exportNotebookToMarkdown 
} from './notes.js';

// Pre-packaged research samples
const SAMPLE_DOCS = {
  'neuro-1': {
    title: 'Neuromorphic Computing Architecture (MIT CSAIL)',
    type: 'pdf',
    content: `Neuromorphic computing fundamentally shifts processing from digital boolean logic gates to physical state dynamics modeled after biological neural networks. In this paper, we evaluate event-based spike processing across 128 million artificial synapses implemented with phase-change memristors. The system demonstrates a 480x energy improvement over traditional tensor cores for video semantic segmentation. By leveraging sparse spike coding where activations are represented by microsecond-scale pulse intervals, quiescent dynamic power dissipation is reduced to 0.4 microwatts.`
  },
  'quantum-2': {
    title: 'Topological Quantum Error Correction (Nature)',
    type: 'pdf',
    content: `Fault-tolerant quantum computation requires active error correction schemes capable of overcoming environmental decoherence. Surface codes with a distance d=5 were deployed across a 49-qubit superconducting transmon processor. Using real-time minimum-weight perfect matching (MWPM) decoders operating on an adjacent cryogenic FPGA, logical errors were suppressed below the physical fault threshold of 0.75%. Majorana zero mode non-Abelian anyon braids offer a path to intrinsically hardware-protected logical qubits with 50x lower physical overhead.`
  },
  'synthetic-3': {
    title: 'Bio-Hybrid Organic Synapses in Robotics',
    type: 'url',
    content: `Organic electrochemical transistors (OECTs) utilizing PEDOT:PSS polymers enable seamless ionic-to-electronic signal transduction directly within biological electrolytes. Soft biomimetic robotic hands equipped with OECT artificial synapses demonstrated associative learning and autonomous tactile pressure reflex with a latency of only 3.8 milliseconds. When grasped objects slip, local neurotransmitter-mediated impedance shifts immediately increase mechanical grasping compliance without routing signals through cloud servers.`
  }
};

// Application State
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

const initApp = () => {
  if (window.lucide) window.lucide.createIcons();
  initVoices();
  applySavedTheme();
  updateNotebookHeader();
  refreshAllPanels();
  bindEventListeners();
};

const applySavedTheme = () => {
  const settings = getSettings();
  const theme = settings.theme || 'oceanic';
  document.documentElement.setAttribute('data-theme', theme);
  const themeSelect = document.getElementById('theme-selector-nav');
  if (themeSelect) themeSelect.value = theme;
};

const updateNotebookHeader = () => {
  const notebook = getActiveNotebook();
  const titleElem = document.getElementById('current-notebook-title');
  if (notebook && titleElem) {
    titleElem.textContent = notebook.title;
  }
};

const refreshAllPanels = () => {
  const notebook = getActiveNotebook();
  if (!notebook) return;

  // 1. Sources Panel
  renderSourcesList(
    (id, active) => {
      updateActiveNotebook(nb => {
        const src = nb.sources.find(s => s.id === id);
        if (src) src.active = active;
      });
      refreshAllPanels();
    },
    (id) => {
      updateActiveNotebook(nb => {
        nb.sources = nb.sources.filter(s => s.id !== id);
      });
      refreshAllPanels();
    },
    (id) => {
      openSourceViewer(id);
    }
  );

  // 2. Chat Panel
  renderStarterPrompts((prompt) => {
    const input = document.getElementById('chat-input-textarea');
    if (input) {
      input.value = prompt;
      submitUserQuery();
    }
  });

  renderChatMessages(
    (msg) => {
      // Save message to notes
      updateActiveNotebook(nb => {
        nb.notes.push({
          id: 'note-' + Date.now(),
          title: `Synthesis: ${msg.content.substring(0, 32)}...`,
          content: msg.content,
          pinned: false,
          date: new Date().toISOString()
        });
      });
      renderNotesList(onDeleteNote, onTogglePin, onConvertToSource);
      alert('Response saved to your Notes tab!');
    },
    (citation) => {
      openCitationInspector(citation);
    }
  );

  // 3. Studio Panel
  if (notebook.audioPodcast?.transcript) {
    renderTranscript(notebook.audioPodcast.transcript, 0);
  }

  // 4. Notes Panel
  renderNotesList(onDeleteNote, onTogglePin, onConvertToSource);
};

// Notes handlers
const onDeleteNote = (id) => {
  updateActiveNotebook(nb => {
    nb.notes = nb.notes.filter(n => n.id !== id);
  });
  renderNotesList(onDeleteNote, onTogglePin, onConvertToSource);
};

const onTogglePin = (id) => {
  updateActiveNotebook(nb => {
    const note = nb.notes.find(n => n.id === id);
    if (note) note.pinned = !note.pinned;
  });
  renderNotesList(onDeleteNote, onTogglePin, onConvertToSource);
};

const onConvertToSource = (id) => {
  const notebook = getActiveNotebook();
  const note = notebook.notes.find(n => n.id === id);
  if (!note) return;

  updateActiveNotebook(nb => {
    nb.sources.push({
      id: 'src-from-note-' + Date.now(),
      title: `Note: ${note.title}`,
      type: 'text',
      content: note.content,
      wordCount: note.content.split(/\s+/).filter(Boolean).length,
      active: true,
      dateAdded: new Date().toISOString()
    });
  });

  refreshAllPanels();
  alert(`Note "${note.title}" converted into an active grounded source!`);
};

// Source Viewer Drawer
const openSourceViewer = (sourceId) => {
  const notebook = getActiveNotebook();
  const source = notebook.sources.find(s => s.id === sourceId);
  if (!source) return;

  const modal = document.getElementById('source-viewer-modal');
  const title = document.getElementById('source-viewer-title');
  const meta = document.getElementById('source-viewer-meta');
  const content = document.getElementById('source-viewer-content');

  title.textContent = source.title;
  meta.textContent = `${(source.wordCount || 0).toLocaleString()} words · Added ${new Date(source.dateAdded).toLocaleDateString()} · ${source.type.toUpperCase()}`;
  content.textContent = source.content;

  modal.classList.add('active');
};

// Citation Inspector Drawer
const openCitationInspector = (citation) => {
  const drawer = document.getElementById('citation-inspector-drawer');
  const sourceName = document.getElementById('citation-source-name');
  const quoteBox = document.getElementById('citation-quote-box');
  const locationText = document.getElementById('citation-location-text');
  const openFullBtn = document.getElementById('citation-open-full-source-btn');

  sourceName.textContent = citation.sourceTitle;
  quoteBox.textContent = `"${citation.quote}"`;
  locationText.textContent = `Citation [${citation.id}] · Chunk #${citation.chunkIndex + 1}`;

  openFullBtn.onclick = () => {
    drawer.classList.remove('active');
    openSourceViewer(citation.sourceId);
  };

  drawer.classList.add('active');
};

// Send Chat Query
const submitUserQuery = async () => {
  const textarea = document.getElementById('chat-input-textarea');
  const sendBtn = document.getElementById('chat-send-btn');
  const query = textarea.value.trim();
  if (!query) return;

  textarea.value = '';
  textarea.style.height = 'auto';
  sendBtn.disabled = true;

  // Add user message to conversation
  const userMsg = {
    id: 'msg-' + Date.now(),
    role: 'user',
    content: query
  };

  updateActiveNotebook(nb => {
    nb.chatMessages.push(userMsg);
  });

  renderChatMessages(
    (msg) => {},
    (citation) => openCitationInspector(citation)
  );

  // Show typing indicator in UI
  const streamContainer = document.getElementById('chat-stream-container');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message assistant';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <div class="msg-avatar"><i data-lucide="sparkles" style="width: 18px; height: 18px;"></i></div>
    <div class="msg-body">
      <div class="msg-bubble" style="display: flex; align-items: center; gap: 8px; color: var(--accent-purple-light);">
        <span class="pulse-dot"></span>
        <span>Synthesizing active sources and cross-referencing citations...</span>
      </div>
    </div>
  `;
  document.getElementById('messages-container').appendChild(typingDiv);
  if (window.lucide) window.lucide.createIcons();
  streamContainer.scrollTop = streamContainer.scrollHeight;

  // Synthesize answer
  try {
    const { reply, citations } = await executeGroundedQuery(query);

    // Remove typing indicator
    const typingElem = document.getElementById('typing-indicator');
    if (typingElem) typingElem.remove();

    // Add assistant response
    const assistantMsg = {
      id: 'msg-' + Date.now(),
      role: 'assistant',
      content: reply,
      citations
    };

    updateActiveNotebook(nb => {
      nb.chatMessages.push(assistantMsg);
    });

    renderChatMessages(
      (msg) => {},
      (citation) => openCitationInspector(citation)
    );
  } catch (err) {
    console.error('Synthesis error:', err);
    const typingElem = document.getElementById('typing-indicator');
    if (typingElem) typingElem.remove();
  } finally {
    sendBtn.disabled = false;
  }
};

// Bind Event Listeners
const bindEventListeners = () => {
  // Theme palette switcher
  const themeSelect = document.getElementById('theme-selector-nav');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      const selectedTheme = e.target.value;
      document.documentElement.setAttribute('data-theme', selectedTheme);
      const settings = getSettings();
      settings.theme = selectedTheme;
      saveSettings(settings);
    });
  }

  // Chat input auto-grow & send
  const textarea = document.getElementById('chat-input-textarea');
  const sendBtn = document.getElementById('chat-send-btn');

  if (textarea) {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
      sendBtn.disabled = textarea.value.trim().length === 0;
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitUserQuery();
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', submitUserQuery);
  }

  // Tutor Mode Toggle
  const tutorToggle = document.getElementById('tutor-mode-toggle');
  if (tutorToggle) {
    tutorToggle.addEventListener('click', () => {
      const active = !getTutorMode();
      setTutorMode(active);
      tutorToggle.classList.toggle('active', active);
      const hint = document.getElementById('citation-hint-text');
      if (hint) {
        hint.textContent = active 
          ? '🎓 Learning Guide Mode: Socratic step-by-step coaching' 
          : 'Responses include exact clickable citations [1]';
      }
    });
  }

  // Right Panel Tabs (Studio vs Notes)
  const tabStudioBtn = document.getElementById('tab-studio-btn');
  const tabNotesBtn = document.getElementById('tab-notes-btn');
  const studioContent = document.getElementById('studio-tab-content');
  const notesContent = document.getElementById('notes-tab-content');

  tabStudioBtn.addEventListener('click', () => {
    tabStudioBtn.classList.add('active');
    tabNotesBtn.classList.remove('active');
    studioContent.classList.add('active');
    notesContent.classList.remove('active');
  });

  tabNotesBtn.addEventListener('click', () => {
    tabNotesBtn.classList.add('active');
    tabStudioBtn.classList.remove('active');
    notesContent.classList.add('active');
    studioContent.classList.remove('active');
  });

  // Audio Overview Player Controls
  const playBtn = document.getElementById('audio-play-btn');
  const rewindBtn = document.getElementById('audio-rewind-btn');
  const forwardBtn = document.getElementById('audio-forward-btn');
  const speedSelect = document.getElementById('audio-speed-select');
  const regenAudioBtn = document.getElementById('generate-custom-audio-btn');

  if (playBtn) playBtn.addEventListener('click', toggleAudioPlayback);
  if (rewindBtn) rewindBtn.addEventListener('click', () => skipAudio(-15));
  if (forwardBtn) forwardBtn.addEventListener('click', () => skipAudio(15));
  if (speedSelect) {
    speedSelect.addEventListener('change', (e) => setPlaybackSpeed(e.target.value));
  }
  if (regenAudioBtn) {
    regenAudioBtn.addEventListener('click', () => {
      const focus = document.getElementById('audio-custom-focus-input').value.trim();
      generateAudioOverview(focus);
    });
  }

  // Studio Artifact Generators
  document.getElementById('btn-gen-study-guide').addEventListener('click', () => {
    generateStudyGuide((title, content) => saveArtifactToNote(title, content));
  });

  document.getElementById('btn-gen-briefing').addEventListener('click', () => {
    generateBriefingDoc((title, content) => saveArtifactToNote(title, content));
  });

  document.getElementById('btn-gen-faq').addEventListener('click', () => {
    generateFAQ((title, content) => saveArtifactToNote(title, content));
  });

  document.getElementById('btn-gen-timeline').addEventListener('click', () => {
    generateTimeline((title, content) => saveArtifactToNote(title, content));
  });

  document.getElementById('btn-gen-mindmap').addEventListener('click', () => {
    generateMindMap((title, content) => saveArtifactToNote(title, content));
  });

  document.getElementById('close-artifact-viewer-btn').addEventListener('click', () => {
    document.getElementById('artifact-viewer-container').style.display = 'none';
  });

  const saveArtifactToNote = (title, content) => {
    updateActiveNotebook(nb => {
      nb.notes.push({
        id: 'note-' + Date.now(),
        title,
        content,
        pinned: false,
        date: new Date().toISOString()
      });
    });
    renderNotesList(onDeleteNote, onTogglePin, onConvertToSource);
    alert(`"${title}" saved directly into your Notes tab!`);
  };

  // Add Note in Notes tab
  const addNoteBtn = document.getElementById('add-note-btn');
  if (addNoteBtn) {
    addNoteBtn.addEventListener('click', () => {
      const titleInput = document.getElementById('new-note-title');
      const contentInput = document.getElementById('new-note-content');
      const title = titleInput.value.trim() || 'Untitled Note';
      const content = contentInput.value.trim();
      if (!content) return;

      updateActiveNotebook(nb => {
        nb.notes.unshift({
          id: 'note-' + Date.now(),
          title,
          content,
          pinned: false,
          date: new Date().toISOString()
        });
      });

      titleInput.value = '';
      contentInput.value = '';
      renderNotesList(onDeleteNote, onTogglePin, onConvertToSource);
    });
  }

  // Select all sources toggle
  const selectAllToggle = document.getElementById('select-all-sources-toggle');
  if (selectAllToggle) {
    selectAllToggle.addEventListener('change', (e) => {
      const checked = e.target.checked;
      updateActiveNotebook(nb => {
        nb.sources.forEach(s => s.active = checked);
      });
      refreshAllPanels();
    });
  }

  // Close Citation Inspector Drawer
  document.getElementById('close-citation-inspector-btn').addEventListener('click', () => {
    document.getElementById('citation-inspector-drawer').classList.remove('active');
  });

  // Source Viewer Modal Close
  document.getElementById('close-source-viewer-modal-btn').addEventListener('click', () => {
    document.getElementById('source-viewer-modal').classList.remove('active');
  });
  document.getElementById('source-viewer-close-btn').addEventListener('click', () => {
    document.getElementById('source-viewer-modal').classList.remove('active');
  });

  // Export Notebook
  document.getElementById('export-notebook-btn').addEventListener('click', exportNotebookToMarkdown);

  // Add Source Modal Management
  const addSourceModal = document.getElementById('add-source-modal');
  const openAddSourceBtns = [
    document.getElementById('add-source-hero-btn'),
    document.getElementById('add-source-icon-btn')
  ];

  openAddSourceBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => addSourceModal.classList.add('active'));
  });

  document.getElementById('close-add-source-modal-btn').addEventListener('click', () => {
    addSourceModal.classList.remove('active');
  });
  document.getElementById('cancel-add-source-btn').addEventListener('click', () => {
    addSourceModal.classList.remove('active');
  });

  // Ingest Tabs
  const ingestTabBtns = document.querySelectorAll('.ingest-tab-btn');
  const ingestViews = document.querySelectorAll('.ingest-tab-view');
  let activeIngestTab = 'file';

  ingestTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      ingestTabBtns.forEach(b => b.classList.remove('active'));
      ingestViews.forEach(v => v.style.display = 'none');

      btn.classList.add('active');
      activeIngestTab = btn.getAttribute('data-ingest');
      document.getElementById(`ingest-view-${activeIngestTab}`).style.display = 'block';
    });
  });

  // File Dropzone & input
  const dropzone = document.getElementById('file-dropzone');
  const fileInput = document.getElementById('file-input-element');

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files?.length > 0) {
      await handleFileUploads(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files?.length > 0) {
      await handleFileUploads(Array.from(e.target.files));
    }
  });

  const handleFileUploads = async (files) => {
    for (const file of files) {
      try {
        const sourceObj = await parseUploadedFile(file);
        updateActiveNotebook(nb => nb.sources.push(sourceObj));
      } catch (err) {
        alert(`Failed to parse ${file.name}: ${err.message}`);
      }
    }
    addSourceModal.classList.remove('active');
    refreshAllPanels();
  };

  // Submit Add Source Button
  document.getElementById('submit-add-source-btn').addEventListener('click', async () => {
    if (activeIngestTab === 'url') {
      const urlInput = document.getElementById('url-source-input');
      const url = urlInput.value.trim();
      if (!url) return;

      try {
        const res = await fetch('/api/fetch-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');

        updateActiveNotebook(nb => {
          nb.sources.push({
            id: 'src-url-' + Date.now(),
            title: data.title || url,
            type: data.type || 'url',
            author: data.author || '',
            videoId: data.videoId || null,
            content: data.content,
            wordCount: data.wordCount,
            active: true,
            dateAdded: new Date().toISOString()
          });
        });

        urlInput.value = '';
        addSourceModal.classList.remove('active');
        refreshAllPanels();
      } catch (err) {
        alert('Could not ingest URL: ' + err.message);
      }
    } else if (activeIngestTab === 'text') {
      const title = document.getElementById('text-source-title').value.trim() || 'Pasted Text';
      const content = document.getElementById('text-source-content').value.trim();
      if (!content) return;

      updateActiveNotebook(nb => {
        nb.sources.push({
          id: 'src-text-' + Date.now(),
          title,
          type: 'text',
          content,
          wordCount: content.split(/\s+/).filter(Boolean).length,
          active: true,
          dateAdded: new Date().toISOString()
        });
      });

      document.getElementById('text-source-title').value = '';
      document.getElementById('text-source-content').value = '';
      addSourceModal.classList.remove('active');
      refreshAllPanels();
    }
  });

  // Pre-loaded Sample Library Buttons
  document.querySelectorAll('.sample-load-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sampleKey = btn.getAttribute('data-sample');
      const sample = SAMPLE_DOCS[sampleKey];
      if (sample) {
        updateActiveNotebook(nb => {
          nb.sources.push({
            id: 'src-sample-' + Date.now(),
            title: sample.title,
            type: sample.type,
            content: sample.content,
            wordCount: sample.content.split(/\s+/).filter(Boolean).length,
            active: true,
            dateAdded: new Date().toISOString()
          });
        });
        addSourceModal.classList.remove('active');
        refreshAllPanels();
      }
    });
  });

  // Notebook Switcher Modal
  const notebookModal = document.getElementById('notebooks-modal');
  const openNotebookBtn = document.getElementById('notebook-switcher-btn');
  const newNotebookNavBtn = document.getElementById('new-notebook-nav-btn');
  const closeNotebookModalBtn = document.getElementById('close-notebooks-modal-btn');
  const createNotebookBtn = document.getElementById('create-notebook-confirm-btn');

  const openNotebooksList = () => {
    const data = getAppData();
    const container = document.getElementById('notebooks-list-container');
    container.innerHTML = data.notebooks.map(nb => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer;" class="notebook-row" data-id="${nb.id}">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.2rem;">${nb.emoji || '📓'}</span>
          <div>
            <div style="font-weight: 600; color: ${nb.id === data.activeNotebookId ? 'var(--accent-purple-light)' : 'var(--text-main)'}; font-size: 0.9rem;">
              ${nb.title} ${nb.id === data.activeNotebookId ? '• (Active)' : ''}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${nb.sources?.length || 0} sources · ${nb.notes?.length || 0} notes</div>
          </div>
        </div>
        ${data.notebooks.length > 1 ? `
          <button class="icon-btn delete-notebook-btn" data-id="${nb.id}" title="Delete notebook" style="width: 28px; height: 28px;">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        ` : ''}
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();

    container.querySelectorAll('.notebook-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.delete-notebook-btn')) return;
        const id = row.getAttribute('data-id');
        const d = getAppData();
        d.activeNotebookId = id;
        saveAppData(d);
        notebookModal.classList.remove('active');
        updateNotebookHeader();
        refreshAllPanels();
      });
    });

    container.querySelectorAll('.delete-notebook-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm('Delete this notebook permanently?')) {
          const d = getAppData();
          d.notebooks = d.notebooks.filter(n => n.id !== id);
          if (d.activeNotebookId === id) d.activeNotebookId = d.notebooks[0].id;
          saveAppData(d);
          openNotebooksList();
          updateNotebookHeader();
          refreshAllPanels();
        }
      });
    });

    notebookModal.classList.add('active');
  };

  openNotebookBtn.addEventListener('click', openNotebooksList);
  newNotebookNavBtn.addEventListener('click', openNotebooksList);
  closeNotebookModalBtn.addEventListener('click', () => notebookModal.classList.remove('active'));

  createNotebookBtn.addEventListener('click', () => {
    const input = document.getElementById('new-notebook-name-input');
    const title = input.value.trim();
    if (!title) return;

    const newId = 'nb-' + Date.now();
    const data = getAppData();
    data.notebooks.push({
      id: newId,
      title,
      emoji: '💡',
      createdAt: new Date().toISOString(),
      sources: [],
      chatMessages: [],
      notes: [],
      audioPodcast: {
        title: `Deep Dive: ${title}`,
        totalDuration: 180,
        focusPrompt: '',
        transcript: []
      }
    });
    data.activeNotebookId = newId;
    saveAppData(data);

    input.value = '';
    notebookModal.classList.remove('active');
    updateNotebookHeader();
    refreshAllPanels();
  });

  // Settings Modal
  const settingsModal = document.getElementById('settings-modal');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-modal-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const providerSelect = document.getElementById('llm-provider-select');
  const apiKeyGroup = document.getElementById('api-key-group');
  const apiKeyInput = document.getElementById('api-key-input');

  openSettingsBtn.addEventListener('click', () => {
    const settings = getSettings();
    providerSelect.value = settings.provider || 'builtin';
    apiKeyInput.value = settings.apiKey || '';
    apiKeyGroup.style.display = settings.provider !== 'builtin' ? 'flex' : 'none';
    settingsModal.classList.add('active');
  });

  closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));

  providerSelect.addEventListener('change', () => {
    apiKeyGroup.style.display = providerSelect.value !== 'builtin' ? 'flex' : 'none';
  });

  saveSettingsBtn.addEventListener('click', () => {
    const voice1Select = document.getElementById('voice-host-1');
    const voice2Select = document.getElementById('voice-host-2');
    saveSettings({
      provider: providerSelect.value,
      apiKey: apiKeyInput.value.trim(),
      host1VoiceIndex: voice1Select ? voice1Select.selectedIndex : 0,
      host2VoiceIndex: voice2Select ? voice2Select.selectedIndex : 1
    });
    settingsModal.classList.remove('active');
    alert('Settings saved successfully!');
  });
};
