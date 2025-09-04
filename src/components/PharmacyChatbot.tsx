import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Bot, User, Pill, ListChecks, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  meta?: string; // optional metadata context
}

export const PharmacyChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDrugPanel, setShowDrugPanel] = useState(true);
  const { toast } = useToast();
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // --- Static Domain Knowledge (Minimal Local Knowledge Base) ---
  type DrugInfo = {
    generic: string;
    brand?: string[];
    class: string;
    indications: string[];
    adultDose: string;
    renalAdjust?: string;
    contraindications: string[];
    interactions: string[];
    sideEffects: string[];
    counseling: string[];
  };

  const DRUG_DB: Record<string, DrugInfo> = {
    'amoxicillin': {
      generic: 'Amoxicillin',
      brand: ['Amoxil'],
      class: 'Aminopenicillin antibiotic',
      indications: ['Acute otitis media', 'Bacterial sinusitis', 'Streptococcal pharyngitis', 'Community-acquired pneumonia (mild)', 'Uncomplicated skin infections'],
      adultDose: '500 mg PO every 8 hours OR 875 mg PO every 12 hours (typical outpatient dosing). Duration 5–10 days depending on indication.',
      renalAdjust: 'CrCl 10–30 mL/min: 250–500 mg every 12h. CrCl <10: 250–500 mg every 24h.',
      contraindications: ['Serious hypersensitivity to beta-lactams'],
      interactions: ['May reduce efficacy of oral contraceptives (advise backup method)', 'Allopurinol ↑ rash risk'],
      sideEffects: ['GI upset', 'Rash', 'Rare: anaphylaxis', 'C. difficile-associated diarrhea'],
      counseling: ['Complete the full course even if you feel better', 'Report rash or severe diarrhea', 'Take with food if stomach upset occurs']
    },
    'ibuprofen': {
      generic: 'Ibuprofen',
      brand: ['Advil', 'Motrin'],
      class: 'NSAID (non-selective COX inhibitor)',
      indications: ['Mild-moderate pain', 'Inflammation', 'Fever'],
      adultDose: '200–400 mg PO every 4–6h PRN (OTC). Max 1200 mg/day OTC; under supervision up to 2400 mg/day.',
      renalAdjust: 'Avoid if severe renal impairment (eGFR <30) unless directed by physician.',
      contraindications: ['Active GI bleeding', 'Recent CABG surgery', 'Severe renal failure'],
      interactions: ['Anticoagulants', 'Antiplatelets', 'ACE inhibitors/ARBs + diuretics (triple whammy kidney risk)', 'Lithium ↑ levels'],
      sideEffects: ['GI upset', 'Edema', 'Elevated blood pressure', 'Rare: GI bleed, renal injury'],
      counseling: ['Take with food', 'Do not exceed max daily dose', 'Avoid combining with other NSAIDs']
    },
    'metformin': {
      generic: 'Metformin',
      brand: ['Glucophage'],
      class: 'Biguanide antihyperglycemic',
      indications: ['Type 2 diabetes mellitus', 'Prediabetes (off-label)', 'PCOS (off-label)'],
      adultDose: '500 mg PO once or twice daily with meals; titrate by 500 mg weekly to 1000 mg twice daily (max 2550 mg/day IR).',
      renalAdjust: 'eGFR 45–59: continue; monitor. eGFR 30–44: max 1000 mg/day. eGFR <30: contraindicated.',
      contraindications: ['eGFR <30', 'Metabolic acidosis', 'Hypersensitivity'],
      interactions: ['Iodinated contrast media (hold around procedure)', 'Cationic drugs (e.g., dolutegravir) may ↑ levels'],
      sideEffects: ['GI upset/diarrhea (common, improves)', 'B12 deficiency (long-term)', 'Rare: lactic acidosis'],
      counseling: ['Take with meals', 'Report persistent GI distress', 'Annual B12 check if long-term']
    },
    'atorvastatin': {
      generic: 'Atorvastatin',
      brand: ['Lipitor'],
      class: 'HMG-CoA reductase inhibitor (statin)',
      indications: ['Hyperlipidemia', 'ASCVD risk reduction'],
      adultDose: '10–80 mg PO once daily (high-intensity: 40–80 mg).',
      renalAdjust: 'No adjustment needed.',
      contraindications: ['Active liver disease', 'Pregnancy', 'Breastfeeding'],
      interactions: ['Strong CYP3A4 inhibitors ↑ levels (e.g., clarithromycin)', 'Grapefruit (excess) ↑ exposure'],
      sideEffects: ['Myalgia', 'Mild transaminase elevation', 'Rare: rhabdomyolysis'],
      counseling: ['Report unexplained muscle pain/weakness', 'Limit grapefruit juice >1 quart/day']
    },
    'omeprazole': {
      generic: 'Omeprazole',
      brand: ['Prilosec'],
      class: 'Proton pump inhibitor',
      indications: ['GERD', 'Erosive esophagitis', 'H. pylori (combo)', 'Peptic ulcer disease'],
      adultDose: '20–40 mg PO once daily before meal (often morning).',
      renalAdjust: 'No adjustment.',
      contraindications: ['Hypersensitivity to PPIs'],
      interactions: ['Clopidogrel (possible ↓ activation)', 'May ↓ absorption of drugs needing acidic pH (e.g., ketoconazole)'],
      sideEffects: ['Headache', 'Long-term: B12 deficiency', 'Hypomagnesemia', 'Fracture risk (long-term)'],
      counseling: ['Take 30–60 min before food', 'Do not crush DR capsules', 'Report persistent symptoms >14 days']
    }
  };

  const READY_RESPONSES: { label: string; text: string; meta?: string }[] = [
    { label: 'Disclaimer', text: 'This information is for educational purposes only and does not replace professional medical advice.', meta: 'disclaimer' },
    { label: 'List All Drugs', text: 'list all drugs' },
    { label: 'When to Seek Help', text: 'If you experience severe symptoms such as chest pain, difficulty breathing, or fainting, seek emergency care immediately.' },
  ];

  const quickDrugButtons = Object.keys(DRUG_DB).sort().map(key => ({
    label: DRUG_DB[key].generic,
    text: `info ${key}`
  }));

  // --- Helper Functions ---
  const formatDrugInfo = (drugKey: string): string => {
    const d = DRUG_DB[drugKey.toLowerCase()];
    if (!d) return 'Drug not found in local reference.';
    return [
      `${d.generic}${d.brand ? ' (' + d.brand.join(', ') + ')' : ''}`,
      `Class: ${d.class}`,
      `Indications: ${d.indications.join('; ')}`,
      `Adult Dose: ${d.adultDose}`,
      d.renalAdjust ? `Renal Adjustment: ${d.renalAdjust}` : undefined,
      `Contraindications: ${d.contraindications.join('; ')}`,
      `Common Side Effects: ${d.sideEffects.join('; ')}`,
      `Key Interactions: ${d.interactions.join('; ')}`,
      `Counseling: ${d.counseling.join('; ')}`,
      'Always verify patient-specific factors (age, renal/hepatic function, allergies).'
    ].filter(Boolean).join('\n');
  };

  const localIntent = useCallback((raw: string): Message | null => {
    const msg = raw.trim().toLowerCase();
    if (msg === 'list all drugs' || msg === 'list drugs') {
      return { sender: 'bot', text: 'Available drugs: ' + Object.values(DRUG_DB).map(d => d.generic).join(', ') + '\nType: info <drug name>  e.g.  info ibuprofen', meta: 'local:list' };
    }
    if (msg.startsWith('info ')) {
      const key = msg.replace(/^info\s+/, '');
      if (DRUG_DB[key]) return { sender: 'bot', text: formatDrugInfo(key), meta: 'local:info' };
      return { sender: 'bot', text: `I do not have data for "${key}" in my local reference. Try asking the server.`, meta: 'local:missing' };
    }
    if (msg.startsWith('dose ') || msg.startsWith('dosage ')) {
      const key = msg.replace(/^(dose|dosage)\s+/, '');
      if (DRUG_DB[key]) return { sender: 'bot', text: `${DRUG_DB[key].generic} dosing guidance (adult):\n${DRUG_DB[key].adultDose}\nRenal: ${DRUG_DB[key].renalAdjust || 'No major adjustment.'}`, meta: 'local:dose' };
      return { sender: 'bot', text: `No local dosing record for ${key}.`, meta: 'local:missing' };
    }
    if (msg === 'help' || msg === 'commands') {
      return { sender: 'bot', text: 'Commands:\nlist all drugs\ninfo <drug>\ndose <drug>\nSide effects <drug>\ninteractions <drug>\nYou can also free-type a question.', meta: 'local:help' };
    }
    if (msg.startsWith('side effects ')) {
      const key = msg.replace(/^side effects\s+/, '');
      if (DRUG_DB[key]) return { sender: 'bot', text: `${DRUG_DB[key].generic} common side effects:\n${DRUG_DB[key].sideEffects.join('; ')}`, meta: 'local:effects' };
    }
    if (msg.startsWith('interactions ')) {
      const key = msg.replace(/^interactions\s+/, '');
      if (DRUG_DB[key]) return { sender: 'bot', text: `${DRUG_DB[key].generic} key interactions:\n${DRUG_DB[key].interactions.join('; ')}`, meta: 'local:interactions' };
    }
    return null;
  }, [DRUG_DB]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initial greeting from the bot
    setMessages([{ text: "Hello! I'm the pharmacy assistant. Ask: 'list all drugs', 'info ibuprofen', 'dose metformin', or click a quick action.", sender: 'bot', meta: 'greeting' }]);
  }, []);

  const sendLocalOrRemote = async (raw: string) => {
    if (!raw.trim()) return;
    const userMessage: Message = { text: raw, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Check local intents first
    const local = localIntent(raw);
    if (local) {
      setMessages(prev => [...prev, local]);
      return; // no remote call
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${(import.meta as any)?.env?.VITE_API_BASE_URL || ''}/api/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: raw }),
      });
      if (!response.ok) throw new Error('Non-200 response');
      const data = await response.json();
      setMessages(prev => [...prev, { text: data.reply, sender: 'bot', meta: 'remote' }]);
    } catch (err) {
      console.error('Chatbot API error:', err);
      // Fallback attempt: if looks like drug info but remote failed, try local info extraction
      const tokens = raw.toLowerCase().split(/\s+/);
      const maybeDrug = tokens.find(t => DRUG_DB[t]);
      if (maybeDrug) {
        setMessages(prev => [...prev, { text: `(Offline fallback)\n${formatDrugInfo(maybeDrug)}`, sender: 'bot', meta: 'fallback' }]);
      } else {
        setMessages(prev => [...prev, { text: 'Sorry, I could not reach the server and no local response was available.', sender: 'bot', meta: 'error' }]);
      }
      toast({ title: 'Network Issue', description: 'Using local knowledge where possible.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => sendLocalOrRemote(input);

  const handleQuickInsert = (text: string, autoSend = true) => {
    if (autoSend) sendLocalOrRemote(text); else setInput(text);
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-6 h-6" />
          Pharmacy Chatbot
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden p-4">
        {/* Quick Panels */}
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" variant={showDrugPanel ? 'secondary' : 'outline'} onClick={() => setShowDrugPanel(v => !v)}>
            <Pill className="w-4 h-4 mr-1" /> Drugs
          </Button>
          {READY_RESPONSES.map(r => (
            <Button key={r.label} size="sm" variant="outline" onClick={() => handleQuickInsert(r.text)}>{r.label}</Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => handleQuickInsert('help')}>Help</Button>
        </div>
        {showDrugPanel && (
          <div className="rounded-md border p-2 bg-muted/40">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ListChecks className="w-3 h-3" /> Quick Drug Info
            </div>
            <ScrollArea className="h-20 pr-2">
              <div className="flex flex-wrap gap-2">
                {quickDrugButtons.map(b => (
                  <Badge key={b.label} variant="secondary" className="cursor-pointer hover:bg-primary/20" onClick={() => handleQuickInsert(b.text)}>
                    {b.label}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        <Separator />
        {/* Conversation */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'bot' && <Bot className="w-6 h-6 text-primary" />}
                <div className={`rounded-lg p-3 max-w-prose text-sm leading-snug whitespace-pre-wrap shadow-sm border ${msg.sender === 'user' ? 'bg-primary text-primary-foreground border-primary/60' : 'bg-background/60 backdrop-blur-sm'}`}>
                  {msg.meta && <div className="text-[10px] uppercase tracking-wide opacity-60 mb-1 flex items-center gap-1">{msg.meta.startsWith('local') ? <Sparkles className="w-3 h-3" /> : null}{msg.meta}</div>}
                  {msg.text}
                </div>
                {msg.sender === 'user' && <User className="w-6 h-6" />}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        {/* Composer */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); !isLoading && handleSend(); }
            }}
            placeholder="Ask about a drug (e.g., info amoxicillin)..."
            disabled={isLoading}
          />
            <Button onClick={handleSend} disabled={isLoading} className="min-w-[48px]">
              {isLoading ? '...' : <Send className="w-4 h-4" />}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};
