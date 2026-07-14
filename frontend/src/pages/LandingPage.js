import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import BotreeArrowLogo from '../components/BotreeArrowLogo';
import { 
  Play, FileText, Eye, Lightning, GitDiff, TrendUp, 
  CheckCircle, Clock, CurrencyDollar, ChartLine, Users, 
  Target, ArrowRight, Sparkle
} from '@phosphor-icons/react';

const ProposalLandingPage = () => {
  const navigate = useNavigate();
  const [liveActivity, setLiveActivity] = useState(0);

  useEffect(() => {
    const activities = [
      'Client viewed RFP section 4',
      'Proposal #482 signed',
      'Deal moved to Negotiation',
      'New RFQ from Acme Corp'
    ];
    const interval = setInterval(() => {
      setLiveActivity((prev) => (prev + 1) % activities.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const liveActivities = [
    { text: 'Client viewed RFP section 4', time: '2m ago', type: 'view' },
    { text: 'Proposal #482 signed', time: '5m ago', type: 'win' },
    { text: 'Deal moved to Negotiation', time: '12m ago', type: 'progress' },
    { text: 'New RFQ from Acme Corp', time: '18m ago', type: 'new' }
  ];

  const kpiMetrics = [
    { number: '12,000+', label: 'Proposals Tracked' },
    { number: '4.2x', label: 'Faster Turnaround' },
    { number: '$3.5B+', label: 'Handled Revenue' },
    { number: '99.8%', label: 'System Accuracy' }
  ];

  const features = [
    {
      icon: FileText,
      title: 'RFQ & Proposal Builder',
      description: 'Smart document assembly with AI-powered content suggestions and compliance checks.',
      benefits: ['Template library with 500+ formats', 'Auto-populate from CRM data', 'Real-time collaboration'],
      color: '#10B981',
      visual: 'document'
    },
    {
      icon: Eye,
      title: 'Live Activity & Engagement Tracking',
      description: 'Real-time visibility into client proposal interactions with page-level analytics.',
      benefits: ['Heat-map viewing analytics', 'Time-on-page metrics', 'Download & forward alerts'],
      color: '#1E3A8A',
      visual: 'heatmap'
    },
    {
      icon: Lightning,
      title: 'AI Win-Probability Engine',
      description: 'Machine learning predicts deal outcomes based on engagement patterns and historical data.',
      benefits: ['Predictive scoring 0-100%', 'Risk factor identification', 'Recommended next actions'],
      color: '#10B981',
      visual: 'gauge'
    },
    {
      icon: GitDiff,
      title: 'Redline & Version Control',
      description: 'Track every change with side-by-side comparison and automated approval workflows.',
      benefits: ['Track all revisions', 'Side-by-side diff view', 'Audit trail compliance'],
      color: '#1E3A8A',
      visual: 'diff'
    },
    {
      icon: TrendUp,
      title: 'Pipeline Intelligence',
      description: 'Advanced analytics dashboard showing win rates, deal velocity, and revenue forecasting.',
      benefits: ['Win/loss analysis', 'Bottleneck detection', 'Revenue predictions'],
      color: '#10B981',
      visual: 'chart'
    },
    {
      icon: Users,
      title: 'Multi-Stage Approval Workflow',
      description: 'Automated routing through Sales, Finance, Legal, and C-level approvers with notifications.',
      benefits: ['Custom workflow stages', 'Parallel approvals', 'Escalation rules'],
      color: '#1E3A8A',
      visual: 'workflow'
    }
  ];

  const pipelineStages = [
    { 
      name: 'Drafting', 
      count: 12, 
      deals: [
        { title: 'Enterprise SaaS Deal', value: '$450K', owner: 'SM', days: 3, color: '#10B981' },
        { title: 'Cloud Migration Proposal', value: '$280K', owner: 'JD', days: 5, color: '#10B981' }
      ]
    },
    { 
      name: 'Client Review', 
      count: 8, 
      deals: [
        { title: 'Security Audit RFP', value: '$180K', owner: 'AK', days: 8, color: '#F59E0B' },
        { title: 'Digital Transformation', value: '$1.2M', owner: 'RP', days: 12, color: '#EF4444' }
      ]
    },
    { 
      name: 'Negotiation', 
      count: 5, 
      deals: [
        { title: 'API Integration Project', value: '$95K', owner: 'MC', days: 4, color: '#10B981' }
      ]
    },
    { 
      name: 'Won', 
      count: 23, 
      deals: [
        { title: 'Data Analytics Platform', value: '$680K', owner: 'TL', days: 0, color: '#10B981' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B192C] relative overflow-hidden">
      {/* Dot Matrix Background */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle, #1E3A8A 1.5px, transparent 1.5px)`,
            backgroundSize: '24px 24px'
          }}
        ></div>
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-emerald-500/10 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-blue-900/10 to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-gray-700/50 bg-[#0B192C]/90 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BotreeArrowLogo size="md" />
                <span className="text-2xl font-display font-black text-white">BOTREE</span>
              </div>
              <nav className="hidden md:flex items-center gap-8 font-body text-sm">
                <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
                <a href="#pipeline" className="text-gray-300 hover:text-white transition-colors">Pipeline</a>
                <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
                <Button
                  onClick={() => navigate('/login')}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-white/10"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-gradient-to-r from-pink-600 to-purple-700 text-white font-bold"
                >
                  Request Demo
                </Button>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div>
                <div className="inline-block mb-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                  <span className="text-emerald-400 text-sm font-bold flex items-center gap-2">
                    <Sparkle size={16} weight="fill" />
                    AI-Powered Proposal Intelligence
                  </span>
                </div>

                <h1 className="text-5xl lg:text-6xl font-display font-black text-white mb-6 leading-tight">
                  Track Proposals. <br />
                  Predict Wins. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                    Close Enterprise Deals with Precision.
                  </span>
                </h1>

                <p className="text-xl text-gray-300 mb-8 font-body leading-relaxed">
                  End-to-end proposal lifecycle management with real-time client engagement tracking, AI-powered win probability scoring, and intelligent workflow automation. Trusted by enterprise sales teams closing $3.5B+ annually.
                </p>
                
                <div className="flex flex-wrap gap-4 mb-12">
                  <Button
                    size="lg"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-6 text-lg"
                    onClick={() => navigate('/login')}
                  >
                    <Target size={20} className="mr-2" weight="fill" />
                    Request Demo
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white/10 font-bold px-8 py-6 text-lg"
                  >
                    <Play size={20} className="mr-2" weight="fill" />
                    Explore Platform
                  </Button>
                </div>

                {/* Trust Logos */}
                <div className="pt-8 border-t border-gray-700/50">
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4 block">
                    Trusted by Enterprise Sales Teams
                  </span>
                  <div className="flex flex-wrap items-center gap-8">
                    {['Microsoft', 'Salesforce', 'SAP', 'Oracle'].map((brand) => (
                      <div key={brand} className="text-gray-400/60 font-bold text-base">{brand}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Dashboard Mockup */}
              <div className="relative">
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
                  {/* Top Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                      <div className="relative">
                        <div className="text-3xl font-black text-white mb-1">+24%</div>
                        <div className="text-xs text-emerald-100 font-semibold">Win Rate</div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                      <div className="relative">
                        <div className="text-2xl font-black text-white mb-1">$42.6M</div>
                        <div className="text-xs text-blue-100 font-semibold">Pipeline Value</div>
                      </div>
                    </div>
                  </div>

                  {/* Funnel Chart */}
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 mb-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-xl"></div>
                    <div className="relative space-y-2">
                      {[
                        { stage: 'Leads', width: 100, count: 450 },
                        { stage: 'Qualified', width: 75, count: 180 },
                        { stage: 'Proposal', width: 50, count: 95 },
                        { stage: 'Negotiation', width: 30, count: 42 },
                        { stage: 'Closed', width: 20, count: 28 }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-24 text-xs text-gray-400 font-semibold">{item.stage}</div>
                          <div 
                            className="h-8 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded flex items-center justify-end px-3 text-white text-xs font-bold"
                            style={{ width: `${item.width}%` }}
                          >
                            {item.count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Activity Feed */}
                  <div className="bg-gray-900/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Live Activity</span>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      {liveActivities.slice(0, 3).map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-xs">
                          <div className={`w-1.5 h-1.5 mt-1.5 rounded-full ${
                            activity.type === 'win' ? 'bg-emerald-500' : 
                            activity.type === 'view' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}></div>
                          <div className="flex-1">
                            <div className="text-gray-300 font-medium">{activity.text}</div>
                            <div className="text-gray-500 text-xs">{activity.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KPI Metrics Strip */}
        <section className="bg-gradient-to-r from-emerald-600 to-emerald-700 py-12 border-y border-emerald-500/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {kpiMetrics.map((metric, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-4xl font-display font-black text-white mb-2">{metric.number}</div>
                  <div className="text-sm text-emerald-100 font-semibold">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-display font-black text-white mb-4">
                Enterprise Proposal Management Suite
              </h2>
              <p className="text-xl text-gray-400 font-body max-w-3xl mx-auto">
                Complete toolkit for tracking, optimizing, and closing high-value enterprise deals
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 relative overflow-hidden"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <div className="absolute inset-0" style={{
                      background: `radial-gradient(circle at 30% 30%, ${feature.color}40, transparent)`
                    }}></div>
                    <feature.icon size={28} style={{ color: feature.color }} weight="duotone" className="relative z-10" />
                  </div>
                  
                  <h3 className="text-xl font-heading font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="text-sm text-gray-400 mb-4 font-body leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-2 mb-4">
                    {feature.benefits.map((benefit, bidx) => (
                      <li key={bidx} className="flex items-start gap-2 text-xs text-gray-300">
                        <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" weight="fill" />
                        <span className="font-body">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Mini Visual */}
                  <div className="h-24 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg flex items-center justify-center border border-white/5">
                    {feature.visual === 'gauge' && (
                      <div className="relative w-20 h-20">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#1E3A8A" strokeWidth="8" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            fill="none" 
                            stroke="#10B981" 
                            strokeWidth="8"
                            strokeDasharray="251.2"
                            strokeDashoffset="62.8"
                            transform="rotate(-90 50 50)"
                          />
                          <text x="50" y="55" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">82%</text>
                        </svg>
                      </div>
                    )}
                    {feature.visual === 'heatmap' && (
                      <div className="grid grid-cols-8 gap-1">
                        {[...Array(32)].map((_, i) => (
                          <div 
                            key={i} 
                            className="w-3 h-3 rounded-sm"
                            style={{
                              backgroundColor: feature.color,
                              opacity: Math.random() * 0.8 + 0.2
                            }}
                          ></div>
                        ))}
                      </div>
                    )}
                    {(feature.visual === 'document' || feature.visual === 'chart' || feature.visual === 'workflow' || feature.visual === 'diff') && (
                      <div className="flex gap-2 items-end h-full py-4">
                        {[40, 70, 50, 85, 60, 90].map((h, i) => (
                          <div
                            key={i}
                            className="w-4 rounded-t"
                            style={{
                              height: `${h}%`,
                              backgroundColor: feature.color,
                              opacity: 0.7
                            }}
                          ></div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pipeline Visualizer */}
        <section id="pipeline" className="py-20 bg-gradient-to-b from-[#0B192C] to-[#1E3A8A]/20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-display font-black text-white mb-4">
                Real-Time Sales Pipeline Intelligence
              </h2>
              <p className="text-lg text-gray-400 font-body">
                Kanban-style deal tracking with automated aging alerts and win probability scoring
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {pipelineStages.map((stage, idx) => (
                <div key={idx} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{stage.name}</h3>
                    <span className="bg-white/10 px-2 py-1 rounded-full text-xs font-bold text-gray-300">
                      {stage.count}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {stage.deals.map((deal, didx) => (
                      <div 
                        key={didx} 
                        className="bg-gray-900/50 rounded-lg p-3 border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm font-semibold text-white line-clamp-1 flex-1">
                            {deal.title}
                          </div>
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ml-2"
                            style={{ backgroundColor: `${deal.color}30`, color: deal.color }}
                          >
                            {deal.owner}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-400 font-bold text-sm">{deal.value}</span>
                          {deal.days > 0 && (
                            <span 
                              className={`text-xs font-semibold flex items-center gap-1 ${
                                deal.days > 10 ? 'text-red-400' : deal.days > 7 ? 'text-amber-400' : 'text-gray-400'
                              }`}
                            >
                              <Clock size={12} weight="fill" />
                              {deal.days}d
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <button className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors font-semibold flex items-center justify-center gap-2">
                      <span>+ Add Deal</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-emerald-600 to-emerald-700 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
          </div>
          
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl font-display font-black text-white mb-6">
              Ready to Close More Deals?
            </h2>
            <p className="text-xl text-emerald-100 mb-8 font-body">
              Join 12,000+ sales professionals tracking $3.5B+ in annual revenue.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                className="bg-white text-emerald-600 hover:bg-gray-100 font-bold px-12 py-6 text-lg shadow-2xl"
                onClick={() => navigate('/login')}
              >
                Start Free Trial
                <ArrowRight size={20} className="ml-2" weight="bold" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/10 font-bold px-12 py-6 text-lg"
              >
                Schedule Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#0B192C] border-t border-gray-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <BotreeArrowLogo size="sm" />
                  <span className="text-xl font-display font-black">BOTREE</span>
                </div>
                <p className="text-gray-400 text-sm font-body">
                  AI-Powered Proposal Intelligence
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-4 text-sm">Product</h4>
                <ul className="space-y-2 text-sm text-gray-400 font-body">
                  <li className="hover:text-white cursor-pointer">Features</li>
                  <li className="hover:text-white cursor-pointer">Pricing</li>
                  <li className="hover:text-white cursor-pointer">Enterprise</li>
                  <li className="hover:text-white cursor-pointer">Integrations</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4 text-sm">Company</h4>
                <ul className="space-y-2 text-sm text-gray-400 font-body">
                  <li className="hover:text-white cursor-pointer">About</li>
                  <li className="hover:text-white cursor-pointer">Customers</li>
                  <li className="hover:text-white cursor-pointer">Careers</li>
                  <li className="hover:text-white cursor-pointer">Contact</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4 text-sm">Resources</h4>
                <ul className="space-y-2 text-sm text-gray-400 font-body">
                  <li className="hover:text-white cursor-pointer">Documentation</li>
                  <li className="hover:text-white cursor-pointer">API</li>
                  <li className="hover:text-white cursor-pointer">Support</li>
                  <li className="hover:text-white cursor-pointer">Status</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500 font-body">
              © 2024 Botree Software. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ProposalLandingPage;
