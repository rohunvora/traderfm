import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectAPI, dealAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Loading from '../components/Loading';

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    token_symbol: '',
    token_address: '',
    description: '',
    website: '',
    twitter_handle: '',
    logo_url: ''
  });
  const [dealForm, setDealForm] = useState({
    kol_handle: '',
    token_amount: '',
    cliff_days: 30,
    total_vesting_days: 180,
    deliverables: '',
    offer_expires_days: 30
  });

  // Fetch user's projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['myProjects'],
    queryFn: () => projectAPI.getMyProjects(),
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data) => projectAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myProjects']);
      setShowCreateProject(false);
      setProjectForm({
        name: '',
        token_symbol: '',
        token_address: '',
        description: '',
        website: '',
        twitter_handle: '',
        logo_url: ''
      });
    },
  });

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: (data) => dealAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projectDeals']);
      setShowCreateDeal(false);
      setDealForm({
        kol_handle: '',
        token_amount: '',
        cliff_days: 30,
        total_vesting_days: 180,
        deliverables: '',
        offer_expires_days: 30
      });
    },
  });

  const handleCreateProject = (e) => {
    e.preventDefault();
    createProjectMutation.mutate(projectForm);
  };

  const handleCreateDeal = (e) => {
    e.preventDefault();
    createDealMutation.mutate({
      ...dealForm,
      project_id: selectedProjectId,
      vesting_schedule: `${dealForm.cliff_days} day cliff, ${dealForm.total_vesting_days} days total`
    });
  };

  if (projectsLoading) {
    return <Loading size="lg" className="mt-20" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Project Dashboard</h1>
              <p className="text-gray-600 mt-1">Create token grants and manage KOL relationships</p>
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
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Your Projects</h2>
            <button
              onClick={() => setShowCreateProject(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Create Project
            </button>
          </div>

          <div className="p-6">
            {projects?.projects?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.projects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        <p className="text-sm text-gray-600">{project.token_symbol}</p>
                      </div>
                      {project.logo_url && (
                        <img
                          src={project.logo_url}
                          alt={project.name}
                          className="w-10 h-10 rounded"
                        />
                      )}
                    </div>
                    
                    {project.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setShowCreateDeal(true);
                        }}
                        className="flex-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition"
                      >
                        Create Offer
                      </button>
                      <button
                        onClick={() => navigate(`/project/${project.id}/deals`)}
                        className="flex-1 text-sm bg-gray-200 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-300 transition"
                      >
                        View Deals
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No projects yet</p>
                <button
                  onClick={() => setShowCreateProject(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Create Your First Project
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Create Project Modal */}
        {showCreateProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">Create New Project</h3>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Token Symbol *
                    </label>
                    <input
                      type="text"
                      required
                      value={projectForm.token_symbol}
                      onChange={(e) => setProjectForm({ ...projectForm, token_symbol: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Token Address (Solana)
                  </label>
                  <input
                    type="text"
                    value={projectForm.token_address}
                    onChange={(e) => setProjectForm({ ...projectForm, token_address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional - Your token's Solana address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={projectForm.website}
                      onChange={(e) => setProjectForm({ ...projectForm, website: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Twitter Handle
                    </label>
                    <input
                      type="text"
                      value={projectForm.twitter_handle}
                      onChange={(e) => setProjectForm({ ...projectForm, twitter_handle: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="@yourproject"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={projectForm.logo_url}
                    onChange={(e) => setProjectForm({ ...projectForm, logo_url: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={createProjectMutation.isLoading}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {createProjectMutation.isLoading ? 'Creating...' : 'Create Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateProject(false)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Deal Modal */}
        {showCreateDeal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">Create Token Grant Offer</h3>
              <form onSubmit={handleCreateDeal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    KOL Handle
                  </label>
                  <input
                    type="text"
                    value={dealForm.kol_handle}
                    onChange={(e) => setDealForm({ ...dealForm, kol_handle: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="@kolhandle (optional - leave empty for open offer)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Token Amount *
                  </label>
                  <input
                    type="text"
                    required
                    value={dealForm.token_amount}
                    onChange={(e) => setDealForm({ ...dealForm, token_amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 100000"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cliff Period (days) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={dealForm.cliff_days}
                      onChange={(e) => setDealForm({ ...dealForm, cliff_days: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Vesting Period (days) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={dealForm.total_vesting_days}
                      onChange={(e) => setDealForm({ ...dealForm, total_vesting_days: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deliverables
                  </label>
                  <textarea
                    value={dealForm.deliverables}
                    onChange={(e) => setDealForm({ ...dealForm, deliverables: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="What you expect from the KOL (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Offer Expires In (days) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={dealForm.offer_expires_days}
                    onChange={(e) => setDealForm({ ...dealForm, offer_expires_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={createDealMutation.isLoading}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {createDealMutation.isLoading ? 'Creating...' : 'Create Offer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateDeal(false)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 