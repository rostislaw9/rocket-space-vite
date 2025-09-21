import { createContext, useContext } from 'react';

interface ChatUnreadContextValue {
  clearUnread: () => void;
  activePeerId: string | null;
  setActivePeerId: (id: string | null) => void;
}

export const ChatUnreadContext = createContext<ChatUnreadContextValue>({
  clearUnread: () => {},
  activePeerId: null,
  setActivePeerId: () => {},
});

export const useChatUnread = () => useContext(ChatUnreadContext);
