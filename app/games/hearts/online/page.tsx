'use client';

import { ActiveRoomsPage } from '@/lib/online-rooms';

export default function HeartsOnline() {
  return (
    <ActiveRoomsPage
      gameSlug="hearts"
      roomBasePath="/games/hearts/room"
      lobbyPath="/games/hearts/lobby"
      soloPath="/games/hearts"
      icon="♥"
      title="My Hearts Rooms"
    />
  );
}
