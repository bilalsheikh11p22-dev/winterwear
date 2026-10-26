import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  ShoppingBag,
  ArrowRight,
  RotateCcw,
  Minimize2,
  Maximize2,
  ExternalLink,
  Tag,
  Check,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiApi } from '../../services/api';
import { useCart } from '../../context/CartContext';

const STARTER_PROMPTS = [
  'Recommend an overcoat under 15,000 PKR',
  'Build me a complete winter outfit for evening wear',
  'What is your Lahore and Karachi delivery timeline?',
  'What is your 14-day exchange and return policy?',
  'Help me find pure merino wool knitwear',
];

export default function WinterWearAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [addedItemMap, setAddedItemMap] = useState({});

  const { addToCart } = useCart();
  const messagesEndRef = useRef(null);

  // Initialize or restore session ID
  useEffect(() => {
    let existingSession = localStorage.getItem('ww_ai_session_id');
    if (!existingSession) {
      existingSession = `ww_guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('ww_ai_session_id', existingSession);
    }
    setSessionId(existingSession);

    // Initial greeting
    setMessages([
      {
        id: 'initial_welcome',
        role: 'assistant',
        content:
          'Welcome to WinterWear Atelier. I am your personal Style Concierge. How may I assist your winter wardrobe curation today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await aiApi.chat({
        message: text,
        sessionId,
      });

      const data = res.data.data;
      const assistantMsg = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        matchedProducts: data.matchedProducts || [],
        outfit: data.outfit || null,
        comparison: data.comparison || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content:
            'I apologize, our concierge service is experiencing a brief connection delay. Please feel free to browse our catalogue directly or ask about our return/delivery policies.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = (product, e) => {
    e.preventDefault();
    e.stopPropagation();

    const selectedSize = product.availableSizes?.[0] || 'M';
    const color = { name: 'Noir Charcoal', hex: '#17191C' };

    addToCart(
      {
        _id: product._id,
        name: product.name,
        price: product.price || product.salePrice || product.regularPrice,
        regularPrice: product.regularPrice,
        salePrice: product.salePrice,
        images: product.image ? [{ url: product.image }] : [],
      },
      selectedSize,
      color,
      1
    );

    setAddedItemMap((prev) => ({ ...prev, [product._id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [product._id]: false }));
    }, 2500);
  };

  const handleResetChat = () => {
    const newSession = `ww_guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('ww_ai_session_id', newSession);
    setSessionId(newSession);
    setMessages([
      {
        id: 'initial_welcome',
        role: 'assistant',
        content:
          'A new consultation session has been started. How can I assist your winter style today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-3 bg-[#1F2226] hover:bg-burgundy text-snow p-3.5 sm:px-4 rounded-full border border-white/20 shadow-2xl transition-all duration-300 hover:scale-105"
            aria-label="Open WinterWear Style Concierge"
          >
            <div className="relative">
              <Sparkles className="w-5 h-5 text-ice animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cream"></span>
            </div>
            <span className="hidden sm:inline text-xs uppercase tracking-widest font-medium pr-1">
              Style Concierge
            </span>
            <span className="hidden group-hover:inline-block text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider text-ice">
              AI
            </span>
          </button>
        )}
      </div>

      {/* Expandable Chat Drawer */}
      {isOpen && (
        <div
          className={`fixed bottom-2 right-2 sm:bottom-6 sm:right-6 z-50 flex flex-col bg-[#17191C] border border-white/15 rounded-md shadow-2xl transition-all duration-300 overflow-hidden ${
            isExpanded
              ? 'w-[calc(100vw-1rem)] md:w-[720px] h-[85vh]'
              : 'w-[calc(100vw-1rem)] sm:w-[420px] h-[600px] max-h-[88vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-[#1F2226] border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-burgundy/30 border border-burgundy flex items-center justify-center text-ice">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-widest text-snow font-medium">
                  WinterWear Atelier Concierge
                </h3>
                <p className="text-[10px] text-silver/70 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Grounded Luxury Advisor · PKR
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-silver/80">
              <button
                onClick={handleResetChat}
                title="Reset consultation"
                className="p-1.5 hover:text-snow hover:bg-white/5 rounded transition"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Restore size' : 'Expand window'}
                className="hidden sm:block p-1.5 hover:text-snow hover:bg-white/5 rounded transition"
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Concierge"
                className="p-1.5 hover:text-snow hover:bg-white/5 rounded transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick link banner to full atelier assistant */}
          <div className="bg-[#121416] px-4 py-1.5 border-b border-white/5 flex items-center justify-between text-[11px] text-silver/80">
            <span>Looking for full outfit builder & comparisons?</span>
            <Link
              to="/style-assistant"
              onClick={() => setIsOpen(false)}
              className="text-ice hover:text-white flex items-center gap-1 font-medium underline"
            >
              Full Assistant <ArrowRight size={12} />
            </Link>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-md px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-burgundy text-snow rounded-br-none border border-burgundy/80'
                      : 'bg-[#1F2226] text-snow/90 rounded-bl-none border border-white/10'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>

                  {/* Grounded Product Recommendations Carousel */}
                  {msg.matchedProducts && msg.matchedProducts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-ice font-medium">
                        Atelier Matches:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.matchedProducts.slice(0, 4).map((prod) => (
                          <div
                            key={prod._id}
                            className="bg-[#17191C] border border-white/10 rounded p-2 flex flex-col justify-between"
                          >
                            <div className="flex gap-2">
                              {prod.image ? (
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="w-12 h-14 object-cover rounded bg-charcoal"
                                />
                              ) : (
                                <div className="w-12 h-14 bg-charcoal flex items-center justify-center text-[9px] text-silver border border-white/5">
                                  WinterWear
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <Link
                                  to={`/product/${prod.slug}`}
                                  className="text-[11px] font-medium text-snow hover:text-ice line-clamp-1"
                                >
                                  {prod.name}
                                </Link>
                                <p className="text-[10px] text-cream mt-0.5">
                                  PKR {(prod.price || prod.salePrice || prod.regularPrice || 0).toLocaleString()}
                                </p>
                                {prod.stockQuantity > 0 ? (
                                  <span className="text-[9px] text-emerald-400">In Stock</span>
                                ) : (
                                  <span className="text-[9px] text-rose-400">Low Stock</span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={(e) => handleQuickAdd(prod, e)}
                              className={`mt-2 w-full py-1 text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 rounded transition ${
                                addedItemMap[prod._id]
                                  ? 'bg-emerald-600 text-snow'
                                  : 'bg-white/10 hover:bg-burgundy text-snow'
                              }`}
                            >
                              {addedItemMap[prod._id] ? (
                                <>
                                  <Check size={11} /> Added
                                </>
                              ) : (
                                <>
                                  <ShoppingBag size={11} /> Add to Bag
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Outfit Recommendation View */}
                  {msg.outfit && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-ice">
                        <span className="uppercase tracking-wider font-medium">
                          {msg.outfit.occasion} Ensemble
                        </span>
                        <span className="text-cream font-medium">
                          PKR {msg.outfit.totalCombinedPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {msg.outfit.pieces?.map((piece) => (
                          <div
                            key={piece._id}
                            className="flex items-center justify-between bg-[#17191C] px-2 py-1.5 rounded border border-white/5 text-[11px]"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-[9px] uppercase px-1 py-0.5 bg-white/10 rounded text-silver">
                                {piece.category}
                              </span>
                              <span className="text-snow truncate">{piece.name}</span>
                            </div>
                            <span className="text-cream whitespace-nowrap pl-2">
                              PKR {piece.price.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-silver/50 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="bg-[#1F2226] border border-white/10 rounded-md px-3.5 py-2.5 text-xs text-silver/80 flex items-center gap-2">
                  <Sparkles size={14} className="text-ice animate-spin" />
                  <span>Style Concierge is styling recommendations...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Starter Chips (shown when few messages) */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-white/10 bg-[#141618] overflow-x-auto flex gap-1.5 no-scrollbar">
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="whitespace-nowrap px-2.5 py-1 text-[10px] rounded-full bg-white/5 hover:bg-burgundy/40 text-silver hover:text-snow border border-white/10 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <div className="p-3 bg-[#1F2226] border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about fabrics, sizes, outfits, or delivery..."
                className="flex-1 bg-[#17191C] border border-white/15 focus:border-ice text-snow placeholder:text-silver/50 text-xs px-3.5 py-2.5 rounded-sm focus:outline-none transition"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="bg-burgundy hover:bg-burgundy/90 disabled:opacity-40 text-snow p-2.5 rounded-sm transition flex items-center justify-center"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
