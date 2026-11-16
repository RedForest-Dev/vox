import { LogOut, SkipForward } from 'lucide-react';
import { useEffect, useState } from 'react';
import { socket } from '../../services/socket';
import { useHaptic } from '../../hooks/useHaptic';
import { useI18n } from '../../i18n';
import { EVT, type ChatMessage } from '../../types';
import { ChatPane } from '../chat/ChatPane';

interface Props {
  partnerPresent: boolean;
  onNext: () => void;
  onLeave: () => void;
}

export function ClassicView({ partnerPresent, onNext, onLeave }: Props) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const haptic = useHaptic();

  useEffect(() => {
    const onMsg = ({ message }: { message: ChatMessage }) => {
      setMessages((prev) => [...prev, message]);
      if (!message.isSelf) haptic('tap');
    };
    socket.on(EVT.MESSAGE_RECEIVE, onMsg);
    return () => void socket.off(EVT.MESSAGE_RECEIVE, onMsg);
  }, [haptic]);

  const send = () => {
    const text = draft.trim();
    if (!text || !partnerPresent) return;
    socket.emit(EVT.MESSAGE_SEND, { text });
    setDraft('');
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col border-x border-white/5 bg-obsidian-800">
      <ChatPane
        accent="blue"
        messages={messages}
        value={draft}
        onChange={setDraft}
        onSubmit={send}
        disabled={!partnerPresent}
        placeholder={partnerPresent ? t.classic.placeholder : t.classic.placeholderLeft}
        emptyText={t.classic.empty}
        header={
          <div className="flex items-center justify-between border-b border-white/5 bg-obsidian-950/60 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs">
              <span className={`h-2 w-2 rounded-full ${partnerPresent ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span className="text-slate-300">
                {partnerPresent ? t.classic.online : t.classic.offline}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
              >
                <SkipForward className="h-3.5 w-3.5 text-sky-400" /> {t.classic.next}
              </button>
              <button
                onClick={onLeave}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
              >
                <LogOut className="h-3.5 w-3.5" /> {t.classic.leave}
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
}
