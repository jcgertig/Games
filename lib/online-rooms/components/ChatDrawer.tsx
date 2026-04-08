'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getAnonClient } from '@/lib/supabaseClient';
import { Lineicons } from '@lineiconshq/react-lineicons';
import { Pencil1Stroke, Trash3Stroke, ChatBubble2Stroke, XmarkStroke } from '@lineiconshq/free-icons';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id:           string;
  room_id:      string;
  user_id:      string;
  display_name: string;
  body:         string | null;  // null = soft-deleted
  created_at:   string;
  edited_at:    string | null;
  deleted_at:   string | null;
}

export interface ChatDrawerProps {
  roomId:   string;
  roomCode: string;
  open:     boolean;
  onClose:  () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── MessageRow ────────────────────────────────────────────────────────────────

interface MessageRowProps {
  msg:          ChatMessage;
  isOwn:        boolean;
  isEditing:    boolean;
  editValue:    string;
  onEditStart:  () => void;
  onEditChange: (v: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onDelete:     () => void;
}

function MessageRow({
  msg, isOwn, isEditing, editValue,
  onEditStart, onEditChange, onEditSubmit, onEditCancel, onDelete,
}: MessageRowProps) {
  if (msg.deleted_at) {
    return (
      <div className="py-1 px-1">
        <span className="text-slate-500 italic text-xs">[message deleted]</span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="py-1 px-1 flex flex-col gap-1">
        <span className="text-xs font-semibold text-slate-300">{msg.display_name}</span>
        <input
          type="text"
          value={editValue}
          onChange={e => onEditChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSubmit(); }
            if (e.key === 'Escape') onEditCancel();
          }}
          maxLength={500}
          autoFocus
          className="bg-slate-700 text-slate-100 text-sm rounded px-2 py-1
            border border-slate-500 focus:outline-none focus:border-green-600"
        />
        <div className="flex gap-2">
          <button
            onClick={onEditSubmit}
            className="text-xs text-green-400 hover:text-green-300"
          >
            Save
          </button>
          <button
            onClick={onEditCancel}
            className="text-xs text-slate-400 hover:text-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative py-1 px-1 rounded hover:bg-slate-800/50">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-200 shrink-0">{msg.display_name}</span>
        <span className="text-xs text-slate-400 shrink-0">{formatTime(msg.created_at)}</span>
        {msg.edited_at && (
          <span className="text-xs text-slate-500">(edited)</span>
        )}
      </div>
      <p className="text-sm text-slate-100 break-words mt-0.5">{msg.body}</p>
      {isOwn && (
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEditStart}
            title="Edit"
            className="text-slate-400 hover:text-slate-200 text-xs w-5 h-5 flex items-center justify-center"
          >
            <Lineicons icon={Pencil1Stroke} size={12} />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="text-slate-400 hover:text-red-400 text-xs w-5 h-5 flex items-center justify-center"
          >
            <Lineicons icon={Trash3Stroke} size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── ChatDrawer ────────────────────────────────────────────────────────────────

export function ChatDrawer({ roomId, roomCode, open, onClose }: ChatDrawerProps) {
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editValue,  setEditValue]  = useState('');
  const [sending,    setSending]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [myUserId,   setMyUserId]   = useState<string | null>(null);

  const sendTimestampsRef = useRef<number[]>([]);
  const bottomRef         = useRef<HTMLDivElement>(null);
  const inputRef          = useRef<HTMLInputElement>(null);

  // ── Token helper ───────────────────────────────────────────────────────────
  const getToken = useCallback(async (): Promise<string | null> => {
    const supabase = getAnonClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session.access_token;
    const { data: { session: s2 } } = await supabase.auth.refreshSession();
    return s2?.access_token ?? null;
  }, []);

  // ── Bootstrap: resolve userId + load history ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const supabase = getAnonClient();

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled && session) setMyUserId(session.user.id);

      const { data } = await supabase
        .from('online_chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!cancelled && data) setMessages(data as ChatMessage[]);
    })();

    return () => { cancelled = true; };
  }, [roomId]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getAnonClient();
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev =>
              prev.some(m => m.id === payload.new.id)
                ? prev
                : [...prev, payload.new as ChatMessage],
            );
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev =>
              prev.map(m => m.id === payload.new.id ? (payload.new as ChatMessage) : m),
            );
          }
        },
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [roomId]);

  // ── Auto-scroll to bottom ──────────────────────────────────────────────────
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      inputRef.current?.focus();
    }
  }, [open]);

  // ── Client-side rate limit ─────────────────────────────────────────────────
  function isRateLimited(): boolean {
    const now = Date.now();
    sendTimestampsRef.current = sendTimestampsRef.current.filter(t => now - t < 1000);
    return sendTimestampsRef.current.length >= 3;
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  async function handleSend() {
    const trimmed = inputValue.trim();
    if (!trimmed || sending) return;
    if (trimmed.length > 500) { setError('Max 500 characters'); return; }
    if (isRateLimited()) { setError('Slow down — max 3 messages per second'); return; }

    setSending(true);
    setError(null);
    sendTimestampsRef.current.push(Date.now());

    const token = await getToken();
    if (!token) { setError('Not signed in'); setSending(false); return; }

    const res = await fetch(`/api/online/rooms/${roomCode}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: trimmed }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? 'Failed to send');
    } else {
      setInputValue('');
    }
    setSending(false);
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  async function handleEdit(messageId: string) {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed.length > 500) return;

    const token = await getToken();
    if (!token) return;

    const res = await fetch(`/api/online/rooms/${roomCode}/chat/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: trimmed }),
    });

    if (res.ok) {
      setEditingId(null);
      setEditValue('');
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? 'Failed to edit');
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(messageId: string) {
    const token = await getToken();
    if (!token) return;
    await fetch(`/api/online/rooms/${roomCode}/chat/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    // Realtime UPDATE event will update the message in state
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={[
        'fixed top-0 right-0 h-full w-80 z-40 flex flex-col',
        'bg-slate-950 border-l border-slate-700/60',
        'transform transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 shrink-0">
        <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Lineicons icon={ChatBubble2Stroke} size={14} />
          Chat
        </span>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="text-slate-400 hover:text-white transition-colors w-6 h-6 flex items-center justify-center"
        >
          <Lineicons icon={XmarkStroke} size={16} />
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-0.5 min-h-0">
        {messages.length === 0 && (
          <p className="text-slate-500 text-xs text-center mt-4">No messages yet</p>
        )}
        {messages.map(msg => (
          <MessageRow
            key={msg.id}
            msg={msg}
            isOwn={msg.user_id === myUserId}
            isEditing={editingId === msg.id}
            editValue={editValue}
            onEditStart={() => { setEditingId(msg.id); setEditValue(msg.body ?? ''); }}
            onEditChange={setEditValue}
            onEditSubmit={() => handleEdit(msg.id)}
            onEditCancel={() => { setEditingId(null); setEditValue(''); }}
            onDelete={() => handleDelete(msg.id)}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 px-4 py-1 shrink-0">{error}</p>
      )}

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-700/60 shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); if (error) setError(null); }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Message…"
            maxLength={500}
            className="flex-1 bg-slate-800 text-slate-100 text-sm rounded-lg px-3 py-2
              border border-slate-700 focus:outline-none focus:border-green-600
              placeholder-slate-500"
          />
          <button
            onClick={handleSend}
            disabled={sending || !inputValue.trim()}
            className="px-3 py-2 rounded-lg bg-green-700 hover:bg-green-600
              disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm
              font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
