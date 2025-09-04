import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Clock, User, Heart, Phone, Search, Filter } from 'lucide-react';
import { Patient } from './TriageSystem';
import { useToast } from '@/hooks/use-toast';

interface PatientQueueProps {
  patients: Patient[];
  onUpdatePatient: (id: string, status: Patient['status']) => void;
}

export const PatientQueue = ({ patients, onUpdatePatient }: PatientQueueProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null);
  const { toast } = useToast();

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (patient.id && patient.id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPriority = selectedPriority === null || patient.priority === selectedPriority;
    return matchesSearch && matchesPriority;
  });

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-critical text-critical-foreground';
      case 2: return 'bg-warning text-warning-foreground';
      case 3: return 'bg-primary text-primary-foreground';
      case 4: return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
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

  const getStatusColor = (status: Patient['status']) => {
    switch (status) {
      case 'waiting': return 'bg-warning text-warning-foreground';
      case 'in-progress': return 'bg-primary text-primary-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getWaitTime = (arrivalDateString: string | Date) => {
    const arrivalTime = new Date(arrivalDateString).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - arrivalTime) / (1000 * 60));
    return diff > 0 ? diff : 0;
  };

  const handleStatusUpdate = async (patientId: string, newStatus: Patient['status']) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update patient status');
      }

      onUpdatePatient(patientId, newStatus);
      const patient = patients.find(p => p.id === patientId);
      toast({
        title: "Patient Status Updated",
        description: `${patient?.name} is now ${newStatus}`,
        variant: 'default'
      });
    } catch (error) {
      console.error("Error updating patient status:", error);
      toast({
        title: "Error",
        description: "Could not update patient status.",
        variant: "destructive"
      });
    }
  };

  const priorityFilters = [
    { priority: null, label: 'All', count: patients.length },
    { priority: 1, label: 'Critical', count: patients.filter(p => p.priority === 1).length },
    { priority: 2, label: 'High', count: patients.filter(p => p.priority === 2).length },
    { priority: 3, label: 'Medium', count: patients.filter(p => p.priority === 3).length },
    { priority: 4, label: 'Low', count: patients.filter(p => p.priority === 4).length },
    { priority: 5, label: 'Routine', count: patients.filter(p => p.priority === 5).length }
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          📋 Patient Queue Management
        </h2>
        <Badge variant="secondary" className="px-3 py-1">
          {filteredPatients.length} of {patients.length} patients
        </Badge>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              placeholder="Search by name or patient ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {priorityFilters.map(filter => (
              <Button
                key={filter.priority}
                variant={selectedPriority === filter.priority ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPriority(filter.priority)}
                className="text-xs"
              >
                {filter.label} ({filter.count})
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Queue List */}
      <div className="space-y-4">
        {filteredPatients.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              {patients.length === 0 ? (
                <>
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No patients in queue</p>
                  <p className="text-sm">Patients will appear here after triage assessment</p>
                </>
              ) : (
                <>
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No patients match your filters</p>
                  <p className="text-sm">Try adjusting your search or filter criteria</p>
                </>
              )}
            </div>
          </Card>
        ) : (
          filteredPatients.map((patient, index) => (
            <Card 
              key={patient.id} 
              className={`p-6 transition-all duration-300 hover:shadow-hover border-l-4 ${
                patient.priority === 1 ? 'border-l-critical animate-pulse-glow' :
                patient.priority === 2 ? 'border-l-warning' :
                patient.priority === 3 ? 'border-l-primary' :
                patient.priority === 4 ? 'border-l-success' :
                'border-l-muted'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{patient.name}</h3>
                      <p className="text-sm text-muted-foreground">ID: {patient.id}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getPriorityColor(patient.priority)}>
                        {getPriorityLabel(patient.priority)}
                      </Badge>
                      <Badge className={getStatusColor(patient.status)}>
                        {patient.status.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{patient.age}y, {patient.gender}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>Arrived: {formatTime(patient.arrivalTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-muted-foreground" />
                      <span>Wait: {getWaitTime(patient.arrivalTime)} min</span>
                    </div>
                    {patient.emergencyContact && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{patient.emergencyContact}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <p className="text-sm">
                      <span className="font-medium">Chief Complaint:</span> {patient.chiefComplaint}
                    </p>
                  </div>

                  {/* Vital Indicators */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {patient.vitals.heartRate && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          parseInt(patient.vitals.heartRate.toString()) > 120 || parseInt(patient.vitals.heartRate.toString()) < 50 
                            ? 'border-critical text-critical' : ''
                        }`}
                      >
                        HR: {patient.vitals.heartRate}
                      </Badge>
                    )}
                    {patient.vitals.bloodPressure && (
                      <Badge variant="outline" className="text-xs">
                        BP: {patient.vitals.bloodPressure}
                      </Badge>
                    )}
                    {patient.vitals.temperature && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          parseFloat(patient.vitals.temperature.toString()) > 100.4 
                            ? 'border-warning text-warning' : ''
                        }`}
                      >
                        Temp: {patient.vitals.temperature}°F
                      </Badge>
                    )}
                    {patient.symptoms.painLevel > 5 && (
                      <Badge variant="outline" className="text-xs border-warning text-warning">
                        Pain: {patient.symptoms.painLevel}/10
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                  {patient.status === 'waiting' && (
                    <Button
                      onClick={() => handleStatusUpdate(patient.id, 'in-progress')}
                      className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
                    >
                      Start Treatment
                    </Button>
                  )}
                  {patient.status === 'in-progress' && (
                    <Button
                      onClick={() => handleStatusUpdate(patient.id, 'completed')}
                      variant="outline"
                      className="border-success text-success hover:bg-success hover:text-success-foreground"
                    >
                      Mark Complete
                    </Button>
                  )}
                  {patient.status === 'completed' && (
                    <Badge className="bg-success text-success-foreground justify-center py-2">
                      ✓ Completed
                    </Badge>
                  )}
                  
                  <div className="text-xs text-center text-muted-foreground">
                    Est. Wait: {patient.estimatedWaitTime} min
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Queue Statistics */}
      {patients.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Queue Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-critical">
                {patients.filter(p => p.priority <= 2 && p.status === 'waiting').length}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                High Priority Waiting
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {patients.filter(p => p.status === 'in-progress').length}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Currently Treating
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success">
                {patients.filter(p => p.status === 'completed').length}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Completed Today
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-warning">
                {patients.length > 0 ? Math.round(patients.reduce((acc, p) => acc + getWaitTime(p.arrivalTime), 0) / patients.length) : 0}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Avg Wait Time (min)
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};