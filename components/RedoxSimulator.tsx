import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Coordinate, Scenario, AtomConfig, GameState } from '../types';
import Atom from './Atom';
import { getRedoxExplanation } from '../services/geminiService';
import { Info, RotateCcw, Sparkles, ArrowLeft } from 'lucide-react';

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 500;

interface RedoxSimulatorProps {
  scenario: Scenario;
  onBack: () => void;
}

const RedoxSimulator: React.FC<RedoxSimulatorProps> = ({ scenario, onBack }) => {
  // --- State Initialization ---
  const initializeState = (scen: Scenario): GameState => {
    return {
      scenarioId: scen.id,
      atoms: JSON.parse(JSON.stringify(scen.atoms)), // Deep copy
      transferredCount: {}, // Empty start
      isComplete: false,
    };
  };

  const [gameState, setGameState] = useState<GameState>(() => initializeState(scenario));
  const [dragState, setDragState] = useState<{
    active: boolean;
    atomId: string | null; // Source atom
    pos: Coordinate;
  }>({ active: false, atomId: null, pos: { x: 0, y: 0 } });

  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Reset when scenario changes
  useEffect(() => {
    setGameState(initializeState(scenario));
    setAiExplanation('');
  }, [scenario]);

  // --- Logic Helpers ---

  const getTransferKey = (from: string, to: string) => `${from}->${to}`;

  const checkCompletion = (currentState: GameState) => {
    // Check if all required transfers are met
    for (const req of scenario.transfers) {
      const key = getTransferKey(req.fromAtomId, req.toAtomId);
      const done = currentState.transferredCount[key] || 0;
      if (done < req.count) return false;
    }
    return true;
  };

  const handleCompletionEffects = (newState: GameState) => {
    // Apply final visual states (Charge updates, Opacity changes for Phase changes)
    const nextAtoms = newState.atoms.map(atom => {
      // Find original config to see final state expectations
      // For dynamic logic:
      // If atom was source, it becomes cation.
      // If atom was target, it becomes anion or neutral solid.
      
      const original = scenario.atoms.find(a => a.id === atom.id);
      if (!original) return atom;

      // In a real engine, we'd calculate charge dynamically based on electron delta.
      // Here, we hardcode transition to "finalCharge" defined in scenario if available,
      // or just assume generic +/- based on transfer.
      // Let's use the Scenario's defined atoms state for final properties if we want specific overrides
      // But we need to preserve position.
      
      // Heuristic: If complete, transition to final properties defined in the config
      // We didn't explicitly put final properties in AtomConfig in `types.ts` heavily, 
      // but let's assume we update charges and scale.
      
      // Let's use a simpler heuristic for this educational app:
      // If complete:
      // Sources -> Charge Up, Scale Down, Opacity change?
      // Targets -> Charge Down, Scale Up, Opacity change?
      
      let newCharge = atom.charge;
      let newScale = atom.scale;
      let newOpacity = atom.opacity;

      // Logic for Level 3 (Zn + Cu2+)
      // Zn (Source) -> Dissolves (Opacity 0 or low), Charge +2
      // Cu (Target) -> Precipitates (Opacity 1), Charge 0
      
      if (scenario.id === 'level3') {
         if (atom.isSource) {
            newCharge = '+2';
            newOpacity = 0.3; // Dissolves
            newScale = 0.8;
         } else if (atom.isTarget) {
            newCharge = '0';
            newOpacity = 1; // Becomes solid
            newScale = 1;
         }
      } else if (scenario.id === 'level4') {
          // Cu -> Cu2+ + 2e-
          // Ag+ + e- -> Ag
          if (atom.isSource) {
              newCharge = '+2';
              newScale = 0.8;
          } else if (atom.isTarget) {
              newCharge = '0';
              newScale = 1.1;
          }
      } else {
        // Standard Ionic (Na+Cl, Mg+O)
        if (atom.isSource) {
             // Calculate positive charge based on electrons lost
             // But simpler: just use generic final state logic
             newCharge = atom.id === 'Mg' ? '+2' : '+';
             newScale = 0.8;
        }
        if (atom.isTarget) {
            newCharge = atom.id === 'O' ? '-2' : '-';
            newScale = 1.1;
        }
      }

      return { ...atom, charge: newCharge, scale: newScale, opacity: newOpacity };
    });

    return { ...newState, atoms: nextAtoms, isComplete: true };
  };

  // --- Interaction ---

  const getSVGPoint = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, atomId: string) => {
    if (gameState.isComplete) return;
    
    // Check if this atom can donate electrons
    const atom = gameState.atoms.find(a => a.id === atomId);
    if (!atom || !atom.isSource || atom.valenceElectrons <= 0) return;

    // Check if we have already transferred enough from this specific atom
    // (Complex if one source feeds multiple targets, simplified here: just check if it has e-)
    
    e.preventDefault();
    const pos = getSVGPoint(e);
    setDragState({ active: true, atomId, pos });
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState.active) return;
    const pos = getSVGPoint(e);
    setDragState(prev => ({ ...prev, pos }));
  }, [dragState.active]);

  const handleDragEnd = useCallback(() => {
    if (!dragState.active || !dragState.atomId) return;

    // Hit detection
    let landed = false;
    let nextState = { ...gameState };

    // Find valid targets for this source
    const validTransfers = scenario.transfers.filter(t => t.fromAtomId === dragState.atomId);
    
    for (const transfer of validTransfers) {
      const targetAtom = nextState.atoms.find(a => a.id === transfer.toAtomId);
      if (!targetAtom) continue;

      // Check distance
      const dist = Math.sqrt(
        Math.pow(dragState.pos.x - targetAtom.x, 2) + 
        Math.pow(dragState.pos.y - targetAtom.y, 2)
      );

      // Check if target needs electrons (has slots)
      // We assume if transfer is defined, it can accept up to 'count'
      const currentTransferred = nextState.transferredCount[getTransferKey(transfer.fromAtomId, transfer.toAtomId)] || 0;
      
      if (dist < targetAtom.radius + 30 && currentTransferred < transfer.count) {
        // Success!
        landed = true;
        
        // Update counters
        const key = getTransferKey(transfer.fromAtomId, transfer.toAtomId);
        nextState.transferredCount = {
          ...nextState.transferredCount,
          [key]: currentTransferred + 1
        };

        // Move electron in state (Decrement source, Increment target)
        nextState.atoms = nextState.atoms.map(a => {
          if (a.id === transfer.fromAtomId) {
            return { ...a, valenceElectrons: a.valenceElectrons - 1 };
          }
          if (a.id === transfer.toAtomId) {
            // If target has explicit slots logic (like Cl), we reduce slots or just add electron
            // For visualization, we add valence electron.
            return { 
                ...a, 
                valenceElectrons: a.valenceElectrons + 1,
                targetSlots: (a.targetSlots || 0) - 1
            };
          }
          return a;
        });

        break; // Only land on one target
      }
    }

    if (landed) {
      if (checkCompletion(nextState)) {
        nextState = handleCompletionEffects(nextState);
      }
      setGameState(nextState);
    }

    setDragState({ active: false, atomId: null, pos: { x: 0, y: 0 } });
  }, [dragState, gameState, scenario]);

  useEffect(() => {
    if (dragState.active) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [dragState.active, handleDragMove, handleDragEnd]);

  const handleAskAI = async () => {
    if (aiExplanation) return;
    setIsLoadingAi(true);
    const explanation = await getRedoxExplanation(scenario.explanationPrompt);
    setAiExplanation(explanation);
    setIsLoadingAi(false);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto p-4 gap-6">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
            <ArrowLeft size={20}/> 返回選單
        </button>
        <div className="text-center">
             <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wider">
                {scenario.title}
             </h1>
             <span className="text-sm bg-blue-900/80 text-blue-200 px-3 py-1 rounded-full mt-1 inline-block font-mono">
                {scenario.equation}
             </span>
        </div>
        <div className="w-24"></div> {/* Spacer */}
      </div>

      {/* Game Area */}
      <div className="relative w-full aspect-[16/9] md:aspect-[2/1] bg-slate-800/50 rounded-xl border border-slate-700 shadow-2xl overflow-hidden select-none touch-none">
        
        {/* Success Overlay */}
        <div className={`absolute inset-0 flex items-center justify-center bg-black/60 z-20 pointer-events-none transition-opacity duration-700 ${gameState.isComplete ? 'opacity-100' : 'opacity-0'}`}>
             <div className="bg-slate-900 border border-green-500 p-6 rounded-2xl shadow-[0_0_50px_rgba(34,197,94,0.3)] transform scale-100 animate-bounce-in text-center">
                 <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-2">
                    反應成功!
                 </h2>
                 <p className="text-slate-300">電子轉移完成，物質狀態已更新。</p>
             </div>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Render Atoms */}
          {gameState.atoms.map((atom) => (
            <g 
                key={atom.id} 
                transform={`translate(${atom.x}, ${atom.y})`}
            >
                {/* Hit area for drag initiation (if source) */}
                {atom.isSource && !gameState.isComplete && atom.valenceElectrons > 0 && (
                    <circle 
                        r={atom.radius + 10} 
                        fill="transparent" 
                        className="cursor-grab active:cursor-grabbing"
                        onMouseDown={(e) => handleDragStart(e, atom.id)}
                        onTouchStart={(e) => handleDragStart(e, atom.id)}
                    />
                )}
                
                <Atom 
                    {...atom}
                    isTarget={atom.isTarget} // Pass explicit target flag for visual handling if needed
                />
            </g>
          ))}

          {/* Render Draggable Electron (The Ghost) */}
          {dragState.active && (
            <g transform={`translate(${dragState.pos.x}, ${dragState.pos.y})`} style={{ pointerEvents: 'none' }}>
                <circle r={12} fill="#facc15" stroke="white" strokeWidth="2" className="animate-pulse shadow-[0_0_15px_#facc15]"/>
                <text y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#713f12">e⁻</text>
            </g>
          )}

          {/* Instructions / Hints in SVG */}
          {!gameState.isComplete && !dragState.active && (
             gameState.atoms.filter(a => a.isSource && a.valenceElectrons > 0).map(a => (
                <g key={`hint-${a.id}`} transform={`translate(${a.x}, ${a.y - a.radius - 40})`}>
                    <text textAnchor="middle" fill="#94a3b8" fontSize="14" className="animate-bounce">
                        拖曳電子
                    </text>
                </g>
             ))
          )}

        </svg>

        {/* Reset */}
        <button
          onClick={() => setGameState(initializeState(scenario))}
          className="absolute bottom-4 right-4 p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white transition-colors border border-slate-600 shadow-lg z-10"
          title="重置 (Reset)"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Info Panel */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scenario Description */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Info size={20} className="text-blue-400" />
            任務說明
          </h3>
          <p className="text-slate-300 leading-relaxed">
            {scenario.description}
          </p>
          <div className="mt-4 pt-4 border-t border-slate-700">
             <h4 className="text-sm font-semibold text-slate-400 mb-2">反應物狀態:</h4>
             <ul className="space-y-1">
                {scenario.atoms.map(a => (
                    <li key={a.id} className="text-xs text-slate-500 flex items-center justify-between">
                        <span>{a.name} ({a.symbol})</span>
                        <span className={a.isSource ? "text-blue-400" : "text-green-400"}>
                            {a.isSource ? "氧化 (失去 e⁻)" : a.isTarget ? "還原 (得到 e⁻)" : "旁觀"}
                        </span>
                    </li>
                ))}
             </ul>
          </div>
        </div>

        {/* AI Tutor */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-800 p-6 rounded-lg border border-indigo-500/30 flex flex-col">
           <div className="flex justify-between items-center mb-2">
             <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-400" />
                AI 導師
            </h3>
           </div>
          
          <div className="flex-grow text-sm text-indigo-100/90 leading-relaxed min-h-[100px]">
            {aiExplanation ? (
              <div className="animate-fade-in bg-black/20 p-3 rounded-md border border-white/5">
                {aiExplanation}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-4">
                <p className="text-center text-slate-400">
                    不確定為什麼會發生這個反應？
                </p>
                <button 
                  onClick={handleAskAI} 
                  disabled={isLoadingAi}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-md transition-all font-medium text-sm flex items-center gap-2 shadow-lg hover:shadow-indigo-500/25"
                >
                  {isLoadingAi ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      分析中...
                    </>
                  ) : (
                    "請解釋這個化學反應"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedoxSimulator;
