import { ethers } from 'ethers';

const TARGET_CHAIN_ID_DEC = Number(import.meta.env.VITE_CHAIN_ID || 1337);
const TARGET_CHAIN_ID_HEX = `0x${TARGET_CHAIN_ID_DEC.toString(16)}`;
const TARGET_CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || 'Hardhat Local';
const TARGET_RPC_URL = import.meta.env.VITE_CHAIN_RPC_URL || 'http://127.0.0.1:8545';
const ENFORCE_CHAIN = String(import.meta.env.VITE_ENFORCE_CHAIN || 'false').toLowerCase() === 'true';

async function ensureTargetChain(ethereum) {
  const current = await ethereum.request({ method: 'eth_chainId' });
  if (current?.toLowerCase() === TARGET_CHAIN_ID_HEX.toLowerCase()) return;

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: TARGET_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    if (switchError?.code !== 4902) {
      throw new Error(`Please switch MetaMask network to chain ${TARGET_CHAIN_ID_DEC}.`);
    }
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: TARGET_CHAIN_ID_HEX,
          chainName: TARGET_CHAIN_NAME,
          rpcUrls: [TARGET_RPC_URL],
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
        },
      ],
    });
  }
}

export const connectWallet = async () => {
  if (typeof window.ethereum === 'undefined') {
    return { error: 'MetaMask (or another EIP-1193 wallet) is not installed.' };
  }
  
  try {
    if (ENFORCE_CHAIN) {
      await ensureTargetChain(window.ethereum);
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    const accounts = await provider.send('eth_requestAccounts', []);
    if (!accounts || accounts.length === 0) {
      return { error: 'No wallet account selected.' };
    }
    
    const signer = await provider.getSigner();
    
    return {
      provider,
      signer,
      account: accounts[0],
      chainId: Number((await provider.getNetwork()).chainId),
    };
  } catch (err) {
    if (err?.code === 4001) {
      return { error: 'Wallet connection request was rejected.' };
    }
    if (err?.message?.includes('already pending')) {
      return { error: 'A wallet request is already pending in MetaMask.' };
    }
    return { error: err?.message || 'Failed to connect wallet.' };
  }
};
