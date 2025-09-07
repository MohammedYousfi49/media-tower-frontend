// // Fichier : src/pages/admin/Inbox.tsx
//
// import { useEffect, useState, useMemo, FormEvent, useCallback, useRef, ChangeEvent } from 'react';
// import axiosClient from '../../api/axiosClient';
// import { useAuth } from '../../hooks/useAuth';
// import { db } from '../../lib/firebase';
// import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
// import { Send, Loader2 } from 'lucide-react';
//
// // --- Interfaces (inchangées) ---
// interface ClientInfo {
//     id: string;
//     name: string;
//     email: string;
//     isOnline?: boolean; // Rendu optionnel pour l'état initial
// }
//
// interface ConversationAdmin {
//     chatId: string;
//     client: ClientInfo;
//     lastMessage: string;
//     lastMessageTimestamp: string | null;
//     unreadCount: number;
//     status: 'OPEN' | 'CLOSED';
//     assignedAdminName?: string;
// }
//
// interface ChatMessage {
//     id: string;
//     content: string;
//     senderId: string;
//     timestamp: Timestamp | null;
// }
//
// const formatTimestamp = (ts: string | null): string => {
//     if (!ts) return '';
//     const date = new Date(ts);
//     return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// };
//
// const Inbox = () => {
//     const [allConversations, setAllConversations] = useState<ConversationAdmin[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [activeFilter, setActiveFilter] = useState<'OPEN' | 'CLOSED'>('OPEN');
//     const [activeConversation, setActiveConversation] = useState<ConversationAdmin | null>(null);
//     const [messages, setMessages] = useState<ChatMessage[]>([]);
//     const [inputMessage, setInputMessage] = useState('');
//     const [isSending, setIsSending] = useState(false);
//     const { currentUser, stompClient } = useAuth();
//     const messagesEndRef = useRef<HTMLDivElement>(null);
//
//     // --- EFFET 1 : Chargement initial et écoute des mises à jour de la liste des conversations ---
//     useEffect(() => {
//         const loadConversations = async () => {
//             try {
//                 const res = await axiosClient.get<ConversationAdmin[]>('/chats/admin/inbox');
//                 setAllConversations(res.data);
//             } catch (error) {
//                 console.error('Error loading conversations:', error);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         loadConversations();
//
//         if (!stompClient?.connected) return;
//
//         const inboxSub = stompClient.subscribe('/topic/admin/inbox/update', (message) => {
//             const updatedConvo = JSON.parse(message.body) as ConversationAdmin;
//             setAllConversations(prev => {
//                 const otherConvos = prev.filter(c => c.chatId !== updatedConvo.chatId);
//                 return [updatedConvo, ...otherConvos]; // Placer la conversation mise à jour en haut
//             });
//         });
//
//         return () => inboxSub.unsubscribe();
//     }, [stompClient]);
//
//     // --- EFFET 2 : Écoute de la présence des clients ---
//     useEffect(() => {
//         if (!stompClient?.connected) return;
//
//         const presenceSub = stompClient.subscribe('/topic/presence', (message) => {
//             const onlineStatusMap: Record<string, boolean> = JSON.parse(message.body);
//             const updatePresence = (convos: ConversationAdmin[]) => convos.map(convo => ({
//                 ...convo,
//                 client: { ...convo.client, isOnline: onlineStatusMap[convo.client.id] || false }
//             }));
//
//             setAllConversations(prev => updatePresence(prev));
//             setActiveConversation(prev => prev ? { ...prev, client: { ...prev.client, isOnline: onlineStatusMap[prev.client.id] || false } } : null);
//         });
//
//         return () => presenceSub.unsubscribe();
//     }, [stompClient]);
//
//
//     // --- EFFET 3 : Chargement et écoute des messages de la conversation active ---
//     useEffect(() => {
//         if (!activeConversation) {
//             setMessages([]);
//             return;
//         }
//
//         const chatId = activeConversation.chatId;
//
//         // Chargement initial via Firestore
//         const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp'));
//         const firestoreUnsubscribe = onSnapshot(q, snapshot => {
//             const firestoreMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
//             setMessages(firestoreMessages);
//         });
//
//         // Écoute des nouveaux messages via WebSocket
//         let stompUnsubscribe: (() => void) | null = null;
//         if (stompClient?.connected) {
//             const sub = stompClient.subscribe(`/topic/chat/${chatId}`, (message) => {
//                 const newMessage = JSON.parse(message.body) as ChatMessage;
//                 setMessages(prev => {
//                     // Prévenir les doublons si Firestore et WebSocket arrivent en même temps
//                     if (prev.some(m => m.id === newMessage.id)) return prev;
//                     return [...prev, newMessage];
//                 });
//             });
//             stompUnsubscribe = () => sub.unsubscribe();
//         }
//
//         return () => {
//             firestoreUnsubscribe();
//             if (stompUnsubscribe) stompUnsubscribe();
//         };
//     }, [activeConversation, stompClient]);
//
//     const handleSendMessage = async (e: FormEvent) => {
//         e.preventDefault();
//         if (!inputMessage.trim() || !currentUser || !activeConversation) return;
//
//         setIsSending(true);
//         const messageDto = {
//             content: inputMessage,
//             senderId: currentUser.uid,
//             receiverId: activeConversation.client.id,
//         };
//
//         try {
//             await axiosClient.post('/chats/send', messageDto);
//             setInputMessage('');
//         } catch (error) {
//             console.error("Failed to send message:", error);
//         } finally {
//             setIsSending(false);
//         }
//     };
//
//     const filteredConversations = useMemo(() =>
//             allConversations
//                 .filter(c => c.status === activeFilter)
//                 .sort((a, b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime()),
//         [allConversations, activeFilter]);
//
//     useEffect(() => {
//         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//     }, [messages]);
//
//     return (
//         <div className="flex h-[calc(100vh-100px)] bg-white rounded-lg border shadow-sm">
//             {/* Colonne des conversations */}
//             <div className="w-1/3 border-r flex flex-col">
//                 {/* Filtres */}
//                 <div className="p-2 border-b">
//                     <div className="flex bg-gray-100 p-1 rounded-md">
//                         <button onClick={() => setActiveFilter('OPEN')} className={`w-1/2 p-1.5 text-sm font-semibold rounded ${activeFilter === 'OPEN' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}>Actives</button>
//                         <button onClick={() => setActiveFilter('CLOSED')} className={`w-1/2 p-1.5 text-sm font-semibold rounded ${activeFilter === 'CLOSED' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}>Fermées</button>
//                     </div>
//                 </div>
//                 {/* Liste */}
//                 <div className="overflow-y-auto">
//                     {isLoading ? <Loader2 className="animate-spin text-gray-400 mx-auto my-4" /> :
//                         filteredConversations.map(convo => (
//                             <div key={convo.chatId} onClick={() => setActiveConversation(convo)} className={`flex items-start p-3 cursor-pointer border-l-4 ${activeConversation?.chatId === convo.chatId ? 'bg-blue-50 border-blue-500' : 'border-transparent hover:bg-gray-50'}`}>
//                                 <div className="relative mr-3 shrink-0">
//                                     <div className="w-10 h-10 flex items-center justify-center bg-gray-200 text-gray-600 rounded-full font-bold uppercase">{convo.client.name?.charAt(0) || '?'}</div>
//                                     <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${convo.client.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
//                                 </div>
//                                 <div className="flex-grow overflow-hidden">
//                                     <div className="flex justify-between items-center">
//                                         <p className="truncate text-sm font-semibold">{convo.client.name}</p>
//                                         <p className="text-xs text-gray-400 ml-2 shrink-0">{formatTimestamp(convo.lastMessageTimestamp)}</p>
//                                     </div>
//                                     <p className="text-sm text-gray-500 truncate">{convo.lastMessage}</p>
//                                 </div>
//                             </div>
//                         ))
//                     }
//                 </div>
//             </div>
//
//             {/* Fenêtre de chat active */}
//             <div className="flex-1 flex flex-col">
//                 {activeConversation ? (
//                     <>
//                         <header className="p-4 border-b">
//                             <h3 className="font-bold">{activeConversation.client.name}</h3>
//                             <p className="text-sm text-gray-500">{activeConversation.client.email}</p>
//                         </header>
//                         <main className="flex-grow p-4 overflow-y-auto space-y-2 bg-gray-50">
//                             {messages.map(msg => (
//                                 <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser?.uid ? 'items-end' : 'items-start'}`}>
//                                     <div className={`py-2 px-3 rounded-2xl max-w-[70%] ${msg.senderId === currentUser?.uid ? 'bg-blue-500 text-white' : 'bg-white shadow-sm'}`}>
//                                         {msg.content}
//                                     </div>
//                                 </div>
//                             ))}
//                             <div ref={messagesEndRef} />
//                         </main>
//                         <footer className="p-3 border-t bg-white">
//                             <form onSubmit={handleSendMessage} className="flex items-center gap-2">
//                                 <input value={inputMessage} onChange={(e: ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)} className="w-full bg-gray-100 p-3 rounded-lg outline-none" placeholder="Écrire une réponse..."/>
//                                 <button type="submit" className="bg-blue-500 text-white p-3 rounded-full disabled:bg-blue-300" disabled={!inputMessage.trim() || isSending}>
//                                     {isSending ? <Loader2 className="animate-spin"/> : <Send size={20} />}
//                                 </button>
//                             </form>
//                         </footer>
//                     </>
//                 ) : (
//                     <div className="flex h-full items-center justify-center text-gray-500"><p>Sélectionnez une conversation pour commencer</p></div>
//                 )}
//             </div>
//         </div>
//     );
// };
//
// export default Inbox;