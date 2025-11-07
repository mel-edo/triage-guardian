import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Heart, Brain, Activity, AlertTriangle, Mic, Users, BarChart3, Settings, Pill } from 'lucide-react';
import { PatientQueue } from './PatientQueue';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { SymptomAssessment } from './SymptomAssessment';
import { PharmacyChatbot } from './PharmacyChatbot';
import { useToast } from '@/hooks/use-toast';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  insuranceType: string;
  emergencyContact: string;
  symptoms: {
    painLevel: number;
    breathingDifficulty: number;
    consciousnessLevel: number;
    headache: number;
    confusion: number;
    chestPain: number;
    palpitations: number;
    bleeding: number;
    nausea: number;
  };
  vitals: {
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
  };
  priority: number;
  arrivalTime: Date;
  estimatedWaitTime: number;
  chiefComplaint: string;
  status: 'waiting' | 'in-progress' | 'completed';
}

type ViewType = 'triage' | 'queue' | 'analytics' | 'pharmacy' | 'settings';

// Fallback for API base URL so the UI still renders even if the env var is missing
const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL || '';

// Calculate a triage priority (1=Critical .. 5=Routine) based on symptom severity & vitals
// Keeps rendering resilient by guarding against undefined values
function calculatePriority(
  symptoms: {
    painLevel: number; breathingDifficulty: number; consciousnessLevel: number; headache: number; confusion: number;
    chestPain: number; palpitations: number; bleeding: number; nausea: number;
  },
  vitals: { heartRate?: string | number; bloodPressure?: string; temperature?: string | number; }
): number {
  // Normalize numeric vital inputs (strings -> numbers) when possible
  const heartRate = typeof vitals.heartRate === 'string' ? parseInt(vitals.heartRate) : vitals.heartRate;
  const temperature = typeof vitals.temperature === 'string' ? parseFloat(vitals.temperature) : vitals.temperature;

  // Base symptom severity score (weighted for more acute indicators)
  const score = (
    symptoms.breathingDifficulty * 2 +
    symptoms.chestPain * 2 +
    symptoms.consciousnessLevel * 2 +
    symptoms.bleeding * 1.5 +
    symptoms.painLevel +
    symptoms.palpitations +
    symptoms.confusion +
    symptoms.headache * 0.5 +
    symptoms.nausea * 0.5
  );

  // Vital sign modifiers
  let modifiers = 0;
  if (heartRate && (heartRate < 45 || heartRate > 130)) modifiers += 8; // severe tachy/brady
  else if (heartRate && (heartRate < 55 || heartRate > 110)) modifiers += 4;

  if (temperature && temperature >= 103) modifiers += 4;
  else if (temperature && temperature >= 101.5) modifiers += 2;

  if (vitals.bloodPressure) {
    const parts = vitals.bloodPressure.split(/[\/\-]/).map(p => parseInt(p.trim(), 10));
    if (parts.length >= 2) {
      const [sys, dia] = parts;
      if (sys >= 180 || dia >= 120) modifiers += 6; // hypertensive crisis
      else if (sys >= 160 || dia >= 100) modifiers += 3;
      if (sys < 85 || dia < 55) modifiers += 5; // hypotension concern
    }
  }

  const total = score + modifiers;

  // Map total score to priority tiers
  if (total >= 55) return 1;        // Critical
  if (total >= 35) return 2;        // High
  if (total >= 20) return 3;        // Medium
  if (total >= 10) return 4;        // Low
  return 5;                         // Routine
}

export const TriageSystem = () => {
  const [currentView, setCurrentView] = useState<ViewType>('triage');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    online: true,
    criticalAlerts: 0,
    warningAlerts: 2,
    totalPatients: 0
  });
  const { toast } = useToast();

  const fetchPatients = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/patients`);
      const data = await response.json();
      setPatients(data);
      setSystemStatus(prev => ({ ...prev, totalPatients: data.length }));
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast({
        title: "Error",
        description: "Could not fetch patient data from the server.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    patientId: '',
    insuranceType: 'private',
    emergencyContact: '',
    chiefComplaint: '',
    symptoms: {
      painLevel: 0,
      breathingDifficulty: 0,
      consciousnessLevel: 0,
      headache: 0,
      confusion: 0,
      chestPain: 0,
      palpitations: 0,
      bleeding: 0,
      nausea: 0
    },
    vitals: {
      heartRate: '',
      bloodPressure: '',
      temperature: ''
    }
  });

  const handleSubmitTriage = async () => {
    if (!formData.name || !formData.age || !formData.gender || !formData.chiefComplaint) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const newPatientData = {
      name: formData.name,
      age: parseInt(formData.age),
      gender: formData.gender,
      insuranceType: formData.insuranceType,
      emergencyContact: formData.emergencyContact,
      symptoms: formData.symptoms,
      vitals: {
        heartRate: formData.vitals.heartRate ? parseInt(formData.vitals.heartRate) : undefined,
        bloodPressure: formData.vitals.bloodPressure || undefined,
        temperature: formData.vitals.temperature ? parseFloat(formData.vitals.temperature) : undefined
      },
      chiefComplaint: formData.chiefComplaint,
      status: 'waiting',
      arrivalTime: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPatientData),
      });

      if (!response.ok) {
        throw new Error('Failed to add patient');
      }

      const newPatient = await response.json();

      setPatients(prev => [...prev, newPatient].sort((a, b) => {
        const statusOrder: Record<Patient['status'], number> = { waiting: 1, 'in-progress': 2, completed: 3 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return a.priority - b.priority;
      }));
      setSystemStatus(prev => ({ ...prev, totalPatients: prev.totalPatients + 1 }));
      
      // Reset form
      setFormData({
        name: '',
        age: '',
        gender: '',
        patientId: '',
        insuranceType: 'private',
        emergencyContact: '',
        chiefComplaint: '',
        symptoms: {
          painLevel: 0,
          breathingDifficulty: 0,
          consciousnessLevel: 0,
          headache: 0,
          confusion: 0,
          chestPain: 0,
          palpitations: 0,
          bleeding: 0,
          nausea: 0
        },
        vitals: {
          heartRate: '',
          bloodPressure: '',
          temperature: ''
        }
      });

      toast({
        title: `Patient Triaged - Priority ${newPatient.priority}`,
        description: `${newPatient.name} has been added to the queue.`,
        variant: newPatient.priority <= 2 ? "destructive" : "default"
      });

      setCurrentView('queue');
    } catch (error) {
      console.error("Error adding patient:", error);
      toast({
        title: "Error",
        description: "Could not add patient to the queue.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'critical';
      case 2: return 'warning';
      case 3: return 'primary';
      case 4: return 'success';
      default: return 'muted';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'CRITICAL';
      case 2: return 'HIGH';
      case 3: return 'MEDIUM';
      case 4: return 'LOW';
      default: return 'ROUTINE';
    }
  };

  const navigationItems = [
    { id: 'triage', label: 'Patient Triage', icon: Heart },
    { id: 'queue', label: 'Queue Management', icon: Users },
    { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart3 },
    { id: 'pharmacy', label: 'Pharmacy Chatbot', icon: Pill },
    { id: 'settings', label: 'System Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr_300px] gap-4 h-screen max-w-7xl mx-auto">
        {/* Header - Mobile */}
        <div className="lg:hidden glass rounded-xl p-4 flex items-center justify-between shadow-glass">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            🏥 AI Triage System
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-success">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse-glow" />
              Live
            </div>
            <Badge variant={systemStatus.criticalAlerts > 0 ? "destructive" : "secondary"}>
              {systemStatus.totalPatients} Patients
            </Badge>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block glass rounded-xl p-6 shadow-glass custom-scrollbar overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              🔧 System Controls
            </h2>
            <div className="space-y-2">
              {navigationItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as ViewType)}
                    className={`w-full p-3 rounded-lg text-left transition-all duration-300 flex items-center gap-3 ${
                      currentView === item.id
                        ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                        : 'hover:bg-gradient-glass hover:shadow-hover'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              🚨 Quick Actions
            </h3>
            <Button 
              variant="destructive" 
              className="w-full justify-start animate-pulse-glow"
              onClick={() => {
                // Emergency patient simulation
                const emergencyPatient: Patient = {
                  id: `EMG-${Date.now()}`,
                  name: 'Emergency Patient',
                  age: 45,
                  gender: 'male',
                  insuranceType: 'private',
                  emergencyContact: '911',
                  symptoms: {
                    painLevel: 10,
                    breathingDifficulty: 8,
                    consciousnessLevel: 6,
                    headache: 2,
                    confusion: 3,
                    chestPain: 9,
                    palpitations: 7,
                    bleeding: 8,
                    nausea: 4
                  },
                  vitals: { heartRate: 140, bloodPressure: '180/110', temperature: 101.2 },
                  priority: 1,
                  arrivalTime: new Date(),
                  estimatedWaitTime: 0,
                  chiefComplaint: 'Severe chest pain and difficulty breathing',
                  status: 'waiting'
                };
                setPatients(prev => [emergencyPatient, ...prev]);
                toast({
                  title: "EMERGENCY PATIENT ADDED",
                  description: "Critical priority patient added to queue",
                  variant: "destructive"
                });
              }}
            >
              🚑 Emergency Input
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="glass rounded-xl p-6 shadow-glass custom-scrollbar overflow-y-auto">
          {/* Header - Desktop */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              🏥 Advanced AI Triage System
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-success">
                <div className="w-3 h-3 bg-success rounded-full animate-pulse-glow" />
                System Online
              </div>
              <Badge variant={systemStatus.criticalAlerts > 0 ? "destructive" : "secondary"}>
                {systemStatus.totalPatients} Active Patients
              </Badge>
            </div>
          </div>

          {currentView === 'triage' && (
            <div className="space-y-6 animate-slide-up">
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitTriage(); }} className="space-y-6">
                {/* Patient Demographics */}
                <Card className="p-6 border-l-4 border-l-primary">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    👤 Patient Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter patient name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="age">Age *</Label>
                      <Input
                        id="age"
                        type="number"
                        min="0"
                        max="120"
                        value={formData.age}
                        onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gender *</Label>
                      <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-900">
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="emergencyContact">Emergency Contact</Label>
                      <Input
                        id="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="chiefComplaint">Chief Complaint *</Label>
                    <Textarea
                      id="chiefComplaint"
                      value={formData.chiefComplaint}
                      onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                      placeholder="Describe the main reason for the visit..."
                      required
                    />
                  </div>
                </Card>

                {/* Symptom Assessment */}
                <SymptomAssessment 
                  symptoms={formData.symptoms}
                  vitals={formData.vitals}
                  onSymptomsChange={(symptoms) => setFormData(prev => ({ ...prev, symptoms }))}
                  onVitalsChange={(vitals) => setFormData(prev => ({ ...prev, vitals }))}
                />

                {/* AI Insights */}
                <Card className="p-6 bg-gradient-primary text-primary-foreground">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    🤖 AI Triage Insights
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      Predicted Priority: <Badge className="bg-white/20 text-white">
                        {getPriorityLabel(calculatePriority(formData.symptoms, formData.vitals))}
                      </Badge>
                    </p>
                    <p className="text-sm opacity-90">
                      Based on symptom severity and vital signs assessment
                    </p>
                  </div>
                </Card>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-semibold bg-gradient-primary hover:shadow-glow transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing Triage...
                    </div>
                  ) : 'Complete Triage Assessment'}
                </Button>
              </form>
            </div>
          )}

          {currentView === 'queue' && (
            <PatientQueue 
              patients={patients} 
              onUpdatePatient={(id, status) => {
                setPatients(prev => prev.map(p => p.id === id ? { ...p, status } : p)
                  .sort((a, b) => {
                    const statusOrder: Record<Patient['status'], number> = { waiting: 1, 'in-progress': 2, completed: 3 };
                    if (statusOrder[a.status] !== statusOrder[b.status]) {
                      return statusOrder[a.status] - statusOrder[b.status];
                    }
                    return a.priority - b.priority;
                  }));
              }}
            />
          )}

          {currentView === 'analytics' && (
            <AnalyticsDashboard patients={patients} />
          )}

          {currentView === 'pharmacy' && (
            <PharmacyChatbot />
          )}

          {currentView === 'settings' && (
            <div className="space-y-6 animate-slide-up">
              <h2 className="text-xl font-semibold">System Settings</h2>
              <Card className="p-6">
                <p className="text-muted-foreground">Settings panel coming soon...</p>
              </Card>
            </div>
          )}
        </div>

        {/* Analytics Sidebar */}
        <div className="hidden lg:block space-y-4">
          <Card className="p-4 glass shadow-glass">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              📊 Live Statistics
            </h3>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{patients.length}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Patients</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-critical">{patients.filter(p => p.priority <= 2).length}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">High Priority</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {patients.length > 0 ? Math.round(patients.reduce((acc, p) => acc + (p.estimatedWaitTime || 0), 0) / patients.length) : 0}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Avg Wait (min)</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 glass shadow-glass">
            <h3 className="font-semibold mb-4">Priority Distribution</h3>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(priority => {
                const count = patients.filter(p => p.priority === priority).length;
                const percentage = patients.length > 0 ? (count / patients.length) * 100 : 0;
                return (
                  <div key={priority}>
                    <div className="flex justify-between text-sm">
                      <span>Priority {priority}</span>
                      <span>{count}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};