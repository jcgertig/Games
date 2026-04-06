'use client';

import { LobbyPage } from '@/lib/online-rooms';

export default function HeartsLobby() {
  return (
    <LobbyPage
      gameSlug="hearts"
      roomBasePath="/games/hearts/room"
      backHref="/games/hearts"
      backLabel="← Play vs bots instead"
      title="Hearts Online"
      subtitle="Play with friends — up to 4 players, bots fill empty seats"
      icon="♥"
      onlinePath="/games/hearts/online"
    />
  );
}
