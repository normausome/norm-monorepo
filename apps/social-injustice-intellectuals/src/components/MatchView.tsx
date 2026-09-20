import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Mug } from '@/components/Mug';
import { MapDiagram } from '@/components/MapDiagram';
import { CitationHunt } from '@/components/tasks/CitationHunt';
import { CoffeeRefill } from '@/components/tasks/CoffeeRefill';
import { JargonFilter } from '@/components/tasks/JargonFilter';
import { PeerReview } from '@/components/tasks/PeerReview';
import { footnoteInRoom, playerRoomAt, playersInRoom } from '@/game/helpers';
import { ROOMS } from '@/game/rooms';
import type { GameState, PlayerId, RoomId, TaskId, TaskKind } from '@/game/types';

const TASK_COPY: Record<TaskKind, string> = {
  'citation-hunt': 'Find a real source. Any real source.',
  'peer-review': 'Sign the review. Do not read the paper.',
  'jargon-filter': 'Remove the words that mean nothing.',
  'coffee-refill': 'Refill. This is the real work.',
};

export function MatchView({
  state,
  onMove,
  onCompleteTask,
  onReport,
  onSymposium,
}: {
  state: GameState;
  onMove: (to: RoomId) => void;
  onCompleteTask: (taskId: TaskId) => void;
  onReport: (victimId: PlayerId) => void;
  onSymposium: () => void;
}) {
  const human = state.players.find((p) => p.isHuman)!;
  const roomId = playerRoomAt(human, state.now);
  const traveling = human.location.kind === 'travel' && state.now < human.location.arrivesAt;
  const [taskOpen, setTaskOpen] = useState(false);

  const doneCount = state.tasks.filter((t) => t.status === 'done').length;
  const totalCount = state.tasks.length;

  const humanTask = useMemo(() => {
    if (!roomId) return null;
    return state.tasks.find(
      (t) =>
        t.ownerId === human.id &&
        t.status === 'todo' &&
        t.roomId === roomId,
    );
  }, [state.tasks, human.id, roomId]);

  const occupants = roomId ? playersInRoom(state, roomId, state.now) : [];
  const fn = roomId ? footnoteInRoom(state, roomId) : undefined;

  const completeHumanTask = () => {
    if (humanTask) {
      onCompleteTask(humanTask.id);
      setTaskOpen(false);
    }
  };

  const renderTask = () => {
    if (!humanTask) return null;
    switch (humanTask.kind) {
      case 'citation-hunt':
        return <CitationHunt seed={state.seed} onComplete={completeHumanTask} />;
      case 'peer-review':
        return <PeerReview onComplete={completeHumanTask} />;
      case 'jargon-filter':
        return <JargonFilter seed={state.seed} onComplete={completeHumanTask} />;
      case 'coffee-refill':
        return <CoffeeRefill onComplete={completeHumanTask} />;
    }
  };

  const room = roomId ? ROOMS[roomId] : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4">
      <header className="space-y-2 border-b-2 border-[var(--color-ink)] pb-3">
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-serif text-xl font-semibold">The Institute for Applied Discourse</h1>
          <span className="font-mono text-xs">#{state.seed}</span>
        </div>
        <MapDiagram currentRoom={roomId} />
        <div className="h-2 w-full overflow-hidden rounded-full border border-[var(--color-ink)]">
          <div
            className="h-full bg-[var(--color-highlighter)] transition-all"
            style={{ width: `${(doneCount / totalCount) * 100}%` }}
          />
        </div>
        <p className="font-mono text-xs">
          Manifesto progress: {doneCount}/{totalCount} tasks
        </p>
      </header>

      <section
        className={`flex-1 rounded-lg border-2 border-[var(--color-ink)] bg-white/30 p-4 transition-opacity ${traveling ? 'opacity-50' : ''}`}
      >
        {traveling && (
          <p className="mb-2 font-mono text-sm">Walking the corridor…</p>
        )}
        {room && (
          <>
            <h2 className="font-serif text-2xl">{room.name}</h2>
            {fn && (
              <div className="mt-3 flex items-center gap-3 rounded border-2 border-[var(--color-red-pen)] bg-[var(--color-red-pen)]/10 p-3">
                <Mug
                  color={state.players.find((p) => p.id === fn.victimId)?.color ?? '#888'}
                  playerId={fn.victimId}
                  tipped
                />
                <div>
                  <p className="text-sm text-[var(--color-red-pen)]">Footnote spotted</p>
                  <Button variant="destructive" size="sm" onClick={() => onReport(fn.victimId)}>
                    Report
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {occupants.map((p) => (
                <Mug key={p.id} color={p.color} playerId={p.id} label={p.name} />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {room.exits.map((exit) => (
                <Button
                  key={exit}
                  variant="outline"
                  disabled={traveling}
                  onClick={() => onMove(exit)}
                >
                  → {ROOMS[exit].name}
                </Button>
              ))}
            </div>

            {humanTask && !traveling && (
              <Button className="mt-4" onClick={() => setTaskOpen(true)}>
                Do task: {TASK_COPY[humanTask.kind]}
              </Button>
            )}

            {room.hasPodium && !state.symposiumUsed && !traveling && (
              <Button variant="secondary" className="mt-2" onClick={onSymposium}>
                Emergency Symposium (once)
              </Button>
            )}
          </>
        )}
      </section>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{humanTask ? TASK_COPY[humanTask.kind] : 'Task'}</DialogTitle>
          </DialogHeader>
          {renderTask()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
