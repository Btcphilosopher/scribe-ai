import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  FileText, 
  BookOpen, 
  Network, 
  Volume2, 
  Play, 
  Square, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronRight, 
  RefreshCw, 
  Globe, 
  Clock, 
  CornerDownRight, 
  FileEdit, 
  RotateCw, 
  Flame, 
  Sliders
} from 'lucide-react';

// Interfaces for our study entities
interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface ConceptNode {
  id: string;
  label: string;
  details: string;
  x: number;
  y: number;
}

interface Connection {
  from: string;
  to: string;
}

interface GroundingSource {
  title: string;
  uri: string;
}

export default function App() {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'studio' | 'recall' | 'sandbox'>('studio');
  
  // Document Context state
  const [docText, setDocText] = useState<string>(
    `# Quantum Computing & Cryptography: The New Frontier

## 1. Introduction to Quantum Mechanics
Quantum computing is a multidisciplinary field comprising aspects of computer science, physics, and mathematics that utilizes quantum mechanics to solve complex problems faster than on classical computers. Traditional computers store information in bits (representing 0s and 1s), whereas quantum computers utilize qubits.

Qubits exploit fundamental physical behaviors of quantum mechanics, namely superposition and entanglement:
- Superposition: Allows a qubit to exist in a state representing both 0 and 1 simultaneously until measured.
- Entanglement: A spooky connection where qubits link together, so that the state of one instantly influences the state of another, no matter the distance.

## 2. RSA Cryptography & Shor's Algorithm
Most modern cybersecurity relies on public-key cryptography like RSA, which hinges on the mathematical difficulty of factoring enormous prime numbers. For classical supercomputers, factoring a 2048-bit number would take billions of years.
However, in 1994, Peter Shor formulated Shor's Algorithm. Running on a sufficiently powerful, fault-tolerant quantum computer, Shor's algorithm can find the prime factors of an integer in polynomial time (minutes or hours), potentially breaking traditional global digital encryption frameworks.

## 3. Post-Quantum Cryptography (PQC)
In response to this threat, scientists have pioneered PQC. These are mathematical systems (like lattice-based cryptography) that are designed to be secure against both quantum and classical computers. The National Institute of Standards and Technology (NIST) is currently standardizing these algorithms to secure global transactions before cryptographically relevant quantum computers are realized in the coming decades.`
  );

  // System time clock state
  const [localTime, setLocalTime] = useState<string>('');
  
  // Dynamic API Status
  const [apiError, setApiError] = useState<{ message: string; details: string } | null>(null);
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({
    analyze: false,
    grounding: false,
    flashcards: false,
    quiz: false,
    mindmap: false,
    tts: false,
    expandNode: false,
  });

  // 1. Studio Canvas State
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('');
  const [customCommandPrompt, setCustomCommandPrompt] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ttsWaveform, setTtsWaveform] = useState<number[]>([]);

  // Search Grounding State
  const [searchQuery, setSearchQuery] = useState<string>('How close are we to fault-tolerant quantum computing?');
  const [groundingResult, setGroundingResult] = useState<string>('');
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);

  // 2. Recall Hub State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const [cardStats, setCardStats] = useState<{ [key: string]: 'easy' | 'medium' | 'hard' }>({});
  
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: number }>({});
  const [isQuizGraded, setIsQuizGraded] = useState<boolean>(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);

  // 3. Sandbox state
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const sandboxContainerRef = useRef<HTMLDivElement | null>(null);

  // Initial Clock
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setLocalTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update TTS Audio Visualizer simulation
  useEffect(() => {
    if (isPlayingAudio) {
      const interval = setInterval(() => {
        setTtsWaveform(Array.from({ length: 15 }, () => Math.floor(Math.random() * 28) + 4));
      }, 100);
      return () => clearInterval(interval);
    } else {
      setTtsWaveform(Array.from({ length: 15 }, () => 4));
    }
  }, [isPlayingAudio]);

  // Clean Audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Set initial sample flashcards and sandbox nodes on component load
  useEffect(() => {
    // Standard mock seeds (for direct offline use until synced with AI)
    setFlashcards([
      {
        id: 'fc_1',
        topic: 'Basics',
        front: 'What is the primary difference between classical bits and quantum qubits?',
        back: 'Bits represent definite values of either 0 or 1. Qubits exploit quantum superposition to represent states of 0, 1, or both simultaneously.'
      },
      {
        id: 'fc_2',
        topic: 'Basics',
        front: 'How does entanglement multiply quantum processing speeds?',
        back: 'Entanglement creates a physical link, so the computational state of one qubit instantly scales relative states of entangled partners, resolving massive matrixes in parallel.'
      },
      {
        id: 'fc_3',
        topic: 'Security',
        front: 'Why is traditional RSA encryption threatened by Shor\'s Algorithm?',
        back: 'Shor\'s algorithm can factor massive prime numbers in polynomial time (minutes/hours), which would take classical computers billions of years to achieve.'
      }
    ]);

    setNodes([
      { id: 'n1', label: 'Quantum Dynamics', details: 'Core physics focusing on Superposition and Multi-state entanglement.', x: 120, y: 150 },
      { id: 'n2', label: 'Shor\'s Factorization', details: 'Polynomial solver threatening global RSA public-key standards.', x: 420, y: 110 },
      { id: 'n3', label: 'Post-Quantum Defense', details: 'Lattice-based cryptography securing communication before decryptors launch.', x: 280, y: 320 }
    ]);

    setConnections([
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' }
    ]);
  }, []);

  // Trigger server-side text analyses
  const runTextAnalysis = async (command: string) => {
    setLoadingStates(prev => ({ ...prev, analyze: true }));
    setApiError(null);
    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: docText, 
          command: command === 'custom' ? customCommandPrompt : command 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      
      setAiAnalysisResult(data.result);
      if (command === 'custom') setCustomCommandPrompt('');
    } catch (err: any) {
      setApiError({ 
        message: err.message || 'Analysis Request Failed', 
        details: 'Verify that your model servers are up and a valid GEMINI_API_KEY resides in Settings.'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, analyze: false }));
    }
  };

  // Trigger server-side fact check or research query
  const runGroundingSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoadingStates(prev => ({ ...prev, grounding: true }));
    setApiError(null);
    try {
      const res = await fetch('/api/gemini/ground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: searchQuery,
          contextText: docText.substring(0, 1000) // Pass standard prompt excerpt as context 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      setGroundingResult(data.result);
      setGroundingSources(data.sources || []);
    } catch (err: any) {
      setApiError({
        message: err.message || 'Grounding Search Failed',
        details: 'Grounding uses Google Search APIs. Check internet access and secret configs.'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, grounding: false }));
    }
  };

  // Trigger Text-to-Speech proxy
  const speakSelectedText = async () => {
    // Get highlighted text or speak the introduction section
    let speakText = window.getSelection()?.toString();
    if (!speakText || speakText.trim().length === 0) {
      speakText = docText.split('##')[0] || docText;
    }

    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingAudio(false);
      return;
    }

    setLoadingStates(prev => ({ ...prev, tts: true }));
    setApiError(null);
    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speakText.substring(0, 400), voice: selectedVoice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      // Decode Base64 sound to browser audio object
      const audioBytes = data.audio;
      const audioUrl = `data:audio/wav;base64,${audioBytes}`;
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const newAudio = new Audio(audioUrl);
      audioRef.current = newAudio;
      setIsPlayingAudio(true);
      
      newAudio.play();
      newAudio.onended = () => {
        setIsPlayingAudio(false);
      };
    } catch (err: any) {
      setApiError({
        message: err.message || 'TTS Synthesis Failure',
        details: 'Check if gemini-3.1-flash-tts-preview model is supported under your key provisions.'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, tts: false }));
    }
  };

  // Generate Flashcards
  const generateAIFlashcards = async () => {
    setLoadingStates(prev => ({ ...prev, flashcards: true }));
    setApiError(null);
    try {
      const res = await fetch('/api/gemini/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: docText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server failed');

      if (data.cards && data.cards.length > 0) {
        setFlashcards(data.cards);
        setActiveCardIndex(0);
        setIsCardFlipped(false);
        setCardStats({});
      }
    } catch (err: any) {
      setApiError({
        message: err.message || 'Flashcards extraction failed',
        details: 'Verify schema structure and AI prompt limits.'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, flashcards: false }));
    }
  };

  // Generate study multiple choice quiz
  const generateAIQuiz = async () => {
    setLoadingStates(prev => ({ ...prev, quiz: true }));
    setApiError(null);
    try {
      const res = await fetch('/api/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: docText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server failed');

      if (data.questions && data.questions.length > 0) {
        setQuizQuestions(data.questions);
        setCurrentQuestionIndex(0);
        setQuizAnswers({});
        setIsQuizGraded(false);
        setSelectedQuizOption(null);
      }
    } catch (err: any) {
      setApiError({
        message: err.message || 'Quiz synthesis failed',
        details: 'JSON Schema structures are parsed server-side. Review validation logs.'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, quiz: false }));
    }
  };

  // Generate entire mindmap concept nodes
  const generateAIMindmap = async () => {
    setLoadingStates(prev => ({ ...prev, mindmap: true }));
    setApiError(null);
    try {
      const res = await fetch('/api/gemini/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: docText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server failed');

      if (data.nodes && data.nodes.length > 0) {
        setNodes(data.nodes);
        setConnections(data.connections || []);
        setSelectedNodeId(data.nodes[0]?.id || null);
      }
    } catch (err: any) {
      setApiError({
        message: err.message || 'Mind Map mapping failed',
        details: 'Make sure your text content is spacious and covers actionable conceptual nodes.'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, mindmap: false }));
    }
  };

  // Expand a Concept Node with 3 children paths
  const expandConceptNode = async (node: ConceptNode) => {
    setLoadingStates(prev => ({ ...prev, expandNode: true }));
    setApiError(null);
    try {
      const res = await fetch('/api/gemini/mindmap/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: node.label, currentNodesCount: nodes.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server failed');

      if (data.children && data.children.length > 0) {
        const newNodes: ConceptNode[] = [];
        const newConnections: Connection[] = [];
        
        data.children.forEach((child: any, i: number) => {
          const childId = `child_${node.id}_${Date.now()}_${i}`;
          // Offset position relative to parent with safety bounds
          const targetX = Math.max(20, Math.min(680, node.x + (child.offsetX || (i === 0 ? -100 : i === 1 ? 0 : 100))));
          const targetY = Math.max(20, Math.min(380, node.y + (child.offsetY || 100)));

          newNodes.push({
            id: childId,
            label: child.label,
            details: child.details,
            x: targetX,
            y: targetY
          });

          newConnections.push({
            from: node.id,
            to: childId
          });
        });

        setNodes(prev => [...prev, ...newNodes]);
        setConnections(prev => [...prev, ...newConnections]);
      }
    } catch (err: any) {
      setApiError({
        message: err.message || 'Concept Node Expansion Failed',
        details: 'Verify system prompt boundaries for JSON structure conversions.'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, expandNode: false }));
    }
  };

  // Handlers for Sandbox Dragging
  const handleNodeStartDrag = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setSelectedNodeId(nodeId);
    setDraggedNodeId(nodeId);

    // Calculate click coordinates relative to top-left of the individual node
    if (sandboxContainerRef.current) {
      const rect = sandboxContainerRef.current.getBoundingClientRect();
      const nodeXInCanvas = node.x;
      const nodeYInCanvas = node.y;
      const clickXInCanvas = e.clientX - rect.left;
      const clickYInCanvas = e.clientY - rect.top;
      
      setDragOffset({
        x: clickXInCanvas - nodeXInCanvas,
        y: clickYInCanvas - nodeYInCanvas
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId) return;
    if (sandboxContainerRef.current) {
      const rect = sandboxContainerRef.current.getBoundingClientRect();
      // Current cursor relative to canvas - initial click offset on node
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;

      // Keep node values within canvas boundary
      const boundedX = Math.max(10, Math.min(rect.width - 160, x));
      const boundedY = Math.max(10, Math.min(rect.height - 110, y));

      setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x: boundedX, y: boundedY } : n));
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggedNodeId(null);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  // Helper text styling commands inside Editor
  const applyTextMarker = (symbol: string) => {
    const textarea = document.getElementById('scribe-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = textarea.value.substring(start, end);

    let replacement = '';
    if (symbol === 'b') replacement = `**${selection || 'bold_text'}**`;
    else if (symbol === 'i') replacement = `*${selection || 'italic_text'}*`;
    else if (symbol === 'h2') replacement = `\n## ${selection || 'Heading 2'}\n`;
    else if (symbol === 'quote') replacement = `\n> ${selection || 'blockquote'}\n`;
    else if (symbol === 'bullet') replacement = `\n- ${selection || 'List item'}\n`;

    const updatedText = docText.substring(0, start) + replacement + docText.substring(end);
    setDocText(updatedText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2 + (selection ? selection.length : 9));
    }, 50);
  };

  // Helper: Get word count
  const getWordCount = () => {
    const cleanText = docText.trim();
    if (cleanText === '') return 0;
    return cleanText.split(/\s+/).length;
  };

  return (
    <div id="scribeai-canvas" className="min-h-screen bg-[#0e1115] text-[#e2e8f0] font-sans overflow-x-hidden antialiased">
      {/* Visual background atmospheric elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-12 right-1/4 w-[400px] h-[400px] bg-violet-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0e1115]/80 backdrop-blur-md border-b border-[#202735] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-950 border border-indigo-550/40 rounded-xl text-indigo-400 shadow-lg shadow-indigo-950/50">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-mono">ScribeAI</h1>
                <span className="text-[10px] font-semibold bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Live Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">Document Intelligence & Recall Sandbox</p>
            </div>
          </div>

          {/* Core Navigation tabs */}
          <nav className="flex items-center bg-[#151b27] border border-[#232d3f] rounded-xl p-1 shadow-inner">
            <button
              id="tab-studio"
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'studio' 
                  ? 'bg-indigo-655 bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2333]/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Document Studio</span>
            </button>
            <button
              id="tab-recall"
              onClick={() => setActiveTab('recall')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'recall' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2333]/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Recall Hub</span>
            </button>
            <button
              id="tab-sandbox"
              onClick={() => setActiveTab('sandbox')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'sandbox' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2333]/50'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Thought Sandbox</span>
            </button>
          </nav>

          {/* System Telemetry & Clock status */}
          <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-400 bg-[#151b27]/60 border border-[#202735] px-4 py-2 rounded-xl">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>UTC: {localTime || '00:00:00'}</span>
            </div>
            <div className="h-4 w-px bg-[#202735]" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>API PROXY: READY</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Error notification banner if API Key or configuration fails */}
        {apiError && (
          <div id="api-error-alert" className="mb-6 mx-auto bg-amber-950/45 border-l-4 border-amber-600 bg-amber-950/40 p-5 rounded-r-xl shadow-lg border-t border-b border-r border-[#3d1a10] animate-fadeIn">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white tracking-wide">{apiError.message}</h3>
                <p className="text-xs text-slate-300 mt-1">{apiError.details}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-[10.5px] font-semibold text-slate-400 bg-slate-900 border border-slate-700 px-3 py-1 rounded">
                    How to fix: Use AI Studio Settings &gt; Secrets menu to attach your GEMINI_API_KEY
                  </span>
                  <button 
                    onClick={() => setApiError(null)} 
                    className="text-xs hover:text-white text-slate-400 underline cursor-pointer"
                  >
                    Dismiss error
                  </button>
                </div>
              </div>
              <button onClick={() => setApiError(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: STUDIO CANVAS */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Editor Pane (Left Column) */}
            <div className="lg:col-span-7 flex flex-col gap-4 bg-[#111622] rounded-2xl border border-[#1f293d] p-5 shadow-xl shadow-black/30">
              <div className="flex items-center justify-between border-b border-[#212f45] pb-4">
                <div className="flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-bold tracking-wide text-white font-mono">DOCUMENT WORKSPACE</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#0c0f16]/60 border border-[#202735] px-3 py-1.5 rounded-lg">
                  <span className="text-white font-semibold">{getWordCount()}</span> words
                </div>
              </div>

              {/* Formatting Text helpers */}
              <div className="flex flex-wrap gap-1 bg-[#161c2b] p-2.5 rounded-xl border border-[#24334a]/40 items-center justify-between">
                <div className="flex flex-wrap items-center gap-1">
                  <button 
                    onClick={() => applyTextMarker('b')} 
                    className="px-3 py-1.5 hover:bg-[#1e273b] hover:text-white text-xs font-bold rounded-md text-slate-300 border border-[#212b3e]/60 transition-colors"
                  >
                    B
                  </button>
                  <button 
                    onClick={() => applyTextMarker('i')} 
                    className="px-3 py-1.5 hover:bg-[#1e273b] hover:text-white text-xs font-serif italic rounded-md text-slate-300 border border-[#212b3e]/60 transition-colors"
                  >
                    I
                  </button>
                  <button 
                    onClick={() => applyTextMarker('h2')} 
                    className="px-3.5 py-1.5 hover:bg-[#1e273b] hover:text-white text-xs font-mono font-semibold rounded-md text-slate-300 border border-[#212b3e]/60 transition-colors"
                  >
                    H2
                  </button>
                  <button 
                    onClick={() => applyTextMarker('quote')} 
                    className="px-3 py-1.5 hover:bg-[#1e273b] hover:text-white text-xs rounded-md text-slate-300 border border-[#212b3e]/60 transition-colors"
                  >
                    ” Quote
                  </button>
                  <button 
                    onClick={() => applyTextMarker('bullet')} 
                    className="px-3 py-1.5 hover:bg-[#1e273b] hover:text-white text-xs rounded-md text-slate-300 border border-[#212b3e]/60 transition-colors"
                  >
                    • List
                  </button>
                </div>

                {/* Listen Segment & TTS Controls */}
                <div className="flex items-center gap-2.5 bg-[#0e121d] px-3 py-1 rounded-lg border border-[#222e43]/60">
                  <select 
                    value={selectedVoice} 
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="bg-[#121824] text-xs font-mono text-slate-300 border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2.5 py-1"
                  >
                    <option value="Zephyr">Zephyr (Warm)</option>
                    <option value="Kore">Kore (Smooth)</option>
                    <option value="Puck">Puck (Fast-Paced)</option>
                    <option value="Fenrir">Fenrir (Low Tone)</option>
                  </select>

                  <button 
                    onClick={speakSelectedText}
                    disabled={loadingStates.tts}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      isPlayingAudio 
                        ? 'bg-rose-950 border border-rose-800 text-rose-450 text-rose-200' 
                        : 'bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300'
                    }`}
                  >
                    {loadingStates.tts ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isPlayingAudio ? (
                      <Square className="w-3.5 h-3.5 text-rose-450 fill-rose-500" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isPlayingAudio ? 'Stop Narrator' : 'Narrate'}</span>
                  </button>
                </div>
              </div>

              {/* Textarea Workspace */}
              <div className="relative">
                <textarea
                  id="scribe-textarea"
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  placeholder="Draft your essay, lecture notes, or research material here..."
                  className="w-full h-96 bg-[#0c0f16] border border-[#202a3d] rounded-xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm leading-relaxed text-slate-300 placeholder-slate-600 resize-none resize-y"
                  style={{ minHeight: '340px' }}
                />

                {/* Floating instructions about narrates selection */}
                <span className="absolute bottom-3 right-4 text-[10px] text-slate-500 pointer-events-none">
                  Highlight any section to generate custom voice narration!
                </span>
                
                {/* Simulated TTS wave elements */}
                {isPlayingAudio && (
                  <div className="absolute top-3 right-4 flex items-end gap-0.5 bg-slate-950/80 border border-indigo-500/30 px-3 py-1.5 rounded-lg">
                    <span className="text-[10px] text-slate-400 font-mono pr-2.5">AI Voice Playing...</span>
                    {ttsWaveform.map((height, idx) => (
                      <div 
                        key={idx} 
                        style={{ height: `${height}px` }} 
                        className="w-[3px] bg-gradient-to-t from-indigo-500 to-violet-400 rounded-full transition-all duration-100" 
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Research Grounding Module (Bottom of editor widget) */}
              <div className="mt-2.5 bg-[#0b0e14]/90 p-4 rounded-xl border border-[#1e283b] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1b2538] pb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold font-mono tracking-wide text-white">INTELLIGENT SOURCE FACT-CHECKER</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase font-mono tracking-wider text-sky-400 bg-sky-950/60 border border-sky-850/60 px-2 py-0.5 rounded-full">
                    Grounded with Google Search
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter search query or factual claim to verify..."
                    className="flex-1 bg-[#101520] border border-[#1e2a3f] rounded-lg px-4 py-2 text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none focus:border-sky-500 placeholder-slate-550 placeholder-slate-500 text-slate-300"
                  />
                  <button
                    onClick={runGroundingSearch}
                    disabled={loadingStates.grounding}
                    className="px-4 py-2 bg-sky-950 hover:bg-sky-900 border border-sky-700/60 text-sky-300 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {loadingStates.grounding ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Research Web</span>
                  </button>
                </div>

                {/* Grounding response block */}
                {groundingResult && (
                  <div className="bg-[#121824] p-3.5 rounded-lg border border-[#232f46] space-y-2.5">
                    <div className="text-xs text-slate-300 leading-relaxed font-sans mt-1">
                      {groundingResult}
                    </div>

                    {/* Grounding sources listed explicitly (Hard rule from google-maps and search grounding integrations) */}
                    {groundingSources.length > 0 && (
                      <div className="pt-2 border-t border-[#1e283b] space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">RELIABLE SOURCED REFS:</span>
                        <div className="flex flex-wrap gap-2 text-slate-300">
                          {groundingSources.map((src, i) => (
                            <a
                              key={i}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10.5pt] md:text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-900/40 px-3 py-1 rounded flex items-center gap-1.5"
                            >
                              <span className="truncate max-w-[160px]">{src.title}</span>
                              <ChevronRight className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* AI Action Center Pane (Right Column) */}
            <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6">
              
              {/* Presets Grid */}
              <div className="bg-[#111622] rounded-2xl border border-[#1f293d] p-5 shadow-xl">
                <div className="flex items-center gap-2 border-b border-[#212f45] pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-bold tracking-wide text-white font-mono">AI ASSISTANT ANALYSIS</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => runTextAnalysis('summarize')}
                    disabled={loadingStates.analyze}
                    className="p-3 bg-[#161c2b] hover:bg-indigo-950/30 border border-[#222e43]/80 hover:border-indigo-850 hover:border-indigo-700 hover:text-white rounded-xl text-xs font-semibold text-slate-300 text-left transition-all tracking-wide disabled:opacity-50 cursor-pointer"
                  >
                    <div className="text-indigo-400 font-mono font-bold mb-1">✍️ Summarize</div>
                    <p className="text-[10px] leading-snug text-slate-400">Extract bullet points of key claims.</p>
                  </button>
                  <button
                    onClick={() => runTextAnalysis('critique')}
                    disabled={loadingStates.analyze}
                    className="p-3 bg-[#161c2b] hover:bg-violet-950/30 border border-[#222e43]/80 hover:border-violet-850 hover:border-violet-700 hover:text-white rounded-xl text-xs font-semibold text-slate-300 text-left transition-all tracking-wide disabled:opacity-50 cursor-pointer"
                  >
                    <div className="text-violet-400 font-mono font-bold mb-1">🕵️ Critique</div>
                    <p className="text-[10px] leading-snug text-slate-400">Examine clarity, style & flow.</p>
                  </button>
                  <button
                    onClick={() => runTextAnalysis('outline')}
                    disabled={loadingStates.analyze}
                    className="p-3 bg-[#161c2b] hover:bg-teal-950/30 border border-[#222e43]/80 hover:border-teal-850 hover:border-teal-700 hover:text-white rounded-xl text-xs font-semibold text-slate-300 text-left transition-all tracking-wide disabled:opacity-50 cursor-pointer"
                  >
                    <div className="text-teal-400 font-mono font-bold mb-1">📋 Outline</div>
                    <p className="text-[10px] leading-snug text-slate-400 text-xs">Build a clean hierarchical structure.</p>
                  </button>
                  <button
                    onClick={() => runTextAnalysis('rewrite-minimal')}
                    disabled={loadingStates.analyze}
                    className="p-3 bg-[#161c2b] hover:bg-amber-950/20 border border-[#222e43]/80 hover:border-amber-800 hover:border-amber-600 hover:text-white rounded-xl text-xs font-semibold text-slate-300 text-left transition-all tracking-wide disabled:opacity-50 cursor-pointer"
                  >
                    <div className="text-amber-400 font-mono font-bold mb-1">🪄 Minimalist</div>
                    <p className="text-[10px] leading-snug text-slate-400">Draft back in short dense words.</p>
                  </button>
                  <button
                    onClick={() => runTextAnalysis('rewrite-academic')}
                    disabled={loadingStates.analyze}
                    className="p-3 bg-[#161c2b] hover:bg-emerald-950/20 border border-[#222e43]/80 hover:border-emerald-800 hover:border-emerald-600 hover:text-white rounded-xl text-xs font-semibold text-slate-300 text-left transition-all tracking-wide disabled:opacity-50 cursor-pointer"
                  >
                    <div className="text-emerald-400 font-mono font-bold mb-1">🎓 Academic</div>
                    <p className="text-[10px] leading-snug text-slate-400">Formal style transformation.</p>
                  </button>
                  <button
                    onClick={() => runTextAnalysis('rewrite-creative')}
                    disabled={loadingStates.analyze}
                    className="p-3 bg-[#161c2b] hover:bg-pink-950/20 border border-[#222e43]/80 hover:border-pink-800 hover:border-pink-600 hover:text-white rounded-xl text-xs font-semibold text-slate-300 text-left transition-all tracking-wide disabled:opacity-50 cursor-pointer"
                  >
                    <div className="text-pink-400 font-mono font-bold mb-1">🎭 Creative</div>
                    <p className="text-[10px] leading-snug text-slate-400 text-xs">Vivid imagery prose conversion.</p>
                  </button>
                </div>

                {/* Custom Instruction Command */}
                <div className="mt-4 flex gap-2">
                  <input
                    value={customCommandPrompt}
                    onChange={(e) => setCustomCommandPrompt(e.target.value)}
                    placeholder="Ask Gemini anything (e.g., 'Rewrite section 2 into a clear dialogue')"
                    className="flex-1 bg-[#0c0f16] border border-[#1e2a3f] rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none placeholder-slate-500 text-slate-300"
                  />
                  <button
                    onClick={() => runTextAnalysis('custom')}
                    disabled={loadingStates.analyze || !customCommandPrompt.trim()}
                    className="px-4 py-2.5 bg-violet-900 hover:bg-violet-800 border border-violet-750 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loadingStates.analyze ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Run prompt</span>
                  </button>
                </div>
              </div>

              {/* Analysis Result Display */}
              <div className="bg-[#111622] rounded-2xl border border-[#1f293d] p-5 shadow-xl min-h-[14rem] flex flex-col">
                <div className="flex items-center justify-between border-b border-[#212f45] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold tracking-wide text-white font-mono">AI CONSOLE RESPONSE</span>
                  </div>
                  {aiAnalysisResult && (
                    <button
                      onClick={() => setAiAnalysisResult('')}
                      className="text-xs text-slate-400 hover:text-white hover:underline scale-95 transition-all"
                    >
                      Clear panel
                    </button>
                  )}
                </div>

                {loadingStates.analyze ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-xs font-mono font-bold animate-pulse">Scribing with Gemini AI...</p>
                  </div>
                ) : aiAnalysisResult ? (
                  <div className="flex-1 text-slate-300 text-xs leading-relaxed overflow-y-auto max-h-[19rem] pr-2 font-mono whitespace-pre-wrap">
                    {aiAnalysisResult}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-[#232f46] rounded-xl text-center text-slate-500 gap-2">
                    <Sparkles className="w-6 h-6 text-slate-650 text-slate-600" />
                    <p className="text-xs leading-normal">
                      Select an AI command above to output insights, structural outlines, reformatted drafts, or critiques in modern detail.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RECALL HUB (FLASHCARDS & ACTIVE RECALL) */}
        {activeTab === 'recall' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Flashcard Module */}
            <div className="bg-[#111622] rounded-2xl border border-[#1f293d] p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#212f45] pb-4">
                <div>
                  <h3 className="text-sm font-bold tracking-wide text-white font-mono">ACTIVE-RECALL FLASHCARD DECK</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Test your retrieval memory objectively over document insights.</p>
                </div>
                <button
                  onClick={generateAIFlashcards}
                  disabled={loadingStates.flashcards}
                  className="px-3.5 py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {loadingStates.flashcards ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Re-Sync AI Flashcards</span>
                </button>
              </div>

              {flashcards.length > 0 ? (
                <div className="space-y-4">
                  {/* Card Deck indicators */}
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400">Topic: <strong className="text-indigo-400">{flashcards[activeCardIndex].topic}</strong></span>
                    <span className="text-slate-400">Card {activeCardIndex + 1} of {flashcards.length}</span>
                  </div>

                  {/* Flippable card card frame */}
                  <div 
                    onClick={() => setIsCardFlipped(prev => !prev)}
                    className="h-68 cursor-pointer relative perspective-1000 group select-none"
                  >
                    <div className={`w-full h-full duration-500 preserve-3d relative transition-transform ${isCardFlipped ? 'rotate-y-180' : ''}`}>
                      
                      {/* Front face of card */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-[#0c101a] border-2 border-slate-800 rounded-2xl flex flex-col justify-between p-6 shadow-xl">
                        <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-550 border border-slate-800 px-2.5 py-1 rounded-full self-start">
                          [FRONT] Retrieve Core Statement
                        </span>
                        
                        <p className="text-sm md:text-base text-slate-200 font-sans text-center px-4 leading-relaxed font-semibold">
                          {flashcards[activeCardIndex].front}
                        </p>

                        <span className="text-[10.5px] text-slate-500 font-mono text-center">
                          (Click to reveal answer)
                        </span>
                      </div>

                      {/* Back face of card */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-indigo-950 border-2 border-indigo-550/50 rounded-2xl flex flex-col justify-between p-6 shadow-xl rotate-y-180">
                        <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-indigo-300 border border-indigo-800 px-2.5 py-1 rounded-full self-start">
                          [BACK] Model Answer Description
                        </span>
                        
                        <p className="text-sm text-indigo-100 font-sans text-center leading-relaxed font-semibold px-4 overflow-y-auto max-h-[10rem]">
                          {flashcards[activeCardIndex].back}
                        </p>

                        <span className="text-[10.5px] text-indigo-400 font-mono text-center">
                          (Click to return to question)
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Retrieval Grading feedback */}
                  <div className="pt-2 border-t border-[#1d2739] space-y-3">
                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">GRADE VALUE RETRIEVAL:</span>
                    <div className="flex gap-2.5 justify-between">
                      <button
                        onClick={() => {
                          setCardStats(prev => ({ ...prev, [flashcards[activeCardIndex].id]: 'hard' }));
                          setIsCardFlipped(false);
                          if (activeCardIndex < flashcards.length - 1) setActiveCardIndex(p => p + 1);
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          cardStats[flashcards[activeCardIndex].id] === 'hard'
                            ? 'bg-rose-950 border-rose-500 text-rose-300 font-mono'
                            : 'bg-black/40 hover:bg-rose-950/20 border-rose-950 hover:border-rose-800 text-rose-400'
                        }`}
                      >
                        ⚠️ Hard (Repeat)
                      </button>
                      <button
                        onClick={() => {
                          setCardStats(prev => ({ ...prev, [flashcards[activeCardIndex].id]: 'medium' }));
                          setIsCardFlipped(false);
                          if (activeCardIndex < flashcards.length - 1) setActiveCardIndex(p => p + 1);
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          cardStats[flashcards[activeCardIndex].id] === 'medium'
                            ? 'bg-amber-950 border-amber-500 text-amber-305 text-amber-300'
                            : 'bg-black/40 hover:bg-amber-950/20 border-amber-950 hover:border-amber-800 text-amber-500'
                        }`}
                      >
                        ⚡ Okay
                      </button>
                      <button
                        onClick={() => {
                          setCardStats(prev => ({ ...prev, [flashcards[activeCardIndex].id]: 'easy' }));
                          setIsCardFlipped(false);
                          if (activeCardIndex < flashcards.length - 1) setActiveCardIndex(p => p + 1);
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          cardStats[flashcards[activeCardIndex].id] === 'easy'
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-305 text-emerald-300 font-mono'
                            : 'bg-black/40 hover:bg-emerald-950/20 border-emerald-950 hover:border-emerald-850 text-emerald-500'
                        }`}
                      >
                        🎉 Easy (Mastered)
                      </button>
                    </div>

                    {/* Progress navigation arrows */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => {
                          if (activeCardIndex > 0) {
                            setActiveCardIndex(p => p - 1);
                            setIsCardFlipped(false);
                          }
                        }}
                        disabled={activeCardIndex === 0}
                        className="px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-mono font-bold cursor-pointer disabled:opacity-30 disabled:pointer-events-none text-slate-300"
                      >
                        &larr; Previous Card
                      </button>
                      
                      <button
                        onClick={() => {
                          if (activeCardIndex < flashcards.length - 1) {
                            setActiveCardIndex(p => p + 1);
                            setIsCardFlipped(false);
                          } else {
                            // Loop back
                            setActiveCardIndex(0);
                            setIsCardFlipped(false);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-705 hover:bg-slate-700 rounded-lg text-xs font-mono font-bold cursor-pointer text-white"
                      >
                        Next Card &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-sm mb-4">No cards extracted. Write some documents, then trigger Re-Sync AI Flashcards.</p>
                </div>
              )}
            </div>

            {/* Quiz Section (Right Column) */}
            <div className="bg-[#111622] rounded-2xl border border-[#1f293d] p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#212f45] pb-4">
                <div>
                  <h3 className="text-sm font-bold tracking-wide text-white font-mono">INTELLIGENT RECALL QUIZ</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Let Gemini build 5 robust multiple choice test items dynamically.</p>
                </div>
                <button
                  onClick={generateAIQuiz}
                  disabled={loadingStates.quiz}
                  className="px-3.5 py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {loadingStates.quiz ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Generate Quiz</span>
                </button>
              </div>

              {quizQuestions.length > 0 ? (
                <div className="space-y-4">
                  
                  {/* Progress Line */}
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Step: Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
                    <span className="text-indigo-400 font-bold">
                      Score: {Object.keys(quizAnswers).filter(idx => quizAnswers[Number(idx)] === quizQuestions[Number(idx)].correctIndex).length} / {quizQuestions.length}
                    </span>
                  </div>

                  <div className="bg-[#0b0e14] border border-[#1c2638] rounded-xl p-4 md:p-5">
                    <p className="text-sm text-white font-semibold leading-relaxed mb-4">
                      {quizQuestions[currentQuestionIndex].question}
                    </p>

                    {/* Options list */}
                    <div className="space-y-2.5">
                      {quizQuestions[currentQuestionIndex].options.map((opt, oIdx) => {
                        const isSelected = quizAnswers[currentQuestionIndex] === oIdx;
                        const isCorrectOpt = quizQuestions[currentQuestionIndex].correctIndex === oIdx;
                        const hasAnswered = quizAnswers[currentQuestionIndex] !== undefined;

                        let optColorClass = 'bg-[#121824] border-[#1f2c41] text-slate-300 hover:bg-[#192131]';
                        
                        if (hasAnswered) {
                          if (isSelected) {
                            optColorClass = isCorrectOpt 
                              ? 'bg-emerald-950/80 border-emerald-650 border-emerald-600 text-emerald-250 font-bold font-semibold'
                              : 'bg-rose-950/80 border-rose-650 border-rose-600 text-rose-250 font-bold font-semibold';
                          } else if (isCorrectOpt) {
                            optColorClass = 'bg-[#0f2d1e] border-[#185e3c] text-emerald-300 font-semibold';
                          } else {
                            optColorClass = 'opacity-40 bg-[#121824] border-[#162030] text-slate-500';
                          }
                        } else if (selectedQuizOption === oIdx) {
                          optColorClass = 'bg-indigo-950/60 border-indigo-500 text-indigo-200';
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => {
                              if (!hasAnswered) setSelectedQuizOption(oIdx);
                            }}
                            disabled={hasAnswered}
                            className={`w-full text-left p-3.5 rounded-lg border text-xs font-sans tracking-wide transition-all duration-155 self-start ${optColorClass} ${!hasAnswered ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <span className="font-bold mr-2">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit / Explanations display */}
                  {quizAnswers[currentQuestionIndex] !== undefined ? (
                    <div className="bg-[#121824] border border-indigo-505/20 border-indigo-500/30 p-4 rounded-xl space-y-2.5">
                      <div className="flex items-center gap-2">
                        {quizAnswers[currentQuestionIndex] === quizQuestions[currentQuestionIndex].correctIndex ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold tracking-wide font-mono">
                            <CheckCircle2 className="w-4.5 h-4.5" />
                            <span>CORRECT RETRIEVAL!</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-rose-450 text-rose-400 font-bold tracking-wide font-mono">
                            <AlertCircle className="w-4.5 h-4.5" />
                            <span>RETRIEVAL DISCREPANCY</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed">
                        {quizQuestions[currentQuestionIndex].explanation}
                      </p>
                    </div>
                  ) : null}

                  {/* Submission and Control navigation */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => {
                        if (currentQuestionIndex > 0) {
                          setCurrentQuestionIndex(p => p - 1);
                          setSelectedQuizOption(quizAnswers[currentQuestionIndex - 1] ?? null);
                        }
                      }}
                      disabled={currentQuestionIndex === 0}
                      className="px-3.5 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-mono font-bold cursor-pointer text-slate-300 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      &larr; Prev Item
                    </button>

                    {quizAnswers[currentQuestionIndex] === undefined ? (
                      <button
                        onClick={() => {
                          if (selectedQuizOption !== null) {
                            setQuizAnswers(prev => ({ ...prev, [currentQuestionIndex]: selectedQuizOption }));
                            setSelectedQuizOption(null);
                          }
                        }}
                        disabled={selectedQuizOption === null}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
                      >
                        Submit Answer
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (currentQuestionIndex < quizQuestions.length - 1) {
                            setCurrentQuestionIndex(p => p + 1);
                            setSelectedQuizOption(null);
                          } else {
                            // Grade entire quiz loops back or re-runs
                            setIsQuizGraded(true);
                          }
                        }}
                        className="px-5 py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-750 text-indigo-300 text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        {currentQuestionIndex < quizQuestions.length - 1 ? 'Next Question &rarr;' : 'Finish Grading'}
                      </button>
                    )}
                  </div>

                  {isQuizGraded && (
                    <div className="bg-[#121c2c] border border-indigo-900 rounded-xl p-4 text-center space-y-3">
                      <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wide">🧠 Recall Synthesizer Report</h4>
                      <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                        You scored <strong className="text-emerald-450 text-emerald-400 text-sm">
                          {Object.keys(quizAnswers).filter(idx => quizAnswers[Number(idx)] === quizQuestions[Number(idx)].correctIndex).length} out of {quizQuestions.length}
                        </strong> correct answers. Solid focus strengthens dendritic retention loops!
                      </p>
                      <button
                        onClick={() => {
                          setCurrentQuestionIndex(0);
                          setQuizAnswers({});
                          setIsQuizGraded(false);
                          setSelectedQuizOption(null);
                        }}
                        className="text-xs font-bold font-mono tracking-wider text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                      >
                        RETRY RECALL QUIZ
                      </button>
                    </div>
                  )}

                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-[#232f46] rounded-xl flex flex-col items-center justify-center text-slate-500 gap-3">
                  <BookOpen className="w-8 h-8 text-slate-700" />
                  <p className="text-xs max-w-xs mx-auto leading-relaxed">
                    Generate an interactive conceptual multiple-choice quiz derived directly from ScribeAI document states.
                  </p>
                  <button
                    onClick={generateAIQuiz}
                    disabled={loadingStates.quiz}
                    className="px-4 py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-8o0 border-indigo-800 text-indigo-400 rounded-lg text-xs font-bold transition-all"
                  >
                    Generate Study Quiz Now
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: THOUGHT SANDBOX (CONCEPT NODE CANVAS) */}
        {activeTab === 'sandbox' && (
          <div className="flex flex-col gap-6">
            
            {/* Control Bar */}
            <div className="bg-[#111622] rounded-2xl border border-[#1f293d] p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold tracking-wide text-white font-mono">CONCEPTUAL SPATIAL MIND-MAP</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Drag nodes to reorganize concepts physically, click double arrow icons to expand ideas with children nodes.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={generateAIMindmap}
                  disabled={loadingStates.mindmap}
                  className="px-4 py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {loadingStates.mindmap ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Network className="w-3.5 h-3.5" />
                  )}
                  <span>Re-Sync AI Mindmap</span>
                </button>

                <button
                  onClick={() => {
                    // Create direct node on center map canvas
                    const cid = `custom_${Date.now()}`;
                    setNodes(prev => [...prev, {
                      id: cid,
                      label: 'New Core Concept',
                      details: 'Double click to configure details or run expansions.',
                      x: 200 + Math.random() * 100,
                      y: 150 + Math.random() * 100
                    }]);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-lg cursor-pointer"
                >
                  + Add Concept Node
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Concept physical map workspace details */}
              <div className="lg:col-span-8 flex flex-col bg-[#111622] border border-[#1f293d] rounded-2xl p-4 shadow-xl select-none">
                
                {/* Physical Grid canvas map wrapper */}
                <div 
                  ref={sandboxContainerRef}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  className="h-100 bg-[#07090f] rounded-xl border border-[#192135] overflow-hidden relative cursor-crosshair h-[28rem]"
                  style={{
                    backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1.5px)',
                    backgroundSize: '24px 24px'
                  }}
                >
                  {/* SVG background connecting wires lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none pointer-events-none">
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#312e81" />
                      </marker>
                    </defs>
                    {connections.map((conn, idx) => {
                      const fromNode = nodes.find(n => n.id === conn.from);
                      const toNode = nodes.find(n => n.id === conn.to);
                      if (!fromNode || !toNode) return null;

                      // Midpoint calculated for clean node connectors center positioning
                      const x1 = fromNode.x + 80;
                      const y1 = fromNode.y + 40;
                      const x2 = toNode.x + 80;
                      const y2 = toNode.y + 40;

                      return (
                        <g key={idx}>
                          {/* Main line connector wire */}
                          <line 
                            x1={x1} 
                            y1={y1} 
                            x2={x2} 
                            y2={y2} 
                            stroke="#1e293b" 
                            strokeWidth="2.5" 
                            className="transition-all animate-dash duration-300"
                          />
                          <line 
                            x1={x1} 
                            y1={y1} 
                            x2={x2} 
                            y2={y2} 
                            stroke="#312e81" 
                            strokeWidth="1.5"
                            strokeDasharray="6 4"
                            className="transition-all"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Physical node render structures */}
                  {nodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const isDragged = draggedNodeId === node.id;

                    return (
                      <div
                        key={node.id}
                        onMouseDown={(e) => handleNodeStartDrag(e, node.id)}
                        style={{
                          left: `${node.x}px`,
                          top: `${node.y}px`,
                          position: 'absolute'
                        }}
                        className={`w-40 bg-[#0f1422] rounded-xl border p-3.5 cursor-grab space-y-1 select-none items-stretch flex flex-col justify-between group shadow-lg transition-shadow duration-150 ${
                          isSelected 
                            ? 'border-indigo-500 shadow-indigo-950/40 text-white z-20' 
                            : 'border-[#1e2a3f] text-slate-300 hover:border-slate-700 z-10'
                        } ${isDragged ? 'cursor-grabbing opacity-90 shadow-2xl z-30' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[11.5px] font-bold font-mono tracking-tight tracking-wide leading-tight line-clamp-2">
                            {node.label}
                          </span>
                          
                          {/* Close controls */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNode(node.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 hover:text-white text-slate-500 p-0.5 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Node mini abstract */}
                        <p className="text-[9.5px] text-slate-400 font-sans leading-normal line-clamp-2">
                          {node.details}
                        </p>

                        {/* Node Footer expansions tool trigger actions */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#1e273a] mt-1.5">
                          <span className="text-[8px] uppercase font-bold tracking-widest text-[#405470] font-mono">
                            NODE EXP
                          </span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              expandConceptNode(node);
                            }}
                            disabled={loadingStates.expandNode}
                            title="Expand concept with AI pathways"
                            className="text-[10px] bg-slate-900 border border-[#232d3f] hover:border-indigo-500 hover:text-indigo-400 px-1.5 py-0.5 rounded text-slate-400 font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {loadingStates.expandNode ? (
                              '...'
                            ) : (
                              '+ Expand'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Canvas instructions inside border frame */}
                  {nodes.length === 0 && (
                    <div className="absolute inset-x-8 top-1/3 text-center text-slate-500 flex flex-col items-center gap-2">
                      <Network className="w-10 h-10 text-slate-8 w-10 h-10 text-slate-700" />
                      <p className="text-xs">Mind map grid canvas empty. Create bespoke maps or re-sync with AI documents above.</p>
                    </div>
                  )}

                </div>
              </div>

              {/* Sidebar: Details Editor Panel (Right Column) */}
              <div className="lg:col-span-4 bg-[#111622] border border-[#1f293d] rounded-2xl p-5 flex flex-col shadow-xl">
                <div className="border-b border-[#212f45] pb-3 mb-4 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">Concept Inspector</span>
                </div>

                {selectedNodeId ? (
                  (() => {
                    const activeNode = nodes.find(n => n.id === selectedNodeId);
                    if (!activeNode) return null;

                    return (
                      <div className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                          {/* Label input */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Concept Label</label>
                            <input
                              value={activeNode.label}
                              onChange={(e) => {
                                const newLabel = e.target.value;
                                setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, label: newLabel } : n));
                              }}
                              className="w-full bg-[#0c0f16] border border-[#1e2a3f] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                            />
                          </div>

                          {/* Expansion Description details */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Expansion Details</label>
                            <textarea
                              value={activeNode.details}
                              rows={6}
                              onChange={(e) => {
                                const newDetails = e.target.value;
                                setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, details: newDetails } : n));
                              }}
                              className="w-full bg-[#0c0f16] border border-[#1e2a3f] rounded-xl px-3.5 py-2.5 text-xs text-slate-300 leading-relaxed font-sans placeholder-slate-700 resize-none focus:outline-none"
                            />
                          </div>

                          <div className="bg-[#151d2a] p-3 rounded-lg border border-[#232f41] rounded-xl text-[10px] font-mono text-slate-450 text-slate-400 leading-normal space-y-1">
                            <div>Node ID: <strong className="text-slate-300">{activeNode.id}</strong></div>
                            <div>Coords: (X:{Math.round(activeNode.x)}, Y:{Math.round(activeNode.y)})</div>
                          </div>
                        </div>

                        {/* Command bar at bottom */}
                        <div className="pt-4 border-t border-[#1d2739] space-y-2">
                          <button
                            onClick={() => expandConceptNode(activeNode)}
                            disabled={loadingStates.expandNode}
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
                          >
                            {loadingStates.expandNode ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>Generate AI Child Branches</span>
                          </button>
                          
                          <button
                            onClick={() => deleteNode(selectedNodeId)}
                            className="w-full py-2 bg-rose-950/20 hover:bg-rose-900 border border-rose-950 hover:border-rose-800 text-rose-450 text-rose-300 text-xs font-semibold rounded-xl cursor-pointer transition-all"
                          >
                            Delete Concept
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#232f46] rounded-xl p-8 text-center text-slate-500 gap-2">
                    <Sliders className="w-6 h-6 text-slate-700" />
                    <p className="text-xs">
                      Select or click any Concept card on the canvas to inspect its details, change titles, modify notes, or expand links.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Styled Micro-Footer */}
      <footer className="border-t border-[#1f283a] bg-[#07090f] py-6 px-6 mt-16 text-center text-xs text-slate-500 font-mono tracking-wide">
        <p className="max-w-xl mx-auto">
          ScribeAI Document Ecosystem &copy; 2026. Custom client interactions engineered to optimize active-recall retention models via Gemini 3.5.
        </p>
      </footer>
    </div>
  );
}
