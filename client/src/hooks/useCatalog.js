import { useCallback, useEffect, useState } from 'react';
import { productApi } from '../services/api';
import { mapApiProduct } from '../utils/productMapper';
import { PRODUCT_FIXTURES } from '../data/productFixtures';

/**
 * Loads the live storefront catalogue (everything published in the admin panel).
 * Falls back to the bundled demo products only when the API is unreachable or empty.
 * Results are cached briefly so moving between pages does not refetch every time.
 */
const CACHE_MS = 30 * 1000;
let cache = { at: 0, products: null, promise: null, usedFallback: false };

const fetchCatalog = async (force = false) => {
  if (!force && cache.products && Date.now() - cache.at < CACHE_MS) return cache;
  if (!force && cache.promise) return cache.promise;

  cache.promise = productApi
    .getProducts({ limit: 100, sort: 'newest' })
    .then((res) => {
      const raw = res.data?.data?.products || res.data?.data || [];
      const products = Array.isArray(raw) ? raw.map(mapApiProduct) : [];
      if (products.length === 0) throw new Error('empty catalogue');
      cache = { at: Date.now(), products, promise: null, usedFallback: false };
      return cache;
    })
    .catch(() => {
      cache = { at: Date.now(), products: PRODUCT_FIXTURES, promise: null, usedFallback: true };
      return cache;
    });
  return cache.promise;
};

export const useCatalog = () => {
  const [state, setState] = useState({
    products: cache.products || [],
    loading: !cache.products,
    usedFallback: cache.usedFallback,
  });

  const load = useCallback(async (force = false) => {
    const result = await fetchCatalog(force);
    setState({ products: result.products, loading: false, usedFallback: result.usedFallback });
  }, []);

  useEffect(() => {
    let alive = true;
    fetchCatalog().then((result) => {
      if (alive) setState({ products: result.products, loading: false, usedFallback: result.usedFallback });
    });
    return () => {
      alive = false;
    };
  }, []);

  return { ...state, refresh: () => load(true) };
};

export default useCatalog;
