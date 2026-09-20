import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mug } from '@/components/Mug';
import { formatChatLine, meetingReasonLine } from '@/lib/chatFormat';
import { ROOMS } from '@/game/rooms';
import type { ChatLine, GameState, PlayerId, RoomId } from '@/game/types';

type LineTemplate = 'was-in' | 'saw' | 'alone-with' | 'vouch' | 'skip';

export function MeetingPanel({
  state,
  onSay,
  onVote,
}: {
  state: GameState;
  onSay: (line: ChatLine) => void;
  onVote: (target: PlayerId | 'skip') => void;
}) {
  if (state.phase.kind !== 'Meeting') return null;
  const meeting = state.phase.meeting;
  const human = state.players.find((p) => p.isHuman)!;
  const remaining = Math.max(0, meeting.stageEndsAt - state.now);
  const seconds = Math.ceil(remaining / 1000);

  const [template, setTemplate] = useState<LineTemplate>('was-in');
  const [target, setTarget] = useState<PlayerId>(0);
  const [room, setRoom] = useState<RoomId>('atrium');

  const living = state.players.filter((p) => p.alive);
  const humanVote = meeting.votes.find((v) => v.voterId === human.id);

  const voteCounts = useMemo(() => {
    const map = new Map<PlayerId | 'skip', number>();
    if (meeting.stage !== 'result') return map;
    for (const v of meeting.votes) {
      map.set(v.target, (map.get(v.target) ?? 0) + 1);
    }
    return map;
  }, [meeting.stage, meeting.votes]);

  const sendLine = () => {
    let line: ChatLine;
    switch (template) {
      case 'was-in':
        line = { speaker: human.id, kind: 'was-in', roomId: room };
        break;
      case 'saw':
        line = { speaker: human.id, kind: 'saw', target, roomId: room };
        break;
      case 'alone-with':
        line = { speaker: human.id, kind: 'alone-with', target };
        break;
      case 'vouch':
        line = { speaker: human.id, kind: 'vouch', target };
        break;
      case 'skip':
        line = { speaker: human.id, kind: 'skip' };
        break;
    }
    onSay(line);
  };

  const ejectedPlayer =
    meeting.ejected !== null ? state.players.find((p) => p.id === meeting.ejected) : null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[var(--color-paper)] p-4">
      <header className="border-b-2 border-[var(--color-ink)] pb-2">
        <p className="font-serif text-lg">{meetingReasonLine(state)}</p>
        <p className="font-mono text-sm">
          {meeting.stage === 'discuss' && `Discussion — ${seconds}s`}
          {meeting.stage === 'vote' && `Vote — ${seconds}s`}
          {meeting.stage === 'result' && `Result — ${seconds}s`}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 gap-4 pt-4">
        <div className="flex w-1/2 flex-col gap-2 overflow-y-auto border-r border-[var(--color-ink)]/20 pr-2">
          {meeting.chat.map((line, i) => (
            <p key={i} className="text-xs leading-snug">{formatChatLine(state, line)}</p>
          ))}
          {meeting.stage === 'discuss' && (
            <div className="mt-auto space-y-2 border-t pt-2">
              <select
                className="w-full rounded border p-1 text-xs focus-visible:ring-2 focus-visible:ring-[var(--color-chalk)]"
                value={template}
                onChange={(e) => setTemplate(e.target.value as LineTemplate)}
              >
                <option value="was-in">I was in the [room].</option>
                <option value="saw">I saw [player] in the [room].</option>
                <option value="alone-with">[player] was alone with them.</option>
                <option value="vouch">I vouch for [player].</option>
                <option value="skip">Skip. We know nothing.</option>
              </select>
              {template !== 'was-in' && template !== 'skip' && (
                <select
                  className="w-full rounded border p-1 text-xs focus-visible:ring-[3px] focus-visible:ring-[var(--color-chalk)] focus-visible:ring-offset-1"
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value) as PlayerId)}
                >
                  {living.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              {(template === 'was-in' || template === 'saw') && (
                <select
                  className="w-full rounded border p-1 text-xs focus-visible:ring-[3px] focus-visible:ring-[var(--color-chalk)] focus-visible:ring-offset-1"
                  value={room}
                  onChange={(e) => setRoom(e.target.value as RoomId)}
                >
                  {Object.values(ROOMS).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              )}
              <Button size="sm" onClick={sendLine}>Say it</Button>
            </div>
          )}
        </div>

        <div className="flex w-1/2 flex-wrap content-start gap-3">
          {state.players.map((p) => {
            const votes =
              meeting.stage === 'result' ? voteCounts.get(p.id) ?? 0 : null;
            const dead = !p.alive;
            return (
              <button
                key={p.id}
                type="button"
                disabled={meeting.stage !== 'vote' || dead}
                className={`rounded-lg p-2 transition focus-visible:ring-[3px] focus-visible:ring-[var(--color-chalk)] ${
                  humanVote?.target === p.id ? 'bg-[var(--color-highlighter)]' : 'hover:bg-black/5'
                } ${dead ? 'opacity-40' : ''}`}
                onClick={() => onVote(p.id)}
              >
                <Mug color={p.color} playerId={p.id} label={p.name} />
                {votes !== null && votes > 0 && (
                  <span className="block text-center text-xs text-[var(--color-red-pen)]">{votes} votes</span>
                )}
              </button>
            );
          })}
          {meeting.stage === 'vote' && (
            <Button variant="outline" onClick={() => onVote('skip')}>Skip</Button>
          )}
        </div>
      </div>

      {meeting.stage === 'result' && ejectedPlayer && (
        <p className="mt-2 border-t-2 border-[var(--color-red-pen)] pt-2 text-center font-serif text-lg text-[var(--color-red-pen)]">
          {ejectedPlayer.name} was escorted to the parking lot.{' '}
          {ejectedPlayer.role === 'Pundit'
            ? `${ejectedPlayer.name} was the Pundit.`
            : `${ejectedPlayer.name} was not the Pundit.`}
        </p>
      )}
      {meeting.stage === 'result' && meeting.ejected === null && (
        <p className="mt-2 text-center text-sm">No one was ejected.</p>
      )}
    </div>
  );
}
