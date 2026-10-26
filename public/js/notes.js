// notes.js - Notes scratchpad, pinning, convert-to-source & notebook export
import { getActiveNotebook, updateActiveNotebook } from './storage.js';

export const renderNotesList = (onDeleteNote, onTogglePin, onConvertToSource) => {
  const notebook = getActiveNotebook();
  const container = document.getElementById('notes-list-container');
  const countBadge = document.getElementById('notes-count-badge');
  if (!container || !notebook) return;

  const notes = notebook.notes || [];
  if (countBadge) countBadge.textContent = notes.length;

  if (notes.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px 16px; text-align: center; color: var(--text-dim); font-size: 0.82rem;">
        No notes yet. Create a note above or click "Save to Notes" on any AI response or studio artifact.
      </div>
    `;
    return;
  }

  // Sort pinned notes to top
  const sortedNotes = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  container.innerHTML = sortedNotes.map(note => `
    <div class="note-card ${note.pinned ? 'pinned' : ''}" data-id="${note.id}">
      <div class="note-card-header">
        <div class="note-card-title">${note.title || 'Untitled Note'}</div>
        <div class="note-actions">
          <button class="note-action-btn pin-note-btn" data-id="${note.id}" title="${note.pinned ? 'Unpin note' : 'Pin note'}">
            <i data-lucide="pin" style="width: 13px; height: 13px; ${note.pinned ? 'color: var(--accent-purple-light);' : ''}"></i>
          </button>
          <button class="note-action-btn convert-to-source-btn" data-id="${note.id}" title="Convert to Source for AI Grounding">
            <i data-lucide="file-up" style="width: 13px; height: 13px; color: var(--accent-cyan-light);"></i>
          </button>
          <button class="note-action-btn delete-note-btn" data-id="${note.id}" title="Delete note">
            <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
          </button>
        </div>
      </div>
      <div class="note-card-content">${note.content}</div>
      <div class="note-card-footer">
        <span>${note.date ? new Date(note.date).toLocaleDateString() : 'Recent'}</span>
        ${note.pinned ? '<span style="color: var(--accent-purple-light); font-weight: 600;">PINNED</span>' : ''}
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();

  container.querySelectorAll('.delete-note-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this note?')) onDeleteNote(id);
    });
  });

  container.querySelectorAll('.pin-note-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      onTogglePin(id);
    });
  });

  container.querySelectorAll('.convert-to-source-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      onConvertToSource(id);
    });
  });
};

// Export the complete Notebook to a clean Markdown file
export const exportNotebookToMarkdown = () => {
  const notebook = getActiveNotebook();
  if (!notebook) return;

  let md = `# 📓 ${notebook.title}\n`;
  md += `Exported on: ${new Date().toLocaleString()}\n\n`;

  md += `## 📚 Sources (${notebook.sources?.length || 0})\n\n`;
  (notebook.sources || []).forEach((src, idx) => {
    md += `### Source ${idx + 1}: ${src.title}\n`;
    md += `- Type: ${src.type} | Word Count: ${src.wordCount || 0}\n\n`;
    md += `> ${src.content.substring(0, 500)}...\n\n`;
  });

  md += `## 📝 Notes (${notebook.notes?.length || 0})\n\n`;
  (notebook.notes || []).forEach(note => {
    md += `### ${note.title}\n`;
    md += `${note.content}\n\n`;
  });

  if (notebook.audioPodcast?.transcript?.length > 0) {
    md += `## 🎙️ Deep Dive Audio Overview Transcript\n\n`;
    notebook.audioPodcast.transcript.forEach(line => {
      md += `**${line.speaker}**: ${line.text}\n\n`;
    });
  }

  // Trigger browser file download
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${notebook.title.replace(/[^a-z0-9_-]/gi, '_')}_export.md`;
  a.click();
  URL.revokeObjectURL(url);
};
