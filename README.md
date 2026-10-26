# ⚡ Aetheria Notebook (Google NotebookLM Rebuild)

> A full-featured, source-grounded AI research assistant & studio inspired by Google NotebookLM, featuring a distinctive **Oceanic Sapphire & Ice Cyan** aesthetic, interactive dual-host **Audio Overview podcast**, full **YouTube video transcript ingestion**, and verifiable citation tracking.

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-blue?style=flat-square)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)
[![Theme: Oceanic Sapphire](https://img.shields.io/badge/Theme-Oceanic_Sapphire-06B6D4?style=flat-square)](#-color-themes)

---

## 🌟 Key Features

### 1. 📚 Multi-Source Ingestion & Grounding
- **PDF Documents**: Client-side document parsing with PDF.js extracting text across pages.
- **YouTube Video Transcripts**: Paste any YouTube link (e.g. `https://www.youtube.com/watch?v=...&t=3349s`) to automatically extract the full timestamped spoken transcript (`[00:03]`, `[55:49]`), creator metadata, and video details.
- **Web URLs & Articles**: Clean content scraping that strips advertisements, headers, and navigation menus.
- **Markdown & Plain Text**: Direct file upload or text pasting.
- **Selective Grounding**: Individual checkbox toggles for each source to dynamically include or exclude materials from the AI's active synthesis context.

### 2. 💬 Grounded Chat & "Notebook Guide"
- **Strict Grounding**: Answers are strictly derived from your active sources.
- **Interactive Inline Citations `[1]`, `[2]`**: Clicking any citation opens the **Citation Inspector Drawer**, highlighting the exact quote and source location.
- **🎓 Learning Guide / Socratic Tutor Mode**: Switch between direct answers and Socratic coaching that breaks concepts down step-by-step with probing questions.
- **Dynamic Suggested Prompts**: Auto-generated starter questions based on your active sources.
- **Save to Notes**: Save any AI answer directly into your research scratchpad with one click.

### 3. 🎙️ Studio Hub & Artifact Generation
- **Deep Dive Audio Overview (Podcast)**:
  - **Dual AI Hosts (Alex & Jordan)**: Generates conversational, banter-rich discussions analyzing your sources.
  - **Dual-Voice Audio Speech Player**: Uses the Web Speech API with custom pitch/rate mapping for distinct voices.
  - **Animated Waveform Visualizer**: Live pulsating frequency bars that react to speech.
  - **Synchronized Transcript**: Highlights speaking hosts in real time with animated avatar rings.
  - **Customizable Focus**: Direct the podcast topic (e.g. *"Explain like I'm 5"*, *"Focus on technical architecture"*).
- **Study Guide Generator**: Key concepts glossary, interactive multiple-choice quiz with immediate right/wrong feedback, and essay prompts.
- **Briefing Document**: Executive summaries, key strategic findings, and risk factors.
- **FAQ Generator**: Common questions and grounded answers.
- **Timeline Generator**: Chronological sequence of milestones and breakthroughs.
- **Conceptual Mind Map**: Structural hierarchy and ontology graph of concepts.

### 4. 📝 Notes & Scratchpad
- Create and pin rich research notes.
- **Convert Note to Source**: Feed your own notes back into the grounding engine to cross-reference with external documents.
- **Export Notebook**: Compile all sources, notes, and podcast transcripts into an exportable Markdown file.

### 5. 🎨 Custom Color Themes
Unlike Google NotebookLM's default light theme, Aetheria Notebook features 5 curated color palettes switchable directly from the top navigation bar:
- 🌊 **Oceanic Sapphire & Cyan** *(Default)*
- 🔮 **Cyber Amethyst**
- 🌲 **Emerald Matrix**
- 🌅 **Sunset Horizon & Rose**
- 👑 **Royal Gold & Champagne**

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Dharmenthiran/REA_NoteBookLLM.git
   cd REA_NoteBookLLM
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   node server.js
   ```

4. **Open in your browser**:
   Navigate to **`http://localhost:3000`**

---

## 🛠️ Tech Stack
- **Backend**: Node.js, Express, `youtube-transcript`, `cors`
- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3 Custom Properties (Design System)
- **Document Processing**: PDF.js (client-side PDF parsing)
- **Audio & Speech**: Web Speech API (`SpeechSynthesis`), HTML5 Canvas (Waveform Visualizer)
- **Icons**: Lucide Icons
- **Typography**: Google Fonts (*Outfit*, *Plus Jakarta Sans*, *JetBrains Mono*)

---

## 📄 License
This project is licensed under the MIT License.
