import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts / older browsers
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    document.body.removeChild(el);
    return ok;
  }
};

const CopyCodeButton = ({ code, className = '' }) => {
  const [state, setState] = useState('idle'); // idle | copied | failed
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = async (e) => {
    e.stopPropagation();
    setState((await copyText(code)) ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2000);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 border border-dashed border-burgundy-light/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ice hover:bg-burgundy/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice ${className}`}
      aria-label={`Copy coupon code ${code}`}
    >
      {state === 'copied' ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
      <span>{code}</span>
      <span className="sr-only" role="status" aria-live="polite">
        {state === 'copied' ? 'Copied to clipboard' : state === 'failed' ? 'Copy failed' : ''}
      </span>
      <span aria-hidden className="text-silver normal-case tracking-normal">
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Press Ctrl+C' : 'Copy'}
      </span>
    </button>
  );
};

export default CopyCodeButton;
