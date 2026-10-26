import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { productApi } from '../../services/api';
import { formatDate, formatPKR } from '../../utils/notifications';

/** "New Arrivals" fed by GET /products/latest — real published products ordered by actual publication date. */
const LatestArrivals = ({ limit = 4 }) => {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false); setProducts(null);
    try {
      const res = await productApi.getLatest({ limit });
      setProducts(res.data.data.products);
    } catch { setError(true); }
  }, [limit]);
  useEffect(() => { load(); }, [load]);

  if (products && products.length === 0) return null; // nothing published yet → no empty shell on the homepage

  return (
    <section className="bg-snow px-6 py-16 text-charcoal md:px-12" aria-labelledby="latest-arrivals-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-burgundy">Just landed</p>
            <h2 id="latest-arrivals-title" className="mt-2 font-display text-3xl">Latest arrivals</h2>
          </div>
          <Link to="/shop?sort=newest" className="text-xs uppercase tracking-[0.2em] underline-offset-4 hover:underline">View all</Link>
        </div>

        {error ? (
          <div role="alert" className="border border-charcoal/15 p-8 text-center text-sm">
            We couldn’t load the latest arrivals.
            <button type="button" onClick={load} className="ml-3 inline-flex items-center gap-1 underline"><RefreshCw className="h-3 w-3" aria-hidden /> Retry</button>
          </div>
        ) : !products ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-busy="true" aria-label="Loading latest arrivals">
            {Array.from({ length: limit }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse bg-cream motion-reduce:animate-none" />)}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {products.map((p) => {
              const img = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url;
              const onSale = p.salePrice != null && p.salePrice < p.regularPrice;
              return (
                <li key={p._id}>
                  <Link to={`/product/${p.slug}`} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy">
                    <div className="aspect-[3/4] overflow-hidden bg-cream">
                      {img && <img src={img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />}
                    </div>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-charcoal/60">{p.category?.name}{p.publishedAt ? ` · ${formatDate(p.publishedAt)}` : ''}</p>
                    <p className="mt-1 text-sm">{p.name}</p>
                    <p className="mt-0.5 text-sm">
                      {onSale ? (<><span className="font-semibold text-burgundy">{formatPKR(p.salePrice)}</span> <span className="text-charcoal/50 line-through">{formatPKR(p.regularPrice)}</span></>) : formatPKR(p.regularPrice)}
                    </p>
                    <span className="mt-2 inline-block text-[11px] uppercase tracking-[0.2em] underline-offset-4 group-hover:underline">Shop now</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default LatestArrivals;
