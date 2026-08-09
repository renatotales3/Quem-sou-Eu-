import { useEffect, useState, type JSX } from 'react';
import { MAX_NOTE_LENGTH, clearNotes, readNotes, saveNotes } from './notes';

interface NotesPanelProps {
  roomCode: string;
  round: number;
}

/**
 * Bloco de notas privado do jogador. Fica só no cliente: nada aqui toca socket
 * nem rede. O texto vive em `sessionStorage` sob chave por sala e rodada, então
 * um reload restaura a nota e uma rodada nova começa em branco.
 */
export function NotesPanel({ roomCode, round }: NotesPanelProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    setText(readNotes(sessionStorage, roomCode, round));
  }, [roomCode, round]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleChange = (value: string): void => {
    setText(value);
    saveNotes(sessionStorage, roomCode, round, value);
  };

  const handleClear = (): void => {
    setText('');
    clearNotes(sessionStorage, roomCode, round);
  };

  return (
    <div className="notes-dock">
      {open && (
        <div id="notes-panel" className="notes-panel paper-card" role="dialog" aria-label="Bloco de notas">
          <div className="notes-panel-head">
            <div><span className="micro-label">Só você vê</span><h2>Bloco de notas</h2></div>
            <button className="notes-clear" type="button" onClick={handleClear} aria-label="Limpar notas">Limpar</button>
          </div>
          <label className="field-label" htmlFor="notes-text">Suas deduções</label>
          <textarea
            id="notes-text"
            className="notes-textarea"
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            placeholder="Ex.: não sou homem · sou desenho"
            maxLength={MAX_NOTE_LENGTH}
          />
        </div>
      )}
      <button
        className="notes-toggle"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? 'Fechar bloco de notas' : 'Abrir bloco de notas'}
        aria-expanded={open}
        aria-controls="notes-panel"
      >
        ✎
      </button>
    </div>
  );
}
