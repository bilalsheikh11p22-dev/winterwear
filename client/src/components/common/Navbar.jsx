
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Check,
} from 'lucide-react';

import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import { CATEGORIES_DATA } from '../../data/categoriesData';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] =
    useState(false);
  const [cartPulse, setCartPulse] = useState(false);

  const { totalItemsCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  // Active page detection
  const pathname = location.pathname;

  const isShopActive =
    pathname === '/shop' &&
    !searchParams.has('collection') &&
    !searchParams.has('filter') &&
    !searchParams.has('search');

  const isCategoryActive = pathname.startsWith('/category/');

  const isMenActive =
    pathname === '/shop' &&
    searchParams.get('collection') === "Men's Collection";

  const isWomenActive =
    pathname === '/shop' &&
    searchParams.get('collection') === "Women's Collection";

  const isNewActive =
    pathname === '/shop' &&
    searchParams.get('filter') === 'new';

  const isSaleActive =
    pathname === '/shop' &&
    searchParams.get('filter') === 'sale';

  const isStyleActive = pathname === '/style-assistant';

  // Common navigation styles
  const navLinkClass = (active) =>
    `relative inline-flex items-center gap-1 py-2 text-xs uppercase
    tracking-widest transition-colors duration-300 group ${
      active
        ? 'text-cream font-bold'
        : 'text-silver hover:text-cream'
    }`;

  const underlineClass = (active, color = 'bg-cream') =>
    `absolute bottom-0 left-0 h-[1.5px] ${color}
    transition-all duration-300 ease-out ${
      active ? 'w-full' : 'w-0 group-hover:w-full'
    }`;

  const mobileLinkClass = (active) =>
    `flex items-center justify-between rounded-md px-3 py-3
    text-sm transition-all duration-200 ${
      active
        ? 'bg-cream/10 text-cream font-bold border-l-2 border-cream'
        : 'text-silver hover:text-cream hover:bg-white/5'
    }`;

  // Scroll effect
  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 40);
      // hide while scrolling down, show again as soon as the user scrolls up
      if (y < 120) {
        setIsHidden(false);
      } else if (y > lastY + 6) {
        setIsHidden(true);
      } else if (y < lastY - 6) {
        setIsHidden(false);
      }
      lastY = y;
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus when the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCategoryDropdownOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname, location.search]);

  // Cart animation
  useEffect(() => {
    if (totalItemsCount > 0) {
      setCartPulse(true);

      const timer = setTimeout(() => setCartPulse(false), 800);

      return () => clearTimeout(timer);
    }
  }, [totalItemsCount]);

  // Search
  const handleSearchSubmit = (e) => {
    e.preventDefault();

    const query = searchQuery.trim();

    if (query) {
      navigate(`/shop?search=${encodeURIComponent(query)}`);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsCategoryDropdownOpen(false);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 will-change-transform ${
          isHidden && !isMobileMenuOpen && !isSearchOpen ? '-translate-y-full' : 'translate-y-0'
        } ${
          isScrolled
            ? 'glass-panel shadow-xl py-3 border-b border-white/10'
            : 'bg-charcoal/85 backdrop-blur-md py-5 border-b border-white/5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-[auto_1fr_auto] lg:grid-cols-3 items-center gap-2">
            {/* Mobile menu button */}
            <div className="flex items-center lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="text-snow hover:text-cream transition-colors p-2"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>



            {/* Centered brand */}
            <div className="col-start-2 row-start-1 flex justify-center">
              <Link to="/" className="inline-block group text-center">
                <span className="font-editorial-display text-[15px] min-[400px]:text-lg sm:text-2xl xl:text-3xl tracking-[0.16em] sm:tracking-editorial font-bold text-snow group-hover:text-cream transition-colors duration-300 whitespace-nowrap">
                  WINTERWEAR
                </span>
                <span className="block text-[7px] sm:text-[9px] tracking-[0.25em] sm:tracking-[0.35em] text-silver uppercase font-sans -mt-1 group-hover:text-ice transition-colors">
                  Haute Outerwear
                </span>
              </Link>
            </div>

            {/* Right-side icons */}
            <div className="col-start-3 row-start-1 flex items-center justify-end gap-1.5 sm:gap-4 xl:gap-5">
              <button
                type="button"
                onClick={() => setIsSearchOpen((prev) => !prev)}
                className={`p-1 transition-colors ${
                  isSearchOpen
                    ? 'text-cream'
                    : 'text-snow hover:text-cream'
                }`}
                aria-label="Search items"
                aria-expanded={isSearchOpen}
              >
                {isSearchOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>

              <Link
                to="/favorites"
                className={`relative p-1 hidden sm:block transition-colors ${
                  pathname === '/favorites'
                    ? 'text-cream'
                    : 'text-snow hover:text-cream'
                }`}
                aria-label="Wishlist"
                aria-current={
                  pathname === '/favorites' ? 'page' : undefined
                }
              >
                <Heart
                  className={`w-5 h-5 ${
                    pathname === '/favorites' ? 'fill-cream' : ''
                  }`}
                />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-burgundy text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {isAuthenticated && (
                <div className="text-snow hover:text-cream transition-colors">
                  <NotificationBell />
                </div>
              )}

              <Link
                to={isAuthenticated ? '/profile' : '/login'}
                className={`p-1 hidden sm:block transition-colors ${
                  pathname === '/login' || pathname === '/profile'
                    ? 'text-cream'
                    : 'text-snow hover:text-cream'
                }`}
                aria-label={isAuthenticated ? 'My profile' : 'Account login'}
                title={isAuthenticated ? user?.name || 'My profile' : 'Sign in'}
                aria-current={
                  pathname === '/login' || pathname === '/profile' ? 'page' : undefined
                }
              >
                <User className="w-5 h-5" />
              </Link>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1 hidden sm:block text-snow hover:text-cream transition-colors"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative text-snow hover:text-cream transition-colors p-1 flex items-center gap-1.5"
                aria-label={`Shopping cart, ${totalItemsCount} items`}
              >
                <ShoppingBag
                  className={`w-5 h-5 transition-transform duration-300 ${
                    cartPulse ? 'scale-125 text-cream' : ''
                  }`}
                />

                {totalItemsCount > 0 && (
                  <span
                    className={`bg-cream text-charcoal text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center transition-transform duration-300 ${
                      cartPulse ? 'scale-125' : ''
                    }`}
                  >
                    {totalItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Centered desktop navigation on its own row */}
                      {/* Desktop navigation */}
            <nav className="hidden lg:flex w-full items-center justify-center flex-wrap gap-5 xl:gap-7 py-4 border-t border-white/5">
              <Link
                to="/shop"
                className={navLinkClass(isShopActive)}
                aria-current={isShopActive ? 'page' : undefined}
              >
                All Outerwear
                <span className={underlineClass(isShopActive)} />
              </Link>

              {/* Categories dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setIsCategoryDropdownOpen(true)}
                onMouseLeave={() => setIsCategoryDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() =>
                    setIsCategoryDropdownOpen((prev) => !prev)
                  }
                  className={navLinkClass(isCategoryActive)}
                  aria-expanded={isCategoryDropdownOpen}
                >
                  Categories
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isCategoryDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                  <span className={underlineClass(isCategoryActive)} />
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute top-full left-0 w-64 pt-2 z-50">
                    <div className="glass-panel rounded-md shadow-2xl p-3 border border-white/10 animate-fade-in">
                      <div className="grid grid-cols-1 gap-1">
                        {CATEGORIES_DATA.slice(0, 8).map((cat) => {
                          const active =
                            pathname === `/category/${cat.slug}`;

                          return (
                            <Link
                              key={cat.id}
                              to={`/category/${cat.slug}`}
                              className={`flex items-center justify-between gap-2 px-3 py-2 text-xs rounded transition-colors ${
                                active
                                  ? 'bg-cream/10 text-cream font-bold'
                                  : 'text-silver-light hover:text-snow hover:bg-charcoal-light'
                              }`}
                            >
                              <span>{cat.name}</span>
                              {active ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <span className="text-[10px] text-silver-dark">
                                  {cat.itemCount} items
                                </span>
                              )}
                            </Link>
                          );
                        })}

                        <Link
                          to="/shop"
                          className="block text-center text-xs text-cream hover:text-white font-medium py-2 mt-1 border-t border-white/10"
                        >
                          View All Categories →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link
                to="/shop?collection=Men's Collection"
                className={navLinkClass(isMenActive)}
                aria-current={isMenActive ? 'page' : undefined}
              >
                Men
                <span className={underlineClass(isMenActive)} />
              </Link>

              <Link
                to="/shop?collection=Women's Collection"
                className={navLinkClass(isWomenActive)}
                aria-current={isWomenActive ? 'page' : undefined}
              >
                Women
                <span className={underlineClass(isWomenActive)} />
              </Link>

              <Link
                to="/shop?filter=new"
                className={`${navLinkClass(isNewActive)} ${
                  isNewActive ? 'text-ice' : ''
                }`}
                aria-current={isNewActive ? 'page' : undefined}
              >
                New Arrivals
                <span
                  className={underlineClass(isNewActive, 'bg-ice')}
                />
              </Link>

<Link
  to="/shop?filter=sale"
  className={`sale-pulse relative inline-flex items-center gap-1 py-2 text-xs uppercase tracking-widest font-bold ${
    isSaleActive ? 'sale-active' : ''
  }`}
  aria-current={isSaleActive ? 'page' : undefined}
>
  Sale

  <span className="sale-underline absolute bottom-0 left-0 h-[2px] w-full rounded-full" />

  {isSaleActive && (
    <span className="absolute -inset-x-2 -inset-y-1 rounded bg-burgundy/15 -z-10" />
  )}
</Link>


              <Link
                to="/style-assistant"
                className={navLinkClass(isStyleActive)}
                aria-current={isStyleActive ? 'page' : undefined}
              >
                <Sparkles className="w-3.5 h-3.5 text-cream" />
                Style Concierge
                <span className={underlineClass(isStyleActive)} />
              </Link>
            </nav>
        </div>

        {/* Expandable search */}
        {isSearchOpen && (
          <div className="border-t border-white/10 bg-charcoal-surface px-4 py-4 animate-fade-in">
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center"
              >
                <Search className="absolute left-4 w-5 h-5 text-silver" />

                <input
                  type="text"
                  placeholder="Search coats, puffers, shearling, beanies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-charcoal pl-12 pr-24 py-3 text-sm text-snow rounded border border-white/10 focus:outline-none focus:border-cream/60 transition-colors"
                  aria-label="Search products"
                />

                <button
                  type="submit"
                  className="absolute right-2 px-4 py-1.5 bg-cream text-charcoal hover:bg-white text-xs font-semibold uppercase tracking-wider rounded transition-colors"
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* Mobile navigation drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm w-full h-full cursor-default"
            onClick={closeMobileMenu}
            aria-label="Close navigation menu"
          />

          <aside className="fixed inset-y-0 left-0 w-[85%] max-w-xs bg-charcoal-surface border-r border-white/10 p-5 sm:p-6 flex flex-col justify-between z-50 overflow-y-auto animate-slide-up">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-white/10">
                <Link
                  to="/"
                  onClick={closeMobileMenu}
                  className="font-editorial-display text-xl tracking-editorial text-snow"
                >
                  WINTERWEAR
                </Link>

                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="text-silver hover:text-snow p-1"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-5 flex flex-col gap-1">
                <Link
                  to="/shop"
                  onClick={closeMobileMenu}
                  className={mobileLinkClass(isShopActive)}
                  aria-current={isShopActive ? 'page' : undefined}
                >
                  All Outerwear
                  {isShopActive && <Check className="w-4 h-4" />}
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    setIsCategoryDropdownOpen((prev) => !prev)
                  }
                  className={mobileLinkClass(isCategoryActive)}
                  aria-expanded={isCategoryDropdownOpen}
                >
                  Categories
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isCategoryDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isCategoryDropdownOpen && (
                  <div className="ml-3 pl-3 border-l border-white/10 flex flex-col gap-1">
                    {CATEGORIES_DATA.map((cat) => {
                      const active =
                        pathname === `/category/${cat.slug}`;

                      return (
                        <Link
                          key={cat.id}
                          to={`/category/${cat.slug}`}
                          onClick={closeMobileMenu}
                          className={mobileLinkClass(active)}
                          aria-current={active ? 'page' : undefined}
                        >
                          {cat.name}
                          {active && <Check className="w-4 h-4" />}
                        </Link>
                      );
                    })}
                  </div>
                )}

                <Link
                  to="/shop?collection=Men's Collection"
                  onClick={closeMobileMenu}
                  className={mobileLinkClass(isMenActive)}
                  aria-current={isMenActive ? 'page' : undefined}
                >
                  Men's Collection
                  {isMenActive && <Check className="w-4 h-4" />}
                </Link>

                <Link
                  to="/shop?collection=Women's Collection"
                  onClick={closeMobileMenu}
                  className={mobileLinkClass(isWomenActive)}
                  aria-current={isWomenActive ? 'page' : undefined}
                >
                  Women's Collection
                  {isWomenActive && <Check className="w-4 h-4" />}
                </Link>

                <Link
                  to="/shop?filter=new"
                  onClick={closeMobileMenu}
                  className={mobileLinkClass(isNewActive)}
                  aria-current={isNewActive ? 'page' : undefined}
                >
                  New Arrivals
                  {isNewActive && <Check className="w-4 h-4" />}
                </Link>

                <Link
                  to="/shop?filter=sale"
                  onClick={closeMobileMenu}
                  className={mobileLinkClass(isSaleActive)}
                  aria-current={isSaleActive ? 'page' : undefined}
                >
                  Seasonal Sale
                  {isSaleActive && <Check className="w-4 h-4" />}
                </Link>

                <Link
                  to="/style-assistant"
                  onClick={closeMobileMenu}
                  className={mobileLinkClass(isStyleActive)}
                  aria-current={isStyleActive ? 'page' : undefined}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cream" />
                    Style Concierge
                  </span>
                  {isStyleActive && <Check className="w-4 h-4" />}
                </Link>
              </nav>
            </div>

            <div className="pt-5 mt-6 border-t border-white/10 text-sm space-y-2">
              <Link
                to="/favorites"
                onClick={closeMobileMenu}
                className={mobileLinkClass(pathname === '/favorites')}
              >
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Saved Pieces
                </span>
                <span>{wishlistCount}</span>
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className={mobileLinkClass(pathname === '/profile')}
                  >
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      My Profile
                    </span>
                  </Link>

                  {user?.role && user.role !== 'customer' && (
                    <Link
                      to={user.role === 'rider' ? '/rider' : '/admin'}
                      onClick={closeMobileMenu}
                      className={mobileLinkClass(pathname.startsWith('/admin') || pathname === '/rider')}
                    >
                      <span className="flex items-center gap-2">
                        {user.role === 'rider' ? 'Rider Dashboard' : 'Admin Console'}
                      </span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`${mobileLinkClass(false)} w-full text-left`}
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className={mobileLinkClass(pathname === '/login')}
                >
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Sign In
                  </span>
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default Navbar;
