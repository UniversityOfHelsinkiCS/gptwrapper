import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import safeLocalStorage from '../../util/safeLocalStorage'
import { type ClientChatMessage, parseStoredMessages, serializeMessages } from './messages'

/**
 * The conversation saved in localStorage. Old saved conversations are migrated once on load
 * and written back with `messagesVersion: 2`. The stored shape stays `{ value }` like useLocalStorageState.
 */
export const useChatMessages = (key: string): [ClientChatMessage[], Dispatch<SetStateAction<ClientChatMessage[]>>] => {
  const [messages, setMessages] = useState(() => parseStoredMessages(safeLocalStorage.getItem(key)))

  useEffect(() => {
    safeLocalStorage.setItem(key, serializeMessages(messages))
  }, [key, messages])

  return [messages, setMessages]
}
