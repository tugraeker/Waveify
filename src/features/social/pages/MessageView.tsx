import { useState } from 'react'
import { Avatar, colorFromName } from './ConversationList'

export interface ChatMessage {
  id: string
  channel_id: string
  user_id: string
  content: string
  created_at: string
  edited_at?: string
  reply_to?: { id: string; content: string; user: string }
  reactions?: Record<string, string[]>
  file_url?: string
  file_name?: string
  user?: { username: string; avatar_url: string }
}

export function MessageGroup({ messages, isLast, onReply, onEdit, onDelete, onReact, currentUser, blockedUsers }: {
  messages: ChatMessage[]; isLast: boolean
  onReply: (msg: ChatMessage) => void
  onEdit: (msg: ChatMessage) => void
  onDelete: (msg: ChatMessage) => void
  onReact: (msgId: string, emoji: string) => void
  currentUser: string | undefined
  blockedUsers: string[]
}) {
  const first = messages[0]
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showReactions, setShowReactions] = useState<string | null>(null)

  if (blockedUsers.includes(first.user_id)) return null

  const reactionsList = ['👍', '❤️', '😂', '😮', '😢', '🔥']

  return (
    <div className={`flex items-start gap-3 px-3 py-1 rounded-lg hover:bg-black/10 transition-colors group animate-fade-in`}>
      <Avatar name={first.user?.username || '?'} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold hover:underline cursor-pointer" style={{ color: colorFromName(first.user?.username || '?') }}>{first.user?.username || 'Bilinmeyen'}</span>
          <span className="text-[11px] text-surface-500">{new Date(first.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} {new Date(first.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          {first.edited_at && <span className="text-[9px] text-surface-600">(düzenlendi)</span>}
        </div>
        {messages.map((msg, idx) => (
          <div key={msg.id}>
            {idx > 0 && (
              <div className="flex items-start gap-3 mt-0.5">
                <div className="w-8 flex-shrink-0 flex justify-center">
                  <span className="text-[10px] text-surface-600 mt-0.5">{new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )}
            {/* Reply indicator */}
            {msg.reply_to && (
              <div className="flex items-center gap-2 ml-0 mb-0.5 pl-1 border-l-2 border-surface-600">
                <span className="text-[11px] text-surface-500 italic">@{msg.reply_to.user}: {msg.reply_to.content}</span>
              </div>
            )}
            {/* Message content or edit input */}
            {editingId === msg.id ? (
              <div className="flex gap-2">
                <input type="text" value={editText} onChange={e => setEditText(e.target.value)}
                  className="flex-1 h-8 rounded-lg bg-surface-800 border border-surface-700 px-3 text-sm text-white" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') { onEdit(msg); setEditingId(null) } }} />
                <button onClick={() => { onEdit({ ...msg, content: editText } as any); setEditingId(null) }} className="text-xs text-wave-400">Kaydet</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-surface-500">İptal</button>
              </div>
            ) : (
              <p className="text-sm text-surface-200 leading-relaxed break-words">{msg.content}</p>
            )}
            {/* File attachment */}
            {msg.file_url && (
              <a href={msg.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-wave-400 hover:underline mt-1">
                📎 {msg.file_name || 'Dosya'}
              </a>
            )}
            {/* Reactions */}
            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
              <div className="flex gap-1 mt-1">
                {Object.entries(msg.reactions).map(([emoji, userList]) => (
                  <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                    className={`text-xs px-1.5 py-0.5 rounded-full border ${(userList as string[]).includes(currentUser || '') ? 'bg-wave-500/20 border-wave-500/40' : 'border-surface-700 hover:border-surface-500'} transition-colors`}>
                    {emoji} {(userList as string[]).length}
                  </button>
                ))}
              </div>
            )}
            {/* Actions - show on hover */}
            {idx === 0 && (
              <div className="flex gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onReply(msg)} className="text-[10px] text-surface-500 hover:text-wave-400 px-1">Yanıtla</button>
                {msg.user_id === currentUser && (
                  <>
                    <button onClick={() => { setEditingId(msg.id); setEditText(msg.content) }} className="text-[10px] text-surface-500 hover:text-wave-400 px-1">Düzenle</button>
                    <button onClick={() => onDelete(msg)} className="text-[10px] text-surface-500 hover:text-red-400 px-1">Sil</button>
                  </>
                )}
                <div className="relative">
                  <button onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)} className="text-[10px] text-surface-500 hover:text-wave-400 px-1">😊</button>
                  {showReactions === msg.id && (
                    <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-surface-800 rounded-lg p-1.5 shadow-2xl animate-fade-in z-10" onMouseLeave={() => setShowReactions(null)}>
                      {reactionsList.map(emoji => (
                        <button key={emoji} onClick={() => { onReact(msg.id, emoji); setShowReactions(null) }} className="text-lg hover:scale-125 transition-transform">{emoji}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
