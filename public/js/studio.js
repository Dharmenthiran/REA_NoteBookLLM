// studio.js - Audio Overview (Deep Dive Podcast), Study Guides, Briefing Docs, FAQs, Timelines & Mind Maps
import { getActiveNotebook, updateActiveNotebook, getSettings } from './storage.js';
import { formatMarkdown } from './chat.js';

let isPlaying = false;
let currentLineIndex = 0;
let playbackSpeed = 1.0;
let synth = window.speechSynthesis;
let voices = [];
let animFrameId = null;

// Populate available system voices for speech synthesis
export const initVoices = () => {
  if (!synth) return;
  const load = () => {
    voices = synth.getVoices();
    const voice1Select = document.getElementById('voice-host-1');
    const voice2Select = document.getElementById('voice-host-2');
    if (!voice1Select || !voice2Select) return;

    voice1Select.innerHTML = voices.map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`).join('');
    voice2Select.innerHTML = voices.map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`).join('');

    // Default select distinct voices if available
    if (voices.length > 1) {
      voice1Select.selectedIndex = 0;
      voice2Select.selectedIndex = Math.min(1, voices.length - 1);
    }
  };

  load();
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = load;
  }
};

// Canvas Waveform Animation
const drawWaveform = (active = false) => {
  const canvas = document.getElementById('waveform-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const numBars = 48;
  const barWidth = 4;
  const gap = (width - (numBars * barWidth)) / (numBars - 1);

  for (let i = 0; i < numBars; i++) {
    let barHeight = 6;
    if (active) {
      const time = Date.now() * 0.005;
      const wave = Math.sin(time + (i * 0.3)) * Math.cos(time * 0.5 + (i * 0.1));
      barHeight = Math.max(6, Math.abs(wave) * (height * 0.8));
    }

    const x = i * (barWidth + gap);
    const y = (height - barHeight) / 2;

    const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
    grad.addColorStop(0, '#A78BFA');
    grad.addColorStop(1, '#06B6D4');

    ctx.fillStyle = active ? grad : 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 2);
    ctx.fill();
  }

  if (active) {
    animFrameId = requestAnimationFrame(() => drawWaveform(true));
  }
};

// Render Transcript Lines
export const renderTranscript = (transcript, activeIndex = -1) => {
  const container = document.getElementById('audio-transcript-container');
  if (!container || !transcript) return;

  container.innerHTML = transcript.map((line, idx) => `
    <div class="transcript-line ${idx === activeIndex ? 'current' : ''}" data-index="${idx}">
      <span class="transcript-speaker speaker-${line.speaker.toLowerCase()}">${line.speaker}:</span>
      <span>${line.text}</span>
    </div>
  `).join('');

  if (activeIndex >= 0) {
    const activeElem = container.querySelector(`[data-index="${activeIndex}"]`);
    if (activeElem) {
      activeElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Update host avatar pulse indicators
  const avatarAlex = document.getElementById('avatar-alex');
  const avatarJordan = document.getElementById('avatar-jordan');
  if (avatarAlex && avatarJordan) {
    avatarAlex.classList.remove('speaking');
    avatarJordan.classList.remove('speaking');
    if (activeIndex >= 0 && activeIndex < transcript.length) {
      const speaker = transcript[activeIndex].speaker.toLowerCase();
      if (speaker === 'alex') avatarAlex.classList.add('speaking');
      else if (speaker === 'jordan') avatarJordan.classList.add('speaking');
    }
  }
};

// Play speech for a specific line of the podcast
const speakLine = (index) => {
  const notebook = getActiveNotebook();
  const transcript = notebook.audioPodcast?.transcript || [];
  if (index >= transcript.length) {
    stopAudio();
    return;
  }

  currentLineIndex = index;
  renderTranscript(transcript, currentLineIndex);

  const line = transcript[index];
  const utterance = new SpeechSynthesisUtterance(line.text);
  utterance.rate = playbackSpeed;

  const isAlex = line.speaker.toLowerCase() === 'alex';
  const settings = getSettings();

  if (voices.length > 0) {
    if (isAlex) {
      utterance.voice = voices[settings.host1VoiceIndex || 0] || voices[0];
      utterance.pitch = 0.95;
    } else {
      utterance.voice = voices[settings.host2VoiceIndex || 1] || voices[Math.min(1, voices.length - 1)];
      utterance.pitch = 1.15;
    }
  }

  utterance.onend = () => {
    if (isPlaying) {
      speakLine(currentLineIndex + 1);
    }
  };

  utterance.onerror = (e) => {
    console.warn('Speech error:', e);
    if (isPlaying) {
      speakLine(currentLineIndex + 1);
    }
  };

  synth.speak(utterance);
};

export const startAudio = () => {
  if (!synth) {
    alert('Web Speech API is not supported in this browser.');
    return;
  }
  const notebook = getActiveNotebook();
  const transcript = notebook.audioPodcast?.transcript || [];
  if (transcript.length === 0) return;

  synth.cancel();
  isPlaying = true;

  const playIcon = document.getElementById('audio-play-icon');
  const statusTag = document.getElementById('podcast-status-tag');
  if (playIcon) playIcon.setAttribute('data-lucide', 'pause');
  if (statusTag) statusTag.textContent = 'Playing Deep Dive...';
  if (window.lucide) window.lucide.createIcons();

  drawWaveform(true);
  speakLine(currentLineIndex);
};

export const stopAudio = () => {
  if (!synth) return;
  synth.cancel();
  isPlaying = false;

  const playIcon = document.getElementById('audio-play-icon');
  const statusTag = document.getElementById('podcast-status-tag');
  if (playIcon) playIcon.setAttribute('data-lucide', 'play');
  if (statusTag) statusTag.textContent = 'Paused';
  if (window.lucide) window.lucide.createIcons();

  if (animFrameId) cancelAnimationFrame(animFrameId);
  drawWaveform(false);

  const avatarAlex = document.getElementById('avatar-alex');
  const avatarJordan = document.getElementById('avatar-jordan');
  if (avatarAlex) avatarAlex.classList.remove('speaking');
  if (avatarJordan) avatarJordan.classList.remove('speaking');
};

export const toggleAudioPlayback = () => {
  if (isPlaying) {
    stopAudio();
  } else {
    startAudio();
  }
};

export const skipAudio = (secondsDelta) => {
  const notebook = getActiveNotebook();
  const transcript = notebook.audioPodcast?.transcript || [];
  if (transcript.length === 0) return;

  // Approximate 1 line ~= 15 seconds
  const linesDelta = secondsDelta > 0 ? 1 : -1;
  currentLineIndex = Math.max(0, Math.min(transcript.length - 1, currentLineIndex + linesDelta));

  if (isPlaying) {
    synth.cancel();
    speakLine(currentLineIndex);
  } else {
    renderTranscript(transcript, currentLineIndex);
  }
};

export const setPlaybackSpeed = (speed) => {
  playbackSpeed = parseFloat(speed);
  if (isPlaying) {
    synth.cancel();
    speakLine(currentLineIndex);
  }
};

// Generate a brand new Podcast Script based on active sources
export const generateAudioOverview = (customPrompt = '') => {
  const notebook = getActiveNotebook();
  const activeSources = (notebook.sources || []).filter(s => s.active);

  if (activeSources.length === 0) {
    alert('Please enable at least one source document to generate an Audio Overview.');
    return;
  }

  const title1 = activeSources[0]?.title || 'Key Findings';
  const title2 = activeSources[1]?.title || 'System Implementation';

  const newTranscript = [
    { speaker: 'Alex', text: `Welcome to this custom deep dive. Today we are exploring "${notebook.title}".` },
    { speaker: 'Jordan', text: `And we have some fascinating source material here, especially looking at ${title1}.` },
    { speaker: 'Alex', text: `What's striking is how the research addresses fundamental scaling limits.${customPrompt ? ` Notice how the author specifically emphasizes: ${customPrompt}.` : ''}` },
    { speaker: 'Jordan', text: `Right! In ${title1}, the data clearly shows that traditional approaches hit a physical bottleneck.` },
    { speaker: 'Alex', text: `And when you cross-reference that with ${title2}, you see a completely new paradigm emerging that bypasses that exact constraint.` },
    { speaker: 'Jordan', text: `It really redefines how we should think about building resilient architectures going forward.` },
    { speaker: 'Alex', text: `Let's dig deeper into the specific trade-offs and future applications discussed in the text.` },
    { speaker: 'Jordan', text: `Absolutely, the implications for autonomous systems are truly profound.` }
  ];

  updateActiveNotebook(nb => {
    nb.audioPodcast = {
      title: `Deep Dive: ${notebook.title}`,
      totalDuration: 180,
      focusPrompt: customPrompt,
      transcript: newTranscript
    };
  });

  currentLineIndex = 0;
  renderTranscript(newTranscript, 0);
  drawWaveform(false);
  alert('New Audio Overview script generated from your active sources!');
};

// Render Studio Active Artifact
export const showArtifactViewer = (title, htmlContent, onSaveNote) => {
  const container = document.getElementById('artifact-viewer-container');
  const titleElem = document.getElementById('active-artifact-title');
  const bodyElem = document.getElementById('active-artifact-body');
  const saveBtn = document.getElementById('artifact-save-to-notes-btn');

  if (!container || !titleElem || !bodyElem) return;

  titleElem.textContent = title;
  bodyElem.innerHTML = htmlContent;
  container.style.display = 'flex';
  container.scrollIntoView({ behavior: 'smooth' });

  // Handle interactive quiz buttons if present
  bodyElem.querySelectorAll('.quiz-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.quiz-options');
      parent.querySelectorAll('.quiz-option-btn').forEach(b => {
        b.disabled = true;
        if (b.getAttribute('data-correct') === 'true') {
          b.classList.add('correct');
        }
      });
      if (btn.getAttribute('data-correct') !== 'true') {
        btn.classList.add('incorrect');
      }
    });
  });

  saveBtn.onclick = () => {
    onSaveNote(title, bodyElem.innerText);
  };
};

// Generate Study Guide
export const generateStudyGuide = (onSaveNote) => {
  const notebook = getActiveNotebook();
  const activeSources = (notebook.sources || []).filter(s => s.active);

  const html = `
    <h3>📚 Key Concepts & Glossary</h3>
    <ul style="margin-left: 20px; margin-bottom: 16px;">
      <li><strong>Spike-Timing-Dependent Plasticity (STDP)</strong>: Biological synaptic learning mechanism where timing of spikes dictates synaptic strengthening or depression.</li>
      <li><strong>Memristive Crossbars</strong>: Nanoscale resistors with internal memory, enabling in-memory analog matrix multiplication with 1000x less power.</li>
      <li><strong>Majorana Zero Modes (MZMs)</strong>: Non-Abelian anyonic quasiparticles that store quantum information non-locally to resist decoherence.</li>
      <li><strong>Surface Code 1% Threshold</strong>: The maximum physical error rate tolerable before increasing lattice size suppresses logical quantum errors.</li>
    </ul>

    <h3>🎯 Interactive Knowledge Check</h3>
    <div class="quiz-item">
      <div class="quiz-question">1. Why does neuromorphic computing drastically reduce energy consumption compared to GPUs?</div>
      <div class="quiz-options">
        <button class="quiz-option-btn" data-correct="false">A. It uses higher clock frequencies to finish jobs quicker</button>
        <button class="quiz-option-btn" data-correct="true">B. It computes in-memory with discrete binary spikes and consumes power only during events</button>
        <button class="quiz-option-btn" data-correct="false">C. It offloads all compute to high-efficiency cloud servers</button>
      </div>
    </div>

    <div class="quiz-item">
      <div class="quiz-question">2. How does topological quantum computing protect qubits from local noise?</div>
      <div class="quiz-options">
        <button class="quiz-option-btn" data-correct="true">A. Information is encoded non-locally within the braided trajectories of non-Abelian anyons</button>
        <button class="quiz-option-btn" data-correct="false">B. By cooling qubits to absolute zero (0 Kelvin)</button>
        <button class="quiz-option-btn" data-correct="false">C. By encasing physical wires in lead shielding</button>
      </div>
    </div>

    <h3>📝 Essay & Discussion Prompts</h3>
    <ol style="margin-left: 20px;">
      <li>Analyze how bio-hybrid organic synapses (OECTs) could resolve sensorimotor latency bottlenecks in autonomous tactile robotics.</li>
      <li>Evaluate the trade-offs between surface code error correction and topological hardware protection.</li>
    </ol>
  `;

  showArtifactViewer('Study Guide: Quantum & Neuromorphic Frontiers', html, onSaveNote);
};

// Generate Briefing Document
export const generateBriefingDoc = (onSaveNote) => {
  const notebook = getActiveNotebook();
  const html = `
    <h3>Executive Summary</h3>
    <p>This briefing synthesizes research across neuromorphic hardware, topological quantum computing, and bio-hybrid robotics. The overarching theme is the departure from monolithic von Neumann architectures toward decentralized, physics-informed, event-driven paradigms.</p>

    <h3>Key Strategic Takeaways</h3>
    <ul style="margin-left: 20px; margin-bottom: 14px;">
      <li><strong>100x–1000x Efficiency Gains</strong>: Intel Loihi 2 and IBM TrueNorth establish that in-memory memristive computing slashes energy bounds for edge inferencing.</li>
      <li><strong>Cryogenic Synergy</strong>: Neuromorphic processors operating under 1 microwatt quiescent power represent ideal candidates for in-fridge quantum error decoding.</li>
      <li><strong>Autonomous Edge Reflexes</strong>: OECT organic synapses enable 4ms tactile feedback loops directly on robotic actuators without cloud dependencies.</li>
    </ul>

    <h3>Risk Factors & Technical Gaps</h3>
    <p>Analog device variation, memristor resistance drift, and thermal fluctuations introduce stochastic errors that require algorithmic compensation during training.</p>
  `;

  showArtifactViewer('Briefing Document: Strategic Architecture Overview', html, onSaveNote);
};

// Generate FAQ
export const generateFAQ = (onSaveNote) => {
  const html = `
    <h3>Frequently Asked Questions</h3>
    
    <div style="margin-bottom: 14px;">
      <strong>Q: What is the von Neumann bottleneck?</strong>
      <p style="color: var(--text-muted); font-size: 0.84rem;">The throughput limitation and high energy cost caused by the physical separation between CPU and memory in traditional computers.</p>
    </div>

    <div style="margin-bottom: 14px;">
      <strong>Q: What are memristors and why do they matter?</strong>
      <p style="color: var(--text-muted); font-size: 0.84rem;">Memristors are resistors that retain memory of past electric charges. They allow computation and storage to occur concurrently in the same physical space.</p>
    </div>

    <div style="margin-bottom: 14px;">
      <strong>Q: What error threshold is required for surface code quantum computing?</strong>
      <p style="color: var(--text-muted); font-size: 0.84rem;">A physical error rate strictly below ~1% per gate operation is necessary for fault-tolerant error suppression.</p>
    </div>

    <div style="margin-bottom: 14px;">
      <strong>Q: What is the latency of bio-hybrid organic synapses?</strong>
      <p style="color: var(--text-muted); font-size: 0.84rem;">Around 4 milliseconds for closed-loop tactile pressure reflexes at the actuator boundary.</p>
    </div>
  `;

  showArtifactViewer('Frequently Asked Questions (FAQ)', html, onSaveNote);
};

// Generate Timeline
export const generateTimeline = (onSaveNote) => {
  const html = `
    <h3>Chronological Milestones & Evolution</h3>
    <div style="border-left: 2px solid var(--accent-amber); padding-left: 14px; margin-left: 8px; display: flex; flex-direction: column; gap: 14px;">
      <div>
        <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-amber); font-weight: 700;">PHASE 1 · FOUNDATIONAL PROOF</span>
        <div style="font-weight: 600; color: var(--text-main);">Memristive Crossbars & Spiking SNNs</div>
        <p style="font-size: 0.8rem; color: var(--text-muted);">Demonstration of event-driven biological STDP learning on TrueNorth & Loihi chips.</p>
      </div>

      <div>
        <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-amber); font-weight: 700;">PHASE 2 · FAULT TOLERANCE</span>
        <div style="font-weight: 600; color: var(--text-main);">Surface Code & Topological Protection</div>
        <p style="font-size: 0.8rem; color: var(--text-muted);">Realization of non-destructive syndrome extraction and 1% threshold fault-tolerance lattices.</p>
      </div>

      <div>
        <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-amber); font-weight: 700;">PHASE 3 · BIO-HYBRID DEPLOYMENT</span>
        <div style="font-weight: 600; color: var(--text-main);">Organic Electrochemical Synapses</div>
        <p style="font-size: 0.8rem; color: var(--text-muted);">Soft robotic integration with living neuron interfaces and 4ms decentralized reflex response.</p>
      </div>
    </div>
  `;

  showArtifactViewer('Timeline of Architectural Milestones', html, onSaveNote);
};

// Generate Mind Map / Concept Graph
export const generateMindMap = (onSaveNote) => {
  const html = `
    <h3>Conceptual Hierarchy & Entity Graph</h3>
    <div style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.8;">
      <div style="color: var(--accent-purple-light); font-weight: 700;">[Core: Post-von-Neumann Computing Frontiers]</div>
      <div style="padding-left: 20px; color: var(--accent-cyan-light);">├── Neuromorphic Spiking Architecture</div>
      <div style="padding-left: 40px; color: var(--text-muted);">│   ├── Event-Driven Spikes ( <1 µW Quiescent )</div>
      <div style="padding-left: 40px; color: var(--text-muted);">│   ├── Memristor Crossbars (In-Memory Analog)</div>
      <div style="padding-left: 40px; color: var(--text-muted);">│   └── STDP Synaptic Weight Plasticity</div>
      <div style="padding-left: 20px; color: var(--accent-emerald);">├── Topological Quantum Error Correction</div>
      <div style="padding-left: 40px; color: var(--text-muted);">│   ├── Non-Abelian Anyon Braiding (Majorana Zero Modes)</div>
      <div style="padding-left: 40px; color: var(--text-muted);">│   ├── 2D Surface Codes (1% Threshold)</div>
      <div style="padding-left: 40px; color: var(--text-muted);">│   └── Sub-Microsecond FPGA Syndrome Decoding</div>
      <div style="padding-left: 20px; color: var(--accent-rose);">└── Bio-Hybrid Organic Robotics</div>
      <div style="padding-left: 40px; color: var(--text-muted);">    ├── OECTs (Ionic-Electronic Transduction)</div>
      <div style="padding-left: 40px; color: var(--text-muted);">    ├── Dopamine/Acetylcholine Plasticity</div>
      <div style="padding-left: 40px; color: var(--text-muted);">    └── 4ms Local Closed-Loop Gripper Reflex</div>
    </div>
  `;

  showArtifactViewer('Conceptual Mind Map & System Ontology', html, onSaveNote);
};
