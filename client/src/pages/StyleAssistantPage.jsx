import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Send,
  Layers,
  ArrowRight,
  Check,
  RotateCcw,
  Star,
  Sliders,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiApi, productApi } from '../services/api';
import { useCart } from '../context/CartContext';
import ProductComparisonModal from '../components/ai/ProductComparisonModal';

export default function StyleAssistantPage() {
  const [activeTab, setActiveTab] = useState('concierge'); // concierge | outfit | comparison

  // Chat State
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Outfit Builder State
  const [outfitOccasion, setOutfitOccasion] = useState('Formal Winter');
  const [outfitColor, setOutfitColor] = useState('All');
  const [outfitGender, setOutfitGender] = useState('all');
  const [outfitResult, setOutfitResult] = useState(null);
  const [outfitLoading, setOutfitLoading] = useState(false);
  const [outfitAdded, setOutfitAdded] = useState(false);

  // Comparison State
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [selectedProduct1, setSelectedProduct1] = useState('');
  const [selectedProduct2, setSelectedProduct2] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { addToCart } = useCart();

  useEffect(() => {
    let sid = localStorage.getItem('ww_ai_session_id');
    if (!sid) {
      sid = `ww_guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('ww_ai_session_id', sid);
    }
    setSessionId(sid);

    setMessages([
      {
        id: 'msg_welcome',
        role: 'assistant',
        content:
          'Welcome to the WinterWear Atelier Digital Salon. I am your specialized winter stylist. Tell me about the climate you are dressing for, your preferred aesthetic, or specific silhouette requirements.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    // Fetch initial product catalog for comparison dropdowns
    productApi
      .getProducts({ limit: 30 })
      .then((res) => {
        const prods = res.data?.data?.products || res.data?.products || [];
        setCatalogProducts(prods);
        if (prods.length >= 2) {
          setSelectedProduct1(prods[0]._id);
          setSelectedProduct2(prods[1]._id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSendMessage = async (text) => {
    const q = (text || inputMessage).trim();
    if (!q || chatLoading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setChatLoading(true);

    try {
      const res = await aiApi.chat({
        message: q,
        sessionId,
      });

      const data = res.data.data;
      setMessages((prev) => [
        ...prev,
        {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          matchedProducts: data.matchedProducts || [],
          outfit: data.outfit || null,
          comparison: data.comparison || null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content:
            'Our styling consultation engine is temporarily operating offline. All catalog search remains active.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleBuildOutfit = async () => {
    setOutfitLoading(true);
    setOutfitAdded(false);
    try {
      const res = await aiApi.getOutfitSuggestions({
        occasion: outfitOccasion,
        preferredColor: outfitColor === 'All' ? undefined : outfitColor.toLowerCase(),
        gender: outfitGender === 'all' ? undefined : outfitGender,
      });
      setOutfitResult(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setOutfitLoading(false);
    }
  };

  const handleAddAllOutfitPieces = () => {
    if (!outfitResult?.pieces) return;
    outfitResult.pieces.forEach((piece) => {
      const selectedSize = piece.availableSizes?.[0] || 'M';
      const color = { name: 'Noir Charcoal', hex: '#17191C' };
      addToCart(
        {
          _id: piece._id,
          name: piece.name,
          price: piece.price,
          regularPrice: piece.regularPrice,
          salePrice: piece.salePrice,
          images: piece.image ? [{ url: piece.image }] : [],
        },
        selectedSize,
        color,
        1
      );
    });
    setOutfitAdded(true);
    setTimeout(() => setOutfitAdded(false), 3000);
  };

  const handleRunComparison = async () => {
    if (!selectedProduct1 || !selectedProduct2) return;
    setComparisonLoading(true);
    try {
      const res = await aiApi.compareProducts({
        productIds: [selectedProduct1, selectedProduct2],
      });
      setComparisonResult(res.data.data);
      setIsModalOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setComparisonLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal text-snow pt-12 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-burgundy/20 border border-burgundy/40 text-ice text-xs uppercase tracking-widest rounded-full">
            <Sparkles size={14} className="text-ice" />
            WinterWear AI Concierge & Style Engine
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif tracking-tight text-snow">
            The Digital Atelier Stylist
          </h1>
          <p className="text-silver/80 text-sm max-w-2xl mx-auto">
            Grounded wardrobe consultations, tailored winter ensembles, and exact fabric
            comparisons powered directly by verified atelier inventory.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center border-b border-white/10">
          <div className="flex gap-4 sm:gap-8">
            <button
              onClick={() => setActiveTab('concierge')}
              className={`pb-3 text-xs sm:text-sm uppercase tracking-wider font-medium transition relative ${
                activeTab === 'concierge' ? 'text-ice' : 'text-silver hover:text-snow'
              }`}
            >
              Style Concierge Chat
              {activeTab === 'concierge' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ice"></span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('outfit');
                if (!outfitResult) handleBuildOutfit();
              }}
              className={`pb-3 text-xs sm:text-sm uppercase tracking-wider font-medium transition relative ${
                activeTab === 'outfit' ? 'text-ice' : 'text-silver hover:text-snow'
              }`}
            >
              Curated Outfit Builder
              {activeTab === 'outfit' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ice"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('comparison')}
              className={`pb-3 text-xs sm:text-sm uppercase tracking-wider font-medium transition relative ${
                activeTab === 'comparison' ? 'text-ice' : 'text-silver hover:text-snow'
              }`}
            >
              Garment Comparison Matrix
              {activeTab === 'comparison' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ice"></span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Concierge Chat */}
        {activeTab === 'concierge' && (
          <div className="bg-[#1A1D20] border border-white/10 rounded-md overflow-hidden flex flex-col h-[650px] shadow-2xl">
            {/* Salon Subheader */}
            <div className="px-6 py-4 bg-[#1F2226] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-burgundy/30 border border-burgundy flex items-center justify-center text-ice">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm uppercase tracking-widest text-snow font-medium">
                    Atelier Virtual Consultation
                  </h3>
                  <p className="text-xs text-silver/60">
                    Grounded with current inventory, sizing specifications & delivery rules
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const newSession = `ww_guest_${Date.now()}`;
                  localStorage.setItem('ww_ai_session_id', newSession);
                  setSessionId(newSession);
                  setMessages([
                    {
                      id: 'reset_init',
                      role: 'assistant',
                      content: 'Consultation restarted. How may I assist your winter style today?',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ]);
                }}
                className="text-xs text-silver hover:text-snow flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded border border-white/10 transition"
              >
                <RotateCcw size={13} /> Reset Consultation
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-md px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-burgundy text-snow rounded-br-none border border-burgundy/80'
                        : 'bg-[#151719] text-snow/90 rounded-bl-none border border-white/10'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.content}</p>

                    {/* Matched Products */}
                    {m.matchedProducts && m.matchedProducts.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <p className="text-[11px] uppercase tracking-wider text-ice font-medium mb-2">
                          Verified Catalogue Recommendations:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {m.matchedProducts.map((p) => (
                            <div
                              key={p._id}
                              className="bg-[#1A1D20] border border-white/10 p-3 rounded flex gap-3 items-center justify-between"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {p.image ? (
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="w-12 h-14 object-cover rounded bg-charcoal"
                                  />
                                ) : (
                                  <div className="w-12 h-14 bg-charcoal rounded flex items-center justify-center text-[9px] text-silver border border-white/5">
                                    WinterWear
                                  </div>
                                )}
                                <div className="truncate">
                                  <Link
                                    to={`/product/${p.slug}`}
                                    className="text-xs font-medium text-snow hover:text-ice block truncate"
                                  >
                                    {p.name}
                                  </Link>
                                  <span className="text-xs text-cream font-medium">
                                    PKR {(p.price || p.regularPrice || 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  addToCart(
                                    {
                                      _id: p._id,
                                      name: p.name,
                                      price: p.price || p.regularPrice,
                                      regularPrice: p.regularPrice,
                                      salePrice: p.salePrice,
                                      images: p.image ? [{ url: p.image }] : [],
                                    },
                                    p.availableSizes?.[0] || 'M',
                                    { name: 'Noir Charcoal', hex: '#17191C' },
                                    1
                                  );
                                }}
                                className="px-3 py-1.5 bg-burgundy hover:bg-burgundy/90 text-snow text-xs uppercase tracking-wider rounded transition whitespace-nowrap flex items-center gap-1"
                              >
                                <ShoppingBag size={12} /> Bag
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-silver/50 mt-1">{m.timestamp}</span>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-silver/70 bg-[#151719] px-4 py-2.5 rounded-md border border-white/10 w-fit">
                  <Sparkles size={14} className="text-ice animate-spin" />
                  <span>Synthesizing style suggestions from catalogue...</span>
                </div>
              )}
            </div>

            {/* Prompt Suggestion Chips */}
            <div className="px-6 py-2 bg-[#151719] border-t border-white/10 flex gap-2 overflow-x-auto no-scrollbar">
              {[
                'Show me warm cashmere turtlenecks',
                'What coats do you have under 18,000 PKR?',
                'Tell me about your Karachi delivery timeline',
                'How do your trench coats fit compared to European sizing?',
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="whitespace-nowrap px-3 py-1 bg-white/5 hover:bg-burgundy/30 text-silver hover:text-snow text-xs rounded-full border border-white/10 transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-[#1F2226] border-t border-white/10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-3"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Describe the occasion, silhouette, or fabric you need..."
                  className="flex-1 bg-[#151719] border border-white/15 focus:border-ice text-snow placeholder:text-silver/50 text-sm px-4 py-3 rounded-sm focus:outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || chatLoading}
                  className="px-6 py-3 bg-burgundy hover:bg-burgundy/90 disabled:opacity-40 text-snow text-xs uppercase tracking-widest font-medium rounded-sm transition flex items-center gap-2"
                >
                  <Send size={15} /> Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Curated Outfit Builder */}
        {activeTab === 'outfit' && (
          <div className="space-y-6">
            {/* Controls Bar */}
            <div className="bg-[#1F2226] border border-white/10 p-6 rounded-md shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-silver mb-1.5 font-medium">
                    Occasion / Silhouette
                  </label>
                  <select
                    value={outfitOccasion}
                    onChange={(e) => setOutfitOccasion(e.target.value)}
                    className="bg-[#17191C] border border-white/15 text-snow text-xs px-3 py-2 rounded focus:outline-none focus:border-ice"
                  >
                    <option value="Formal Winter">Formal Winter Gala</option>
                    <option value="Daily Atelier">Daily Atelier Minimalist</option>
                    <option value="University">University & Smart Casual</option>
                    <option value="Alpine Vacation">Alpine Retreat & Heavy Outerwear</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-silver mb-1.5 font-medium">
                    Palette
                  </label>
                  <select
                    value={outfitColor}
                    onChange={(e) => setOutfitColor(e.target.value)}
                    className="bg-[#17191C] border border-white/15 text-snow text-xs px-3 py-2 rounded focus:outline-none focus:border-ice"
                  >
                    <option value="All">All Palettes</option>
                    <option value="Black">Noir Charcoal / Black</option>
                    <option value="Cream">Snow White & Warm Cream</option>
                    <option value="Burgundy">Deep Burgundy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-silver mb-1.5 font-medium">
                    Department
                  </label>
                  <select
                    value={outfitGender}
                    onChange={(e) => setOutfitGender(e.target.value)}
                    className="bg-[#17191C] border border-white/15 text-snow text-xs px-3 py-2 rounded focus:outline-none focus:border-ice"
                  >
                    <option value="all">Unisex & All</option>
                    <option value="men">Men's Atelier</option>
                    <option value="women">Women's Atelier</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleBuildOutfit}
                disabled={outfitLoading}
                className="w-full md:w-auto px-6 py-2.5 bg-burgundy hover:bg-burgundy/90 text-snow text-xs uppercase tracking-widest font-medium rounded transition flex items-center justify-center gap-2"
              >
                <Sparkles size={15} />
                {outfitLoading ? 'Curating Look...' : 'Generate Verified Look'}
              </button>
            </div>

            {/* Outfit Results Grid */}
            {outfitResult && (
              <div className="bg-[#1A1D20] border border-white/10 rounded-md p-6 space-y-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
                  <div>
                    <h3 className="text-xl font-serif text-snow">
                      {outfitResult.occasion} Curated Look
                    </h3>
                    <p className="text-xs text-silver/80">
                      Harmonious balance of outer layer, insulating knitwear, and winter accessory
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-silver tracking-widest block">
                        Total Ensemble Price
                      </span>
                      <span className="text-lg font-serif text-cream font-medium">
                        PKR {outfitResult.totalCombinedPrice.toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={handleAddAllOutfitPieces}
                      className={`px-5 py-2.5 rounded text-xs uppercase tracking-widest font-medium transition flex items-center gap-2 ${
                        outfitAdded
                          ? 'bg-emerald-600 text-snow'
                          : 'bg-ice text-charcoal hover:bg-snow'
                      }`}
                    >
                      {outfitAdded ? (
                        <>
                          <Check size={16} /> Look Added!
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={16} /> Add Full Look to Bag
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {outfitResult.pieces.map((piece, idx) => (
                    <div
                      key={piece._id || idx}
                      className="bg-[#1F2226] border border-white/10 rounded-sm overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {piece.image ? (
                          <img
                            src={piece.image}
                            alt={piece.name}
                            className="w-full h-64 object-cover"
                          />
                        ) : (
                          <div className="w-full h-64 bg-charcoal flex items-center justify-center text-silver/60 text-xs">
                            Atelier Garment
                          </div>
                        )}
                        <div className="p-4 space-y-2">
                          <span className="text-[10px] uppercase tracking-wider text-ice px-2 py-0.5 bg-ice/10 rounded font-medium">
                            {piece.category}
                          </span>
                          <h4 className="text-sm font-medium text-snow line-clamp-1">
                            {piece.name}
                          </h4>
                          <p className="text-xs text-silver/60 uppercase">{piece.sku}</p>
                          <p className="text-sm font-medium text-cream">
                            PKR {(piece.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <Link
                          to={`/product/${piece.slug}`}
                          className="w-full py-2 bg-white/10 hover:bg-white/20 text-snow text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-1"
                        >
                          View Garment Details <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Garment Comparison Matrix */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <div className="bg-[#1F2226] border border-white/10 p-6 rounded-md shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-3/4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-silver mb-1.5 font-medium">
                    First Garment
                  </label>
                  <select
                    value={selectedProduct1}
                    onChange={(e) => setSelectedProduct1(e.target.value)}
                    className="w-full bg-[#17191C] border border-white/15 text-snow text-xs px-3 py-2.5 rounded focus:outline-none focus:border-ice"
                  >
                    {catalogProducts.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-silver mb-1.5 font-medium">
                    Second Garment
                  </label>
                  <select
                    value={selectedProduct2}
                    onChange={(e) => setSelectedProduct2(e.target.value)}
                    className="w-full bg-[#17191C] border border-white/15 text-snow text-xs px-3 py-2.5 rounded focus:outline-none focus:border-ice"
                  >
                    {catalogProducts.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleRunComparison}
                disabled={comparisonLoading || !selectedProduct1 || !selectedProduct2}
                className="w-full md:w-auto px-6 py-3 bg-burgundy hover:bg-burgundy/90 text-snow text-xs uppercase tracking-widest font-medium rounded transition flex items-center justify-center gap-2"
              >
                <Sliders size={16} /> Compare Specs
              </button>
            </div>

            <div className="bg-[#1A1D20] border border-white/10 rounded-md p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-ice/10 border border-ice/30 flex items-center justify-center text-ice">
                <Layers size={32} />
              </div>
              <h3 className="text-xl font-serif text-snow">Side-by-Side Physical Verification</h3>
              <p className="text-sm text-silver/80 max-w-lg mx-auto">
                Inspect raw materials, cold-weather rating, care procedures, real stock, and pricing
                across any two WinterWear pieces without marketing exaggeration.
              </p>
              <button
                onClick={handleRunComparison}
                className="px-6 py-2.5 border border-white/20 hover:border-white text-snow text-xs uppercase tracking-widest transition"
              >
                Launch Matrix Viewer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Modal */}
      <ProductComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        comparisonData={comparisonResult}
      />
    </div>
  );
}
