import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Play, TrendUp, Package, MapPin, ChartBar, Users, CheckCircle, Star } from '@phosphor-icons/react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeMetric, setActiveMetric] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMetric((prev) => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const metrics = [
    { value: '+34%', label: 'Efficiency Gain' },
    { value: '$1.8B+', label: 'GMV Tracked' },
    { value: '99.8%', label: 'Uptime SLA' }
  ];

  const trustStats = [
    { number: '100k+', label: 'Distributors Onboarded' },
    { number: '$2B+', label: 'Annual Transactions' },
    { number: '50+', label: 'Countries Served' },
    { number: '10M+', label: 'Daily API Calls' }
  ];

  const features = [
    {
      icon: Package,
      title: 'DMS - Distributor Management',
      description: 'End-to-end visibility across your distribution network with real-time inventory tracking and automated order processing.',
      benefits: ['Real-time stock sync', 'Auto-replenishment', 'Multi-warehouse orchestration'],
      color: '#10B981'
    },
    {
      icon: Users,
      title: 'SFA - Sales Force Automation',
      description: 'Empower your field teams with intelligent route planning, geo-attendance, and instant order capture on mobile.',
      benefits: ['GPS-based tracking', 'Offline-first mobile app', 'Target vs achievement analytics'],
      color: '#1E3A8A'
    },
    {
      icon: MapPin,
      title: 'AI Route Optimization',
      description: 'Machine learning algorithms reduce delivery costs by 28% through dynamic route planning and predictive demand modeling.',
      benefits: ['Fuel cost reduction', 'Delivery time prediction', 'Load optimization'],
      color: '#10B981'
    },
    {
      icon: ChartBar,
      title: 'Retailer Analytics',
      description: 'Actionable insights from POS data, market trends, and customer behavior patterns to drive strategic decisions.',
      benefits: ['Demand forecasting', 'Inventory optimization', 'Churn prediction'],
      color: '#1E3A8A'
    },
    {
      icon: TrendUp,
      title: 'Supply Chain Intelligence',
      description: 'Predictive analytics for demand forecasting, risk management, and automated procurement recommendations.',
      benefits: ['Predictive alerts', 'Supplier scorecards', 'Cost analytics'],
      color: '#10B981'
    },
    {
      icon: CheckCircle,
      title: 'Enterprise Integration',
      description: 'Seamless connectivity with SAP, Oracle, Salesforce, and custom ERPs through our enterprise-grade API infrastructure.',
      benefits: ['REST & GraphQL APIs', 'Webhook automation', 'Custom connectors'],
      color: '#1E3A8A'
    }
  ];

  const testimonials = [
    {
      quote: 'Botree transformed our supply chain operations. We achieved 40% faster delivery times and reduced operational costs by $2M annually.',
      name: 'Rajesh Kumar',
      title: 'Former CIO, Dabur Global',
      rating: 5
    },
    {
      quote: 'The AI-powered route optimization alone saved us 30% in logistics costs. The platform pays for itself within 3 months.',
      name: 'Sarah Chen',
      title: 'VP Operations, Unilever APAC',
      rating: 5
    },
    {
      quote: 'Best-in-class enterprise solution. Their API integration was seamless and the real-time visibility has been game-changing.',
      name: 'Michael Roberts',
      title: 'COO, Coca-Cola Bottling',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background Patterns */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle, #1E3A8A 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }}></div>
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-cyan-500/10 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-blue-900/10 to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-600 to-purple-700 rounded-lg"></div>
                <span className="text-xl font-display font-black">BOTREE</span>
              </div>
              <nav className="hidden md:flex items-center gap-8 font-body text-sm">
                <a href="#features" className="text-gray-700 hover:text-gray-900">Features</a>
                <a href="#customers" className="text-gray-700 hover:text-gray-900">Customers</a>
                <a href="#pricing" className="text-gray-700 hover:text-gray-900">Pricing</a>
                <Button
                  onClick={() => navigate('/login')}
                  variant="outline"
                  className="border-gray-300"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-gradient-to-r from-pink-600 to-purple-700 text-white"
                >
                  Get Started
                </Button>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-[#0B192C] to-[#1E3A8A] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-64 h-64 bg-cyan-400 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div>
                <h1 className="text-5xl lg:text-6xl font-display font-black text-white mb-6 leading-tight">
                  Scale Smarter. <br />
                  Automate Smarter. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-green-400">
                    AI-Powered Enterprise Supply Chains.
                  </span>
                </h1>
                <p className="text-xl text-gray-300 mb-8 font-body leading-relaxed">
                  Transform your logistics operations with intelligent automation, predictive analytics, and real-time visibility across your entire distribution network. Trusted by Fortune 500 companies worldwide.
                </p>
                
                <div className="flex flex-wrap gap-4 mb-12">
                  <Button
                    size="lg"
                    className="bg-[#10B981] hover:bg-[#059669] text-white font-bold px-8 py-6 text-lg"
                    onClick={() => navigate('/login')}
                  >
                    Get Started Free
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white/10 font-bold px-8 py-6 text-lg"
                  >
                    <Play size={20} className="mr-2" weight="fill" />
                    Watch Demo
                  </Button>
                </div>

                {/* Client Logos */}
                <div className="flex flex-wrap items-center gap-8 pt-8 border-t border-white/20">
                  <span className="text-gray-400 text-sm font-semibold">TRUSTED BY:</span>
                  {['Unilever', 'Dabur', 'Coca-Cola', 'P&G'].map((brand) => (
                    <div key={brand} className="text-white/60 font-bold text-lg">{brand}</div>
                  ))}
                </div>
              </div>

              {/* Right Dashboard Mockup */}
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl">
                  {/* Mini Metrics */}
                  <div className="flex gap-4 mb-6">
                    {metrics.map((metric, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 bg-gradient-to-br ${
                          activeMetric === idx ? 'from-[#10B981] to-[#059669]' : 'from-gray-800 to-gray-900'
                        } rounded-lg p-3 transition-all duration-500`}
                      >
                        <div className="text-2xl font-black text-white">{metric.value}</div>
                        <div className="text-xs text-white/80">{metric.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Globe Visualization */}
                  <div className="relative h-64 bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl flex items-center justify-center mb-4">
                    <div className="relative w-48 h-48">
                      <div className="absolute inset-0 rounded-full border-4 border-cyan-400/30 animate-pulse"></div>
                      <div className="absolute inset-4 rounded-full border-4 border-cyan-400/50"></div>
                      <div className="absolute inset-8 rounded-full border-4 border-cyan-400/70"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin size={48} className="text-cyan-400" weight="fill" />
                      </div>
                    </div>
                    
                    {/* Floating Metrics */}
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      +34% Efficiency
                    </div>
                    <div className="absolute bottom-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      $1.8B+ GMV
                    </div>
                  </div>

                  {/* Mini Chart */}
                  <div className="h-20 bg-gray-900/50 rounded-lg flex items-end justify-around p-2">
                    {[40, 65, 45, 80, 60, 90, 70].map((height, i) => (
                      <div
                        key={i}
                        className="w-8 bg-gradient-to-t from-cyan-500 to-green-400 rounded-t"
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Metrics Strip */}
        <section className="bg-gradient-to-r from-[#10B981] to-[#059669] py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {trustStats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-4xl font-display font-black text-white mb-2">{stat.number}</div>
                  <div className="text-sm text-white/90 font-semibold">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section id="features" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-display font-black text-gray-900 mb-4">
                Enterprise-Grade Supply Chain Platform
              </h2>
              <p className="text-xl text-gray-600 font-body max-w-3xl mx-auto">
                Comprehensive suite of AI-powered tools designed for modern logistics and distribution operations
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <feature.icon size={28} style={{ color: feature.color }} weight="duotone" />
                  </div>
                  
                  <h3 className="text-xl font-heading font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-4 font-body leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, bidx) => (
                      <li key={bidx} className="flex items-start gap-2 text-xs text-gray-700">
                        <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" weight="fill" />
                        <span className="font-body">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Mini Preview */}
                  <div className="mt-4 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                    <div className="flex gap-1">
                      {[30, 50, 40, 70, 45, 80].map((h, i) => (
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="customers" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-display font-black text-gray-900 mb-4">
                  What Global Leaders Say
                </h2>
                <p className="text-lg text-gray-600 font-body">
                  Join 100,000+ supply chain professionals who trust Botree for their mission-critical operations.
                </p>
              </div>

              <div className="space-y-6">
                {testimonials.map((testimonial, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 shadow-lg"
                  >
                    <div className="flex gap-1 mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} size={20} weight="fill" className="text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-gray-700 text-sm mb-4 font-body italic leading-relaxed">
                      "{testimonial.quote}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-600 to-purple-700"></div>
                      <div>
                        <div className="font-bold text-sm text-gray-900">{testimonial.name}</div>
                        <div className="text-xs text-gray-600">{testimonial.title}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-[#0B192C] to-[#1E3A8A]">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-display font-black text-white mb-6">
              Ready to Transform Your Supply Chain?
            </h2>
            <p className="text-xl text-gray-300 mb-8 font-body">
              Join leading enterprises and start optimizing your operations today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                className="bg-[#10B981] hover:bg-[#059669] text-white font-bold px-12 py-6 text-lg"
                onClick={() => navigate('/login')}
              >
                Start Free Trial
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
        <footer className="bg-[#0B192C] text-white py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="text-xl font-display font-black mb-4">BOTREE</div>
                <p className="text-gray-400 text-sm font-body">
                  AI-Powered Supply Chain Intelligence
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-4 text-sm">Product</h4>
                <ul className="space-y-2 text-sm text-gray-400 font-body">
                  <li>Features</li>
                  <li>Pricing</li>
                  <li>Enterprise</li>
                  <li>API</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4 text-sm">Company</h4>
                <ul className="space-y-2 text-sm text-gray-400 font-body">
                  <li>About</li>
                  <li>Customers</li>
                  <li>Careers</li>
                  <li>Contact</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4 text-sm">Legal</h4>
                <ul className="space-y-2 text-sm text-gray-400 font-body">
                  <li>Privacy</li>
                  <li>Terms</li>
                  <li>Security</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-400 font-body">
              © 2024 Botree Software. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
