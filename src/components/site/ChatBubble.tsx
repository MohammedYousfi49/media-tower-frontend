// // Fichier : src/components/site/ChatBubble.tsx
//
// import { useState, useEffect, FormEvent, useRef } from 'react';
// import { MessageSquare, X, Send, Loader2, Paperclip, Smile } from 'lucide-react';
// import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
// import axiosClient from '../../api/axiosClient';
// import { useAuth } from '../../contexts/AuthContext';
// import { useNavigate } from 'react-router-dom';
// import { db } from '../../lib/firebase';
//
// interface LiveChatMessage {
//     id: string;
//     content: string;
//     senderId: string;
//     timestamp: Timestamp | null;
// }
//
// const ChatBubble = () => {
//     const { currentUser, appUser, loading: authLoading, stompClient } = useAuth();
//     const navigate = useNavigate();
//     const [isOpen, setIsOpen] = useState(false);
//     const [areAgentsOnline, setAreAgentsOnline] = useState(false);
//     const [view, setView] = useState<'loading' | 'bot' | 'live_chat' | 'auth_prompt'>('loading');
//     const [liveMessages, setLiveMessages] = useState<LiveChatMessage[]>([]);
//     const [activeChatId, setActiveChatId] = useState<string | null>(null);
//     const [inputMessage, setInputMessage] = useState('');
//     const [isSending, setIsSending] = useState(false);
//     const messagesEndRef = useRef<HTMLDivElement>(null);
//     const defaultSupportUid = 'default_support_uid';
//
//     // --- DEBUT DE LA CORRECTION ---
//     useEffect(() => {
//         const fetchStatus = async () => {
//             try {
//                 const res = await axiosClient.get<{ agentsAvailable: boolean }>('/stats/support/status');
//                 setAreAgentsOnline(res.data.agentsAvailable);
//             } catch (error) {
//                 console.error("Could not fetch agent status:", error);
//                 setAreAgentsOnline(false); // En cas d'erreur, on considère qu'ils sont hors ligne
//             }
//         };
//
//         // On fetch le statut immédiatement
//         fetchStatus();
//
//         if (currentUser) {
//             // Si l'utilisateur est connecté, on utilise la WebSocket pour les mises à jour en temps réel
//             if (stompClient?.connected) {
//                 const sub = stompClient.subscribe('/topic/support/status', (message) => {
//                     setAreAgentsOnline(JSON.parse(message.body).agentsAvailable);
//                 });
//                 return () => sub.unsubscribe();
//             }
//         } else {
//             // Si l'utilisateur N'EST PAS connecté, on vérifie toutes les 30 secondes
//             const intervalId = setInterval(fetchStatus, 30000);
//             return () => clearInterval(intervalId);
//         }
//     }, [currentUser, stompClient]);
//     // --- FIN DE LA CORRECTION ---
//
//     useEffect(() => {
//         if (!isOpen || authLoading) {
//             setView('loading');
//             return;
//         }
//         const startOrResumeChat = async () => {
//             if (currentUser) {
//                 try {
//                     const res = await axiosClient.get<{ chatId: string }>('/chats/my-active-conversation');
//                     if (res.status === 200 && res.data.chatId) {
//                         setActiveChatId(res.data.chatId);
//                         setView('live_chat');
//                     } else {
//                         setView('bot');
//                     }
//                 } catch {
//                     setView('bot');
//                 }
//             } else {
//                 setView('bot');
//             }
//         };
//         startOrResumeChat();
//     }, [isOpen, currentUser, authLoading]);
//
//     useEffect(() => {
//         if (!activeChatId) return;
//         const messagesQuery = query(collection(db, 'chats', activeChatId, 'messages'), orderBy('timestamp'));
//         const unsubscribe = onSnapshot(messagesQuery, snapshot => {
//             setLiveMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveChatMessage)));
//         });
//         return () => unsubscribe();
//     }, [activeChatId]);
//
//     useEffect(() => {
//         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//     }, [liveMessages]);
//
//     const handleQuickReplyClick = (action: string) => {
//         if (action.startsWith('navigate')) {
//             navigate(action === 'navigate_products' ? '/products' : '/services');
//             setIsOpen(false);
//         } else if (action === 'ask_question') {
//             if (currentUser) {
//                 setView('live_chat');
//             } else {
//                 setView('auth_prompt');
//             }
//         }
//     };
//
//     const handleSendMessage = async (e: FormEvent) => {
//         e.preventDefault();
//         if (!inputMessage.trim() || !currentUser) return;
//
//         const currentMessage = inputMessage;
//         setInputMessage('');
//         setIsSending(true);
//
//         try {
//             const messageDto = {
//                 content: currentMessage,
//                 senderId: currentUser.uid,
//                 receiverId: defaultSupportUid,
//             };
//             // Cette requête est maintenant autorisée par la nouvelle règle dans SecurityConfig.java
//             await axiosClient.post('/chats/send', messageDto);
//         } catch (error) {
//             console.error("Failed to send message via backend:", error);
//             setInputMessage(currentMessage);
//         } finally {
//             setIsSending(false);
//         }
//     };
//
//     // ... (Le reste du code JSX du composant reste identique)
//     return (
//         <>
//             {isOpen && (
//                 <div className="fixed bottom-24 right-5 z-50 w-[350px] h-[500px] bg-white rounded-lg shadow-2xl flex flex-col font-sans">
//                     <header className="bg-blue-600 p-3 flex items-center text-white rounded-t-lg">
//                         <div className="mr-3 h-10 w-10 p-1 bg-white/20 rounded-full flex items-center justify-center font-bold">S</div>
//                         <div>
//                             <h3 className="font-bold">Support</h3>
//                             <p className="text-xs">{areAgentsOnline ? "Nous sommes en ligne" : "Nous sommes actuellement hors ligne"}</p>
//                         </div>
//                     </header>
//
//                     <main className="flex-grow p-3 overflow-y-auto space-y-3">
//                         {view === 'loading' || authLoading ? <Loader2 className="animate-spin m-auto" /> : null}
//
//                         {!authLoading && (view === 'bot' || view === 'auth_prompt') && (
//                             <div className="flex items-end gap-2">
//                                 <div className="py-2 px-3 rounded-xl max-w-[85%] text-sm bg-gray-200 text-black">
//                                     {view === 'bot' ? "Salut ! 👋 Comment puis-je vous aider ?" : "Pour poser une question et suivre votre conversation, veuillez vous connecter ou créer un compte."}
//                                 </div>
//                             </div>
//                         )}
//
//                         {!authLoading && view === 'live_chat' && (
//                             <>
//                                 {liveMessages.map(msg => (
//                                     <div key={msg.id} className={`flex items-end gap-2 text-sm ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
//                                         <div className={`py-2 px-3 rounded-2xl max-w-[75%] ${msg.senderId === currentUser?.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-black rounded-bl-none'}`}>{msg.content}</div>
//                                     </div>
//                                 ))}
//                                 <div ref={messagesEndRef} />
//                             </>
//                         )}
//                     </main>
//
//                     <footer className="border-t">
//                         {!authLoading && view === 'bot' && (
//                             <div className="p-2 bg-gray-50 rounded-b-lg flex flex-wrap gap-2 justify-center">
//                                 <button onClick={() => handleQuickReplyClick('navigate_products')} className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-blue-200">Produits</button>
//                                 <button onClick={() => handleQuickReplyClick('navigate_services')} className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-blue-200">Services</button>
//                                 <button onClick={() => handleQuickReplyClick('ask_question')} className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-blue-200">J'ai une question</button>
//                             </div>
//                         )}
//                         {!authLoading && view === 'auth_prompt' && (
//                             <div className="p-4 bg-gray-50 rounded-b-lg space-y-2">
//                                 <button onClick={() => { navigate('/login'); setIsOpen(false); }} className="w-full bg-blue-600 text-white font-bold py-2 rounded-md">Se connecter</button>
//                                 <button onClick={() => { navigate('/register'); setIsOpen(false); }} className="w-full bg-gray-200 text-black font-bold py-2 rounded-md">S'inscrire</button>
//                             </div>
//                         )}
//                         {!authLoading && view === 'live_chat' && (
//                             <form onSubmit={handleSendMessage} className="p-2 flex items-center gap-2">
//                                 <button type="button" className="text-gray-400 p-2 hover:text-gray-600" title="Ajouter un fichier (bientôt disponible)" disabled>
//                                     <Paperclip size={20}/>
//                                 </button>
//                                 <button type="button" className="text-gray-400 p-2 hover:text-gray-600" title="Ajouter un emoji (bientôt disponible)" disabled>
//                                     <Smile size={20}/>
//                                 </button>
//                                 <input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} className="w-full bg-gray-100 p-2 rounded-lg text-sm focus:outline-none" placeholder="Écrire un message..." disabled={isSending} />
//                                 <button type="submit" className="text-blue-600 p-2 disabled:text-gray-300" disabled={isSending || !inputMessage.trim()}>
//                                     {isSending ? <Loader2 size={20} className="animate-spin"/> : <Send size={20}/>}
//                                 </button>
//                             </form>
//                         )}
//                     </footer>
//                 </div>
//             )}
//             <button
//                 onClick={() => setIsOpen(p => !p)}
//                 className="bg-blue-600 text-white rounded-full p-4 shadow-lg fixed bottom-5 right-5 z-40 hover:scale-110 transition-transform"
//                 aria-label="Ouvrir le chat"
//             >
//                 {isOpen ? <X/> : <MessageSquare/>}
//             </button>
//         </>
//     );
// };
//
// export default ChatBubble;