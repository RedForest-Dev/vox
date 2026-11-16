import { useCallback, useEffect, useState } from 'react';
import { ChainView } from './components/modes/ChainView';
import { ClassicView } from './components/modes/ClassicView';
import { OxygenView } from './components/modes/OxygenView';
import { XRayView } from './components/modes/XRayView';
import { Header } from './components/layout/Header';
import { Lobby } from './components/Lobby';
import { Searching } from './components/Searching';
import { StoriesView } from './components/StoriesView';
import { useHaptic } from './hooks/useHaptic';
import { useI18n } from './i18n';
import { socket } from './services/socket';
import { EVT, type ChatMode, type OxygenState } from './types';

type Screen = 'lobby' | 'searching' | 'chat' | 'stories';

export default function App() {
  const { lang } = useI18n();
  const [screen, setScreen] = useState<Screen>('lobby');
  const [mode, setMode] = useState<ChatMode>('classic');
  const [online, setOnline] = useState(0);
  const [partnerPresent, setPartnerPresent] = useState(false);
  const [oxygen, setOxygen] = useState<OxygenState | undefined>();
  const [matchKey, setMatchKey] = useState(0);
  const haptic = useHaptic();

  useEffect(() => {
    const onOnline = ({ count }: { count: number }) => setOnline(count);
    const onMatch = (p: { mode: Exclude<ChatMode, 'chain'>; oxygen?: OxygenState }) => {
      setMode(p.mode);
      setOxygen(p.oxygen);
      setPartnerPresent(true);
      setMatchKey((k) => k + 1);
      setScreen('chat');
      haptic('match');
    };
    const onPartnerLeft = () => {
      setPartnerPresent(false);
      haptic('soft');
    };
    socket.on(EVT.ONLINE_COUNT, onOnline);
    socket.on(EVT.MATCH_FOUND, onMatch);
    socket.on(EVT.PARTNER_LEFT, onPartnerLeft);
    return () => {
      socket.off(EVT.ONLINE_COUNT, onOnline);
      socket.off(EVT.MATCH_FOUND, onMatch);
      socket.off(EVT.PARTNER_LEFT, onPartnerLeft);
    };
  }, [haptic]);

  const pick = (m: ChatMode) => {
    haptic('tap');
    setMode(m);
    if (m === 'chain') {
      setScreen('chat'); // ChainView joins the chain itself
    } else {
      socket.emit(EVT.QUEUE_JOIN, { mode: m, lang });
      setScreen('searching');
    }
  };

  /** Leave whatever we are in and return to the lobby. */
  const goLobby = useCallback(() => {
    socket.emit(EVT.QUEUE_LEAVE); // also leaves an active pair session
    setPartnerPresent(false);
    setScreen('lobby'); // unmounting ChainView leaves the chain
  }, []);

  const next = () => {
    setPartnerPresent(false);
    setScreen('searching');
    socket.emit(EVT.MATCH_NEXT);
  };

  return (
    <div className="flex h-full flex-col bg-obsidian-900">
      <div className={screen === 'chat' ? 'hidden md:block' : 'block'}>
        <Header
          online={online}
          onHome={goLobby}
          onStories={screen === 'lobby' ? () => setScreen('stories') : undefined}
          langLocked={screen === 'searching' || screen === 'chat'}
        />
      </div>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {screen === 'lobby' && <Lobby onPick={pick} />}
        {screen === 'stories' && <StoriesView onBack={() => setScreen('lobby')} />}
        {screen === 'searching' && <Searching mode={mode} onCancel={goLobby} />}
        {screen === 'chat' && mode === 'classic' && (
          <ClassicView key={matchKey} partnerPresent={partnerPresent} onNext={next} onLeave={goLobby} />
        )}
        {screen === 'chat' && mode === 'chain' && <ChainView onLeave={goLobby} />}
        {screen === 'chat' && mode === 'oxygen' && (
          <OxygenView key={matchKey} initial={oxygen} partnerPresent={partnerPresent} onLeave={goLobby} />
        )}
        {screen === 'chat' && mode === 'xray' && (
          <XRayView key={matchKey} partnerPresent={partnerPresent} onNext={next} onLeave={goLobby} />
        )}
      </main>
    </div>
  );
}
