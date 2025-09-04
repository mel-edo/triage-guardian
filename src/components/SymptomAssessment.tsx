import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Heart, Brain, Activity, Thermometer } from 'lucide-react';

interface SymptomAssessmentProps {
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
    heartRate: string;
    bloodPressure: string;
    temperature: string;
  };
  onSymptomsChange: (symptoms: any) => void;
  onVitalsChange: (vitals: any) => void;
}

export const SymptomAssessment = ({ symptoms, vitals, onSymptomsChange, onVitalsChange }: SymptomAssessmentProps) => {
  const updateSymptom = (key: string, value: number) => {
    onSymptomsChange({ ...symptoms, [key]: value });
  };

  const updateVital = (key: string, value: string) => {
    onVitalsChange({ ...vitals, [key]: value });
  };

  const getSliderColor = (value: number) => {
    if (value >= 8) return 'critical';
    if (value >= 6) return 'warning';
    if (value >= 4) return 'primary';
    return 'success';
  };

  const getSliderLabel = (key: string, value: number) => {
    const labels: { [key: string]: string[] } = {
      painLevel: ['No Pain', 'Mild', 'Moderate', 'Severe', 'Unbearable'],
      breathingDifficulty: ['Normal', 'Slight', 'Moderate', 'Severe', 'Critical'],
      consciousnessLevel: ['Alert', 'Drowsy', 'Confused', 'Unresponsive', 'Unconscious'],
      headache: ['None', 'Mild', 'Moderate', 'Severe', 'Migraine'],
      confusion: ['Clear', 'Slight', 'Moderate', 'Severe', 'Disoriented'],
      chestPain: ['None', 'Mild', 'Moderate', 'Severe', 'Crushing'],
      palpitations: ['Normal', 'Occasional', 'Frequent', 'Severe', 'Continuous'],
      bleeding: ['None', 'Minor', 'Moderate', 'Heavy', 'Severe'],
      nausea: ['None', 'Mild', 'Moderate', 'Severe', 'Vomiting']
    };
    
    const index = Math.min(Math.floor(value / 2), 4);
    return `${labels[key][index]} (${value}/10)`;
  };

  return (
    <Card className="p-6 border-l-4 border-l-accent">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        🩺 AI-Powered Symptom Assessment
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vital Signs */}
        <Card className="p-4 bg-gradient-glass">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-critical" />
            Vital Signs
          </h4>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Pain Level</Label>
              <Slider
                value={[symptoms.painLevel]}
                onValueChange={(value) => updateSymptom('painLevel', value[0])}
                max={10}
                step={1}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>No Pain</span>
                <span>Unbearable</span>
              </div>
              <div className={`text-center text-sm font-medium mt-2 px-3 py-1 rounded-full ${
                symptoms.painLevel >= 8 ? 'bg-critical text-critical-foreground' :
                symptoms.painLevel >= 6 ? 'bg-warning text-warning-foreground' :
                symptoms.painLevel >= 4 ? 'bg-primary text-primary-foreground' :
                'bg-success text-success-foreground'
              }`}>
                {getSliderLabel('painLevel', symptoms.painLevel)}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Breathing Difficulty</Label>
              <Slider
                value={[symptoms.breathingDifficulty]}
                onValueChange={(value) => updateSymptom('breathingDifficulty', value[0])}
                max={10}
                step={1}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Normal</span>
                <span>Severe</span>
              </div>
              <div className={`text-center text-sm font-medium mt-2 px-3 py-1 rounded-full ${
                symptoms.breathingDifficulty >= 8 ? 'bg-critical text-critical-foreground' :
                symptoms.breathingDifficulty >= 6 ? 'bg-warning text-warning-foreground' :
                symptoms.breathingDifficulty >= 4 ? 'bg-primary text-primary-foreground' :
                'bg-success text-success-foreground'
              }`}>
                {getSliderLabel('breathingDifficulty', symptoms.breathingDifficulty)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="heartRate" className="text-sm">Heart Rate (BPM)</Label>
                <Input
                  id="heartRate"
                  type="number"
                  min="30"
                  max="200"
                  value={vitals.heartRate}
                  onChange={(e) => updateVital('heartRate', e.target.value)}
                  placeholder="72"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="bloodPressure" className="text-sm">Blood Pressure</Label>
                <Input
                  id="bloodPressure"
                  value={vitals.bloodPressure}
                  onChange={(e) => updateVital('bloodPressure', e.target.value)}
                  placeholder="120/80"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="temperature" className="text-sm">Temperature (°F)</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="90"
                  max="110"
                  step="0.1"
                  value={vitals.temperature}
                  onChange={(e) => updateVital('temperature', e.target.value)}
                  placeholder="98.6"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Neurological */}
        <Card className="p-4 bg-gradient-glass">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Neurological
          </h4>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Consciousness Level</Label>
              <Slider
                value={[symptoms.consciousnessLevel]}
                onValueChange={(value) => updateSymptom('consciousnessLevel', value[0])}
                max={10}
                step={1}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Alert</span>
                <span>Unconscious</span>
              </div>
              <div className={`text-center text-sm font-medium mt-2 px-3 py-1 rounded-full ${
                symptoms.consciousnessLevel >= 8 ? 'bg-critical text-critical-foreground' :
                symptoms.consciousnessLevel >= 6 ? 'bg-warning text-warning-foreground' :
                symptoms.consciousnessLevel >= 4 ? 'bg-primary text-primary-foreground' :
                'bg-success text-success-foreground'
              }`}>
                {getSliderLabel('consciousnessLevel', symptoms.consciousnessLevel)}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Headache Severity</Label>
              <Slider
                value={[symptoms.headache]}
                onValueChange={(value) => updateSymptom('headache', value[0])}
                max={10}
                step={1}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>None</span>
                <span>Severe</span>
              </div>
              <div className={`text-center text-sm font-medium mt-2 px-3 py-1 rounded-full ${
                symptoms.headache >= 8 ? 'bg-critical text-critical-foreground' :
                symptoms.headache >= 6 ? 'bg-warning text-warning-foreground' :
                symptoms.headache >= 4 ? 'bg-primary text-primary-foreground' :
                'bg-success text-success-foreground'
              }`}>
                {getSliderLabel('headache', symptoms.headache)}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Confusion/Disorientation</Label>
              <Slider
                value={[symptoms.confusion]}
                onValueChange={(value) => updateSymptom('confusion', value[0])}
                max={10}
                step={1}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Clear</span>
                <span>Severe</span>
              </div>
              <div className={`text-center text-sm font-medium mt-2 px-3 py-1 rounded-full ${
                symptoms.confusion >= 8 ? 'bg-critical text-critical-foreground' :
                symptoms.confusion >= 6 ? 'bg-warning text-warning-foreground' :
                symptoms.confusion >= 4 ? 'bg-primary text-primary-foreground' :
                'bg-success text-success-foreground'
              }`}>
                {getSliderLabel('confusion', symptoms.confusion)}
              </div>
            </div>
          </div>
        </Card>

        {/* Cardiovascular */}
        <Card className="p-4 bg-gradient-glass">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-warning" />
            Cardiovascular
          </h4>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Chest Pain</Label>
              <Slider
                value={[symptoms.chestPain]}
                onValueChange={(value) => updateSymptom('chestPain', value[0])}
                max={10}
                step={1}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>None</span>
                <span>Crushing</span>
              </div>
              <div className={`text-center text-sm font-medium mt-2 px-3 py-1 rounded-full ${
                symptoms.chestPain >= 8 ? 'bg-critical text-critical-foreground' :
                symptoms.chestPain >= 6 ? 'bg-warning text-warning-foreground' :
                symptoms.chestPain >= 4 ? 'bg-primary text-primary-foreground' :
                'bg-success text-success-foreground'
              }`}>
                {getSliderLabel('chestPain', symptoms.chestPain)}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Heart Palpitations</Label>
              <Slider
                value={[symptoms.palpitations]}
                onValueChange={(value) => updateSymptom('palpitations', value[0])}
                max={10}
                step={1}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>None</span>
                <span>Severe</span>
              </div>
              <div className={`text-center text-sm font-medium mt-2 px-3 py-1 rounded-full ${
                symptoms.palpitations >= 8 ? 'bg-critical text-critical-foreground' :
                symptoms.palpitations >= 6 ? 'bg-warning text-warning-foreground' :
                symptoms.palpitations >= 4 ? 'bg-primary text-primary-foreground' :
                'bg-success text-success-foreground'
              }`}>
                {getSliderLabel('palpitations', symptoms.palpitations)}
              </div>
            </div>
          </div>
        </Card>

        {/* Critical Symptoms */}
        <Card className="p-4 bg-gradient-glass">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-success" />
            Critical Symptoms
          </h4>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Bleeding</Label>
              <Slider
                value={[symptoms.bleeding]}
                onValueChange={(value) => updateSymptom('bleeding', value[0])}
                max={10}
                step={1}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>None</span>
                <span>Severe</span>
              </div>
              <div className={`text-center text-sm font-medium mt-2 px-3 py-1 rounded-full ${
                symptoms.bleeding >= 8 ? 'bg-critical text-critical-foreground' :
                symptoms.bleeding >= 6 ? 'bg-warning text-warning-foreground' :
                symptoms.bleeding >= 4 ? 'bg-primary text-primary-foreground' :
                'bg-success text-success-foreground'
              }`}>
                {getSliderLabel('bleeding', symptoms.bleeding)}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Nausea/Vomiting</Label>
              <Slider
                value={[symptoms.nausea]}
                onValueChange={(value) => updateSymptom('nausea', value[0])}
                max={10}
                step={1}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>None</span>
                <span>Severe</span>
              </div>
              <div className={`text-center text-sm font-medium mt-2 px-3 py-1 rounded-full ${
                symptoms.nausea >= 8 ? 'bg-critical text-critical-foreground' :
                symptoms.nausea >= 6 ? 'bg-warning text-warning-foreground' :
                symptoms.nausea >= 4 ? 'bg-primary text-primary-foreground' :
                'bg-success text-success-foreground'
              }`}>
                {getSliderLabel('nausea', symptoms.nausea)}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Card>
  );
};