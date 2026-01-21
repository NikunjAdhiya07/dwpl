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
  FileSpreadsheet
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
    return <Loading message="Loading dashboard..." />;
  }

  const statCards = [
    {
      title: 'Total Parties',
      value: stats?.totalParties || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      link: '/masters/party',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Total Items',
      value: stats?.totalItems || 0,
      icon: Package,
      color: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      link: '/masters/item',
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Total Challans',
      value: stats?.totalChallans || 0,
      icon: Send,
      color: 'from-indigo-500 to-indigo-600',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      link: '/outward-challan',
      trend: '+15%',
      trendUp: true,
    },
    {
      title: 'Total Invoices',
      value: stats?.totalInvoices || 0,
      icon: Receipt,
      color: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
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
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Outward Challan',
      description: 'Create new outward challan',
      icon: Send,
      link: '/outward-challan',
      color: 'from-indigo-500 to-indigo-600',
      hoverColor: 'hover:from-indigo-600 hover:to-indigo-700',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Tax Invoice',
      description: 'Generate tax invoice',
      icon: Receipt,
      link: '/tax-invoice',
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
      iconColor: 'text-purple-600',
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
      case 'invoice': return 'bg-green-100 text-green-600';
      case 'challan': return 'bg-indigo-100 text-indigo-600';
      case 'grn': return 'bg-blue-100 text-blue-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header with Welcome Message */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome to DWPL</h1>
            <p className="text-indigo-100 text-lg">Manufacturing Management System</p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-indigo-100">Today's Date</p>
              <p className="text-xl font-semibold">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Enhanced with Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.link}>
            <Card hover className="cursor-pointer overflow-hidden group">
              <div className="relative">
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${stat.iconBg} p-3 rounded-xl`}>
                      <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                    </div>
                    <div className={`flex items-center text-sm font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.trendUp ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                      {stat.trend}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      {stat.title}
                    </p>
                    <p className="text-4xl font-bold" style={{ color: 'var(--foreground)' }}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions - Enhanced Design */}
      <div>
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.link}>
              <div className={`bg-gradient-to-br ${action.color} ${action.hoverColor} rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden`}>
                {/* Hover overlay for subtle brightness */}
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                
                <div className="relative flex flex-col items-center text-center">
                  {/* Icon container with solid white background */}
                  <div className="bg-white p-4 rounded-2xl mb-4 group-hover:scale-105 transition-all duration-300 shadow-sm">
                    <action.icon className={`w-8 h-8 ${action.iconColor}`} strokeWidth={2} />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-white">
                    {action.title}
                  </h3>
                  <p className="text-sm text-white opacity-90 group-hover:opacity-100">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - 2/3 width */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                Recent Activity
              </h2>
              <Activity className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-white transition-all cursor-pointer border border-gray-100 hover:border-gray-300 hover:shadow-lg transform hover:-translate-y-0.5">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${getActivityColor(activity.type)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {activity.number}
                        </p>
                        <p className="text-sm text-gray-600">
                          {activity.party}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {activity.amount && (
                        <p className="font-semibold text-green-600">
                          ₹{activity.amount.toLocaleString('en-IN')}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {activity.date}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Master Links - 1/3 width */}
        <div>
          <Card>
            <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>
              Master Data
            </h2>
            <div className="space-y-3">
              {masterLinks.map((master) => (
                <Link key={master.title} href={master.link}>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-white transition-all cursor-pointer group border border-gray-100 hover:border-gray-300 hover:shadow-lg transform hover:-translate-y-0.5">
                    <div className="flex items-center space-x-3">
                      <master.icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600 group-hover:scale-110 transition-all" />
                      <span className="font-medium text-gray-900">
                        {master.title}
                      </span>
                    </div>
                    <span className="text-sm font-bold px-3 py-1.5 rounded-full bg-white text-gray-900 shadow-sm border border-gray-200">
                      {master.count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* System Status - Clean & Minimal */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-6 p-2">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">System Status</p>
              <p className="font-bold text-gray-900">Operational</p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Database</p>
              <p className="font-bold text-gray-900">Connected</p>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Version</p>
              <p className="font-bold text-gray-900">v1.0.0</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
