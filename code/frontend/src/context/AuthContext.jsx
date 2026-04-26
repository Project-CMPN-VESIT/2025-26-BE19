import React, { createContext, useContext, useState } from 'react';
import { connectWallet } from '../lib/web3';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [walletError, setWalletError] = useState(null);

  const login = async () => {
    const data = await connectWallet();
    if (data?.error) {
      setWalletError(data.error);
      alert(data.error);
      return;
    }
    if (data?.account) {
      setWalletError(null);
      setAccount(data.account);
      await fetchUserProfile(data.account);
    }
  };

  const logout = () => {
    setAccount(null);
    setUserProfile(null);
    setIsNewUser(false);
    setWalletError(null);
  };

  const fetchUserProfile = async (address) => {
    const { data, error } = await supabase.from('users').select('*').eq('wallet_address', address).single();
    if (error && error.code !== 'PGRST116') {
      const fallbackProfile = {
        wallet_address: address,
        role: 'researcher',
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
      };
      setWalletError('Supabase is unreachable. Running in wallet-only mode.');
      setUserProfile(fallbackProfile);
      setIsNewUser(false);
      return;
    }
    if (data) {
      setUserProfile(data);
      setIsNewUser(!data.name); // If no name/email, they need onboarding
    } else {
      setIsNewUser(true);
    }
  };

  return (
    <AuthContext.Provider value={{ account, userProfile, isNewUser, walletError, setIsNewUser, fetchUserProfile, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
