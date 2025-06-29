import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { userAPI, dealAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Loading from '../components/Loading';

export default function HomePage() {
  const navigate = useNavigate();
  const { loginWithTwitter, user, isAuthenticated, loading: authLoading } = useAuth();
  const [activeAccordion, setActiveAccordion] = useState(null);

  // Fetch live deals
  const { data: liveDeals } = useQuery({
    queryKey: ['liveDeals'],
    queryFn: () => dealAPI.getLiveDeals(6),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['platformStats'],
    queryFn: async () => {
      // TODO: Create a stats endpoint that returns these values
      return {
        deals: liveDeals?.deals?.length || 0,
        value: '$0', // TODO: Calculate from deals
        advisors: 0 // TODO: Get KOL count
      };
    },
    enabled: !!liveDeals
  });

  if (authLoading) {
    return <Loading size="lg" className="mt-20" showMessage />;
  }

  const handleKOLConnect = () => {
    if (isAuthenticated) {
      navigate('/kol-dashboard');
    } else {
      loginWithTwitter();
    }
  };

  const handleProjectOffer = () => {
    if (isAuthenticated) {
      navigate('/project-dashboard');
    } else {
      loginWithTwitter();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <main className="space-y-20 p-8 max-w-6xl mx-auto">
        {/* Hero Section */}
        <section className="text-center space-y-6 pt-16">
          <h1 className="text-5xl font-extrabold text-gray-900">
            Turn crypto clout into transparent token grants
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Link Twitter, accept Solana tokens, and share every deal on-chain. No more backroom handshakes.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={handleKOLConnect}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transform hover:scale-105 transition duration-200 text-lg"
            >
              I'm a KOL — Connect Twitter
            </button>
            <button
              onClick={handleProjectOffer}
              className="bg-white text-gray-800 border-2 border-gray-300 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transform hover:scale-105 transition duration-200 text-lg"
            >
              I'm a Project — Make Offer
            </button>
          </div>
        </section>

        {/* Social Proof */}
        <section className="flex justify-center space-x-12">
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-lg">{stats?.deals || 0} deals executed</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="font-medium text-lg">{stats?.value || '$0'} vested</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-lg">{stats?.advisors || 0} advisors onboarded</span>
          </div>
        </section>

        {/* How It Works */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-gray-900">For KOLs</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 text-lg">
              <li>Link your Twitter handle & wallet</li>
              <li>Review & sign a Solana token grant</li>
              <li>Let the bot add required #ad disclosures</li>
              <li>Watch tokens vest on-chain—use or trade freely</li>
            </ol>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-gray-900">For Projects</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 text-lg">
              <li>Create an offer with vesting details</li>
              <li>Deposit Solana tokens into the vesting contract</li>
              <li>Let KOLs accept on-chain—no DMs needed</li>
              <li>Gain trust with a public deal ledger</li>
            </ol>
          </div>
        </section>

        {/* Compliance Flex */}
        <section className="bg-blue-50 p-10 rounded-2xl space-y-4">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-2xl font-semibold text-gray-900">Compliance baked in</h3>
          </div>
          <p className="text-gray-700 text-lg">
            We hard-coded SEC §17(b) and FTC disclosures into every agreement. No excuses, just transparency.
          </p>
          <a href="/SAATP.pdf" className="text-blue-600 hover:text-blue-700 underline text-lg font-medium">
            View the advisor agreement template →
          </a>
        </section>

        {/* Live Deals Feed */}
        <section>
          <h2 className="text-3xl font-semibold mb-6 text-gray-900">Live Deals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveDeals?.deals?.length > 0 ? (
              liveDeals.deals.map((deal) => (
                <div key={deal.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex items-center mb-3">
                    {deal.kol_profile_image && (
                      <img
                        src={deal.kol_profile_image}
                        alt={deal.kol_handle}
                        className="w-10 h-10 rounded-full mr-3"
                      />
                    )}
                    <h4 className="font-semibold text-gray-900">@{deal.kol_handle}</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    {deal.project_name} • {deal.token_amount} {deal.token_symbol}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Cliff: {deal.cliff_days} days • Total: {deal.total_vesting_days} days
                  </p>
                </div>
              ))
            ) : (
              <>
                {/* Placeholder cards */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h4 className="font-semibold text-gray-400">No deals yet</h4>
                  <p className="text-sm text-gray-400">Be the first!</p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Pricing */}
        <section className="space-y-8 text-center">
          <h2 className="text-3xl font-semibold text-gray-900">Pricing</h2>
          <div className="flex flex-col md:flex-row justify-center gap-8">
            <div className="bg-white rounded-xl shadow-lg p-8 space-y-4 flex-1 max-w-sm">
              <h3 className="text-2xl font-semibold text-gray-900">Free</h3>
              <p className="text-gray-600 text-lg">Unlimited offers • 0.02% platform fee</p>
              <button
                onClick={handleKOLConnect}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Get Started
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-8 space-y-4 flex-1 max-w-sm border-2 border-blue-500">
              <h3 className="text-2xl font-semibold text-gray-900">Pro</h3>
              <p className="text-gray-600 text-lg">White-label UI • Dedicated support • API access</p>
              <button className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition">
                Coming Soon
              </button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-6">
          <h2 className="text-3xl font-semibold text-gray-900">FAQ</h2>
          <div className="space-y-4">
            {[
              {
                q: "Is this legal in the U.S.?",
                a: "Yes. Every grant uses a standard SEC-compliant advisor agreement and on-chain disclosures."
              },
              {
                q: "Can I revoke a grant?",
                a: "Yes—projects retain revocation rights via the vesting contract until tokens unlock."
              },
              {
                q: "Why Solana only?",
                a: "We launched on Solana for fast, low-cost transactions. More chains coming soon."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === index ? null : index)}
                  className="w-full px-6 py-4 text-left font-medium text-gray-900 hover:bg-gray-50 transition flex justify-between items-center"
                >
                  {faq.q}
                  <svg
                    className={`w-5 h-5 text-gray-500 transform transition ${activeAccordion === index ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {activeAccordion === index && (
                  <div className="px-6 py-4 text-gray-600 border-t">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center space-y-6 pb-16">
          <h2 className="text-4xl font-bold text-gray-900">Ready to turn influence into tokens?</h2>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleKOLConnect}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transform hover:scale-105 transition duration-200 text-lg"
            >
              I'm a KOL — Connect Twitter
            </button>
            <button
              onClick={handleProjectOffer}
              className="bg-white text-gray-800 border-2 border-gray-300 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transform hover:scale-105 transition duration-200 text-lg"
            >
              I'm a Project — Make Offer
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 space-y-3 border-t pt-8">
          <div className="flex justify-center space-x-6">
            <a href="/docs" className="hover:text-gray-700">Docs</a>
            <a href="/audit" className="hover:text-gray-700">Audit Report</a>
            <a href="/SAATP.pdf" className="hover:text-gray-700">SAATP PDF</a>
            <a href="https://twitter.com/OpenAdvisor" className="hover:text-gray-700">@OpenAdvisor</a>
          </div>
          <p>OpenAdvisor is not a broker-dealer. Use at your own risk.</p>
        </footer>
      </main>
    </div>
  );
} 