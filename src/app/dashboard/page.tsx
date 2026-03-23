'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  Users,
  Warehouse,
  Send,
  Receipt,
  Activity,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  FileSpreadsheet,
  Database
} from 'lucide-react';

interface DashboardStats {
  totalParties: number;
  totalItems: number;
  pendingChallans: number;
  pendingInvoices: number;
  totalChallans?: number;
  totalInvoices?: number;
  totalGRNs?: number;
  totalBOMs?: number;
  totalGSTs?: number;
}

interface RecentActivity {
  type: 'grn' | 'challan' | 'invoice';
  number: string;
  party: string;
  date: string;
  amount?: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
        // Mock recent activities - you can fetch this from API later
        setRecentActivities([
          { type: 'invoice', number: 'INV0006', party: 'Tata Steel Ltd', date: '2 hours ago', amount: 45000 },
          { type: 'challan', number: 'OC-0012', party: 'JSW Steel', date: '5 hours ago' },
          { type: 'grn', number: 'GRN-0008', party: 'Vedanta Ltd', date: '1 day ago' },
        ]);
      } else {
        console.error('Failed to fetch dashboard stats:', result.error);
        setStats({
          totalParties: 0,
          totalItems: 0,
          pendingChallans: 0,
          pendingInvoices: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setStats({
        totalParties: 0,
        totalItems: 0,
        pendingChallans: 0,
        pendingInvoices: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Loading your workspace..." />;
  }

  const statCards = [
    {
      title: 'Total Parties',
      value: stats?.totalParties || 0,
      icon: Users,
      ringColor: 'ring-blue-500/10',
      bgGradient: 'from-blue-50/50 to-white',
      iconBg: 'bg-blue-600',
      iconColor: 'text-white',
      link: '/masters/party',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Total Items',
      value: stats?.totalItems || 0,
      icon: Package,
      ringColor: 'ring-purple-500/10',
      bgGradient: 'from-purple-50/50 to-white',
      iconBg: 'bg-purple-600',
      iconColor: 'text-white',
      link: '/masters/item',
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Total Challans',
      value: stats?.totalChallans || 0,
      icon: Send,
      ringColor: 'ring-indigo-500/10',
      bgGradient: 'from-indigo-50/50 to-white',
      iconBg: 'bg-indigo-600',
      iconColor: 'text-white',
      link: '/outward-challan',
      trend: '+15%',
      trendUp: true,
    },
    {
      title: 'Total Invoices',
      value: stats?.totalInvoices || 0,
      icon: Receipt,
      ringColor: 'ring-emerald-500/10',
      bgGradient: 'from-emerald-50/50 to-white',
      iconBg: 'bg-emerald-600',
      iconColor: 'text-white',
      link: '/tax-invoice',
      trend: '+10%',
      trendUp: true,
    },
  ];

  const quickActions = [
    {
      title: 'Create GRN',
      description: 'Record new goods receipt',
      icon: FileText,
      link: '/grn',
      color: 'from-blue-600 to-sky-500',
      shadowColor: 'shadow-blue-500/30',
    },
    {
      title: 'Outward Challan',
      description: 'Create new outward challan',
      icon: Send,
      link: '/outward-challan',
      color: 'from-indigo-600 to-violet-500',
      shadowColor: 'shadow-indigo-500/30',
    },
    {
      title: 'Tax Invoice',
      description: 'Generate tax invoice',
      icon: Receipt,
      link: '/tax-invoice',
      color: 'from-fuchsia-600 to-purple-600',
      shadowColor: 'shadow-purple-500/30',
    },
  ];

  const masterLinks = [
    { title: 'Party Master', icon: Users, link: '/masters/party', count: stats?.totalParties || 0 },
    { title: 'Item Master', icon: Boxes, link: '/masters/item', count: stats?.totalItems || 0 },
    { title: 'BOM Master', icon: FileSpreadsheet, link: '/masters/bom', count: stats?.totalBOMs || 0 },
    { title: 'GST Master', icon: BarChart3, link: '/masters/gst', count: stats?.totalGSTs || 0 },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'invoice': return Receipt;
      case 'challan': return Send;
      case 'grn': return FileText;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'invoice': return 'bg-emerald-100 text-emerald-600 border border-emerald-200';
      case 'challan': return 'bg-indigo-100 text-indigo-600 border border-indigo-200';
      case 'grn': return 'bg-sky-100 text-sky-600 border border-sky-200';
      default: return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  return (
    <div className="animate-fade-in space-y-6 relative max-w-7xl mx-auto">
      
      {/* Decorative subtle background elements */}
      <div className="fixed top-20 left-10 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-[90px] opacity-30 pointer-events-none -z-10"></div>
      <div className="fixed bottom-20 right-10 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-[90px] opacity-30 pointer-events-none -z-10"></div>
      
      {/* 1. Stunning Hero Section (Reduced Size) */}
      <div className="relative overflow-hidden rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-indigo-600/10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900"></div>
        {/* Abstract glowing shapes inside header */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/20 rounded-full blur-[60px]"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-fuchsia-500/30 rounded-full blur-[60px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4 font-medium text-xs text-indigo-50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              System Online
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold mb-1.5 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-100">
              Welcome to DWPL
            </h1>
            <p className="text-indigo-100/90 text-sm lg:text-base font-medium max-w-lg">
              Advanced Manufacturing Management System for seamless daily operations.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
            <p className="text-[10px] font-semibold text-indigo-100 uppercase tracking-widest mb-1 opacity-80">Today's Date</p>
            <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <Clock className="w-4 h-4 text-indigo-200 mt-1.5 opacity-60" />
          </div>
        </div>
      </div>

      {/* 2. Upgraded Stats Grid (Reduced Size) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.link}>
            <div className={`cursor-pointer overflow-hidden group relative p-5 rounded-3xl bg-white ring-1 ring-inset ${stat.ringColor} shadow-lg shadow-slate-200/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 block`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 opacity-100 z-0"></div>
                
                <div className="absolute -bottom-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-all duration-700 transform group-hover:scale-110 group-hover:-rotate-12 z-0">
                   <stat.icon className="w-24 h-24" />
                </div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`${stat.iconBg} p-2.5 rounded-xl shadow-md transform group-hover:-translate-y-0.5 group-hover:scale-105 transition-all duration-300 ring-2 ring-white`}>
                      <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                    </div>
                    <div className={`flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-white shadow-sm ring-1 ring-slate-100 ${stat.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {stat.trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                      {stat.trend}
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-1 group-hover:text-blue-600 transition-colors">
                      {stat.value}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {stat.title}
                    </p>
                  </div>
                </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 3. Sexy Quick Actions Grid (Reduced Size) */}
      <div>
        <div className="flex items-center gap-2.5 mb-5 px-1">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.link} className="block group">
              <div className={`relative p-5 rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-lg ${action.shadowColor} hover:shadow-xl h-[150px] flex flex-col justify-end`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-90 transition-opacity duration-300 group-hover:opacity-100`}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                
                {/* Flowing animated abstract blob */}
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 group-hover:scale-125 transition-all duration-700 ease-in-out"></div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl w-fit mb-3 shadow-inner ring-1 ring-white/30 transform group-hover:scale-105 transition-transform duration-300 ease-out">
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="mt-auto transform transition-transform duration-300 translate-y-1.5 group-hover:translate-y-0">
                    <h3 className="font-extrabold text-lg text-white tracking-tight mb-0.5">{action.title}</h3>
                    <p className="text-white/80 font-medium text-[11px] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">{action.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Two Column Layout for Activity and Masters (Reduced Size) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Window */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-2xl border border-white p-6 rounded-3xl shadow-lg shadow-slate-200/40 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                  Recent Activity
                </h2>
              </div>
              <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-2 transition-all">
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recentActivities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div key={index} className="flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-slate-50 transition-all duration-200 cursor-pointer border border-slate-100 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-500/5 transform hover:-translate-y-0.5">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${getActivityColor(activity.type)} shadow-sm`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 text-sm mb-0.5 tracking-tight group-hover:text-indigo-600">
                          {activity.number}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          {activity.party}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      {activity.amount && (
                        <p className="font-extrabold text-slate-900 text-sm">
                          ₹{activity.amount.toLocaleString('en-IN')}
                        </p>
                      )}
                      <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full inline-flex items-center uppercase tracking-wider">
                        <Clock className="w-3 h-3 mr-1 opacity-70" />
                        {activity.date}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Master Data Links Panel (Reduced Size) */}
        <div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 p-6 rounded-3xl shadow-lg shadow-slate-200/30 h-full">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Database className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                Master Directories
              </h2>
            </div>
            <div className="space-y-3">
              {masterLinks.map((master) => (
                <Link key={master.title} href={master.link}>
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-white/60 transition-all cursor-pointer group border border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                    <div className="flex items-center space-x-3">
                      <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg group-hover:bg-blue-600 group-hover:border-blue-600 transition-colors duration-200 shadow-sm">
                        <master.icon className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors duration-200" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 group-hover:text-blue-900 transition-colors">
                        {master.title}
                      </span>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors border border-slate-200 group-hover:border-blue-200">
                      {master.count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Premium System Status Footer (Reduced Size) */}
      <div className="bg-white/80 backdrop-blur-xl border border-white p-4 lg:p-5 rounded-3xl shadow-lg shadow-indigo-500/5 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 px-2">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-30 hidden md:block"></div>
              <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 p-2.5 rounded-xl relative z-10 shadow-sm ring-1 ring-emerald-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Status</p>
              <p className="font-extrabold text-slate-800 text-sm">Operational</p>
            </div>
          </div>
          
          <div className="h-10 w-px bg-slate-200 hidden md:block"></div>

          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-2.5 rounded-xl shadow-sm ring-1 ring-blue-200/60 transition-transform hover:scale-105 cursor-default">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Database</p>
              <p className="font-extrabold text-slate-800 text-sm">Connected</p>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-200 hidden md:block"></div>

          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-fuchsia-100 to-fuchsia-50 p-2.5 rounded-xl shadow-sm ring-1 ring-fuchsia-200/60 transition-transform hover:scale-105 cursor-default">
              <BarChart3 className="w-4 h-4 text-fuchsia-600" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Platform</p>
              <p className="font-extrabold text-slate-800 text-sm">DWPL v2.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
