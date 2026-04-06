// Public surface of lib/online-rooms
//
// Server-side code (game configs, service client) lives in app/api/online/
// and is intentionally NOT re-exported here.

export type { OnlineGameConfig, PlayerAction, RoomStatus, SeatInfo } from './types';
export { useRoomBootstrap } from './useRoomBootstrap';
export type { UseRoomBootstrapResult } from './useRoomBootstrap';
export { RoomLobby } from './components/RoomLobby';
export { LobbyPage } from './components/LobbyPage';
export { ActiveRoomsPage } from './components/ActiveRoomsPage';
