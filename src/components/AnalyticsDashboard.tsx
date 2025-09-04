import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Patient } from './TriageSystem';

import { useState, useEffect } from 'react';

const API_BASE = (((import.meta as any)?.env?.VITE_API_BASE_URL) || 'http://127.0.0.1:5000').replace(/\/$/, '');

interface AnalyticsDashboardProps {
  patients: Patient[];
}

interface AnalyticsData {
  totalPatients: number;
  criticalPatients: number;
  completedPatients: number;
  inProgressPatients: number;
  waitingPatients: number;
  avgWaitTime: number;
  priorityData: any[];
  statusData: any[];
  ageData: any[];
  hourlyData: any[];
  topSymptoms: any[];
}

export const AnalyticsDashboard = ({ patients }: AnalyticsDashboardProps) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
  const response = await fetch(`${API_BASE}/api/analytics`);
        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      }
    };

    fetchAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [patients]); // Re-fetch if patients array changes

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  const {
    totalPatients,
    criticalPatients,
    completedPatients,
    avgWaitTime,
    priorityData,
    statusData,
    ageData,
    hourlyData,
    topSymptoms
  } = analyticsData;

  const statusPieData = statusData.map(d => {
    if (d.name === 'Waiting') return { ...d, color: '#f59e0b' };
    if (d.name === 'In Progress') return { ...d, color: '#3b82f6' };
    if (d.name === 'Completed') return { ...d, color: '#10b981' };
    return d;
  })

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }: any) => (
    <Card className="p-6 hover:shadow-hover transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`flex-shrink-0 p-3 rounded-full ${
          title.includes('Critical') ? 'bg-critical/10 text-critical' :
          title.includes('Completed') ? 'bg-success/10 text-success' :
          title.includes('Progress') ? 'bg-primary/10 text-primary' :
          'bg-muted/10 text-muted-foreground'
        }`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-3 text-sm ${
          trend === 'up' ? 'text-success' : 'text-critical'
        }`}>
          {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{trendValue}</span>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6 animate-slide-up w-full max-w-none">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          📊 Analytics Dashboard
        </h2>
        <Badge variant="secondary" className="px-3 py-1">
          Real-time Data
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
        <StatCard
          title="Total Patients"
          value={totalPatients}
          subtitle="Today"
          icon={Users}
          trend="up"
          trendValue="+12% from yesterday"
        />
        <StatCard
          title="Critical/High Priority"
          value={criticalPatients}
          subtitle={`${totalPatients > 0 ? Math.round((criticalPatients / totalPatients) * 100) : 0}% of total`}
          icon={AlertTriangle}
        />
        <StatCard
          title="Completed"
          value={completedPatients}
          subtitle="Successfully treated"
          icon={CheckCircle}
          trend="up"
          trendValue="+8% efficiency"
        />
        <StatCard
          title="Avg Wait Time"
          value={`${avgWaitTime}m`}
          subtitle="Current average"
          icon={Clock}
          trend={avgWaitTime > 60 ? 'up' : 'down'}
          trendValue={avgWaitTime > 60 ? 'Above target' : 'Within target'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
        {/* Priority Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Priority Distribution</h3>
          <div className="space-y-4">
            {priorityData.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.priority}</span>
                  <span>{item.count} patients</span>
                </div>
                <Progress value={totalPatients > 0 ? (item.count / totalPatients) * 100 : 0} className="h-2" />
              </div>
            ))}
          </div>
        </Card>

        {/* Status Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Patient Status</h3>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No patient data available
            </div>
          )}
        </Card>

        {/* Age Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Age Distribution</h3>
          {ageData.some(item => item.count > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No age data available
            </div>
          )}
        </Card>

        {/* Hourly Arrivals */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Arrival Pattern</h3>
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="arrivals" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No arrival data available
            </div>
          )}
        </Card>
      </div>

      {/* Top Symptoms */}
      {topSymptoms.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Most Common Significant Symptoms</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
            {topSymptoms.map((symptom, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">{symptom.symptom}</span>
                <Badge variant="secondary">{symptom.count} patients</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* System Performance */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">System Performance</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          <div className="text-center">
            <div className="text-3xl font-bold text-success mb-2">98.5%</div>
            <div className="text-sm text-muted-foreground">System Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">2.3s</div>
            <div className="text-sm text-muted-foreground">Avg Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-warning mb-2">0.2%</div>
            <div className="text-sm text-muted-foreground">Error Rate</div>
          </div>
        </div>
      </Card>

      {totalPatients === 0 && (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <BarChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No analytics data available</p>
            <p className="text-sm">Process some patients to see analytics and insights</p>
          </div>
        </Card>
      )}
    </div>
  );
};