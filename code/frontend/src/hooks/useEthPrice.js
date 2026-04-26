import React from 'react';

const FALLBACK_INR = 245000;

export function useEthPrice() {
  const [ethPriceInr, setEthPriceInr] = React.useState(FALLBACK_INR);
  const [loadingPrice, setLoadingPrice] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    async function loadPrice() {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr');
        const data = await response.json();
        if (mounted && data?.ethereum?.inr) {
          setEthPriceInr(data.ethereum.inr);
        }
      } catch {
        // Keep fallback value for resilient UX.
      } finally {
        if (mounted) {
          setLoadingPrice(false);
        }
      }
    }

    loadPrice();
    return () => {
      mounted = false;
    };
  }, []);

  const toInr = React.useCallback(
    (ethAmount) => {
      const value = Number.parseFloat(ethAmount || 0);
      const amount = Number.isFinite(value) ? value : 0;
      return (amount * ethPriceInr).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    },
    [ethPriceInr],
  );

  return { ethPriceInr, loadingPrice, toInr };
}
