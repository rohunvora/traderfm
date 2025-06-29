import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealAPI, userAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Loading from '../components/Loading';

export default function KOLDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [walletAddress, setWalletAddress] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Fetch deals based on status
  const { data: deals, isLoading } = useQuery({
    queryKey: ['myDeals', activeTab],
    queryFn: () => dealAPI.getMyDeals(activeTab === 'all' ? null : activeTab),
  });

  // Connect wallet mutation
  const connectWalletMutation = useMutation({
    mutationFn: (address) => userAPI.connectWallet(address),
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      setShowWalletModal(false);
      setWalletAddress('');
    },
  });

  // Accept deal mutation
  const acceptDealMutation = useMutation({
    mutationFn: (dealId) => dealAPI.accept(dealId),
    onSuccess: () => {
      queryClient.invalidateQueries(['myDeals']);
    },
  });

  // Reject deal mutation
  const rejectDealMutation = useMutation({
    mutationFn: (dealId) => dealAPI.reject(dealId),
    onSuccess: () => {
      queryClient.invalidateQueries(['myDeals']);
    },
  });

  const handleWalletConnect = () => {
    if (walletAddress && walletAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
      connectWalletMutation.mutate(walletAddress);
    }
  };

  if (isLoading) {
    return <Loading size="lg" className="mt-20" />;
  }

  const tabs = [
    { id: 'pending', label: 'Pending', count: deals?.deals?.filter(d => d.status === 'pending').length || 0 },
    { id: 'accepted', label: 'Accepted', count: deals?.deals?.filter(d => d.status === 'accepted').length || 0 },
    { id: 'all', label: 'All Deals', count: deals?.deals?.length || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KOL Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your token grants and advisor relationships</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                Home
              </button>
              <button
                onClick={logout}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user?.twitter_profile_image ? (
                <img
                  src={user.twitter_profile_image}
                  alt={user.handle}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xl">
                  {user?.handle?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold">@{user?.handle}</h2>
                {user?.twitter_name && (
                  <p className="text-gray-600">{user.twitter_name}</p>
                )}
              </div>
            </div>

            {/* Wallet Status */}
            <div>
              {user?.wallet_address ? (
                <div className="text-sm">
                  <p className="text-gray-600">Wallet Connected</p>
                  <p className="font-mono text-xs text-gray-500">
                    {user.wallet_address.slice(0, 4)}...{user.wallet_address.slice(-4)}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Deals List */}
          <div className="p-6">
            {deals?.deals?.length > 0 ? (
              <div className="space-y-4">
                {deals.deals
                  .filter(deal => activeTab === 'all' || deal.status === activeTab)
                  .map((deal) => (
                    <div key={deal.id} className="border rounded-lg p-6 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {deal.project_name}
                          </h3>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <p>Token Amount: <span className="font-medium">{deal.token_amount} {deal.token_symbol}</span></p>
                            <p>Vesting: <span className="font-medium">{deal.cliff_days} day cliff, {deal.total_vesting_days} days total</span></p>
                            {deal.deliverables && (
                              <p>Deliverables: <span className="font-medium">{deal.deliverables}</span></p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                            deal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            deal.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            deal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                          </span>
                          
                          {deal.status === 'pending' && (
                            <div className="mt-4 space-x-2">
                              <button
                                onClick={() => acceptDealMutation.mutate(deal.id)}
                                disabled={acceptDealMutation.isLoading || !user?.wallet_address}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => rejectDealMutation.mutate(deal.id)}
                                disabled={rejectDealMutation.isLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {deal.offer_expires_at && deal.status === 'pending' && (
                        <p className="mt-3 text-xs text-gray-500">
                          Expires: {new Date(deal.offer_expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No deals found</p>
                {activeTab === 'pending' && (
                  <p className="text-sm text-gray-400 mt-2">
                    Projects will send you offers based on your influence
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Wallet Connect Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Connect Solana Wallet</h3>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter your Solana wallet address"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Make sure this is your Solana wallet address where you want to receive tokens
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleWalletConnect}
                  disabled={!walletAddress || connectWalletMutation.isLoading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {connectWalletMutation.isLoading ? 'Connecting...' : 'Connect'}
                </button>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 