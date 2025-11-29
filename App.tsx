import React, { useState } from 'react';
import RedoxSimulator from './components/RedoxSimulator';
import { Scenario, AtomConfig } from './types';
import { Beaker, Atom, Zap, Layers } from 'lucide-react';

// --- Level Configuration Data ---

const LEVEL_1_NA_CL: Scenario = {
  id: 'level1',
  level: 1,
  title: '基礎離子鍵 (Basic Ionic Bonding)',
  description: '鈉 (Na) 是一種活性金屬，傾向於失去 1 個電子。氯 (Cl) 需要 1 個電子來填滿價殼層。請將鈉的價電子拖曳到氯的空位中。',
  equation: 'Na + Cl → Na⁺ + Cl⁻',
  explanationPrompt: '解釋 Na 和 Cl 反應生成 NaCl 的過程，重點在於八隅體規則和電子轉移。',
  atoms: [
    {
      id: 'Na', symbol: 'Na', name: '鈉', atomicNumber: 11,
      valenceElectrons: 1, maxValence: 8, radius: 80, color: '#3b82f6', charge: '0',
      x: 250, y: 250, opacity: 1, scale: 1, isSource: true
    },
    {
      id: 'Cl', symbol: 'Cl', name: '氯', atomicNumber: 17,
      valenceElectrons: 7, maxValence: 8, targetSlots: 1, radius: 70, color: '#22c55e', charge: '0',
      x: 550, y: 250, opacity: 1, scale: 1, isTarget: true
    }
  ],
  transfers: [{ fromAtomId: 'Na', toAtomId: 'Cl', count: 1 }]
};

const LEVEL_2_MG_O: Scenario = {
  id: 'level2',
  level: 2,
  title: '二價電子轉移 (Mg + O)',
  description: '鎂 (Mg) 有 2 個價電子。氧 (O) 需要 2 個電子才能穩定。你需要完成兩次電子轉移才能形成氧化鎂 (MgO)。',
  equation: 'Mg + O → Mg²⁺ + O²⁻',
  explanationPrompt: '解釋 Mg 和 O 生成 MgO 的過程，為什麼涉及兩個電子的轉移？',
  atoms: [
    {
      id: 'Mg', symbol: 'Mg', name: '鎂', atomicNumber: 12,
      valenceElectrons: 2, maxValence: 8, radius: 85, color: '#6366f1', charge: '0',
      x: 250, y: 250, opacity: 1, scale: 1, isSource: true
    },
    {
      id: 'O', symbol: 'O', name: '氧', atomicNumber: 8,
      valenceElectrons: 6, maxValence: 8, targetSlots: 2, radius: 65, color: '#ef4444', charge: '0',
      x: 550, y: 250, opacity: 1, scale: 1, isTarget: true
    }
  ],
  transfers: [{ fromAtomId: 'Mg', toAtomId: 'O', count: 2 }]
};

const LEVEL_3_ZN_CU: Scenario = {
  id: 'level3',
  level: 3,
  title: '金屬置換反應 (Displacement)',
  description: '鋅 (Zn) 比銅 (Cu) 活性大。將鋅片放入銅離子溶液中，鋅會失去 2 個電子溶解，而銅離子會獲得電子析出成為固體銅。',
  equation: 'Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s)',
  explanationPrompt: '解釋鋅和銅離子的氧化還原置換反應。為什麼鋅會溶解而銅會析出？',
  atoms: [
    {
      id: 'Zn', symbol: 'Zn', name: '鋅 (固體)', atomicNumber: 30,
      valenceElectrons: 2, maxValence: 18, radius: 90, color: '#94a3b8', charge: '0',
      x: 200, y: 250, opacity: 1, scale: 1, isSource: true
    },
    {
      id: 'Cu', symbol: 'Cu', name: '銅離子 (水溶液)', atomicNumber: 29,
      valenceElectrons: 0, maxValence: 18, targetSlots: 2, radius: 90, color: '#0ea5e9', charge: '+2',
      x: 600, y: 250, opacity: 0.6, scale: 0.9, isTarget: true // Starts transparent-ish (solution)
    }
  ],
  transfers: [{ fromAtomId: 'Zn', toAtomId: 'Cu', count: 2 }]
};

const LEVEL_4_CU_AG: Scenario = {
  id: 'level4',
  level: 4,
  title: '化學計量 (Stoichiometry)',
  description: '銅 (Cu) 失去 2 個電子，但銀離子 (Ag⁺) 只需要 1 個電子。因此，1 個銅原子需要與 2 個銀離子反應。將銅的電子分配給兩個銀離子！',
  equation: 'Cu + 2Ag⁺ → Cu²⁺ + 2Ag',
  explanationPrompt: '解釋銅與銀離子的反應，為什麼一個銅原子需要對應兩個銀離子？',
  atoms: [
    {
      id: 'Cu', symbol: 'Cu', name: '銅', atomicNumber: 29,
      valenceElectrons: 2, maxValence: 18, radius: 80, color: '#d97706', charge: '0',
      x: 200, y: 250, opacity: 1, scale: 1, isSource: true
    },
    {
      id: 'Ag1', symbol: 'Ag', name: '銀離子 1', atomicNumber: 47,
      valenceElectrons: 0, maxValence: 18, targetSlots: 1, radius: 60, color: '#e2e8f0', charge: '+',
      x: 600, y: 150, opacity: 0.7, scale: 0.9, isTarget: true
    },
    {
      id: 'Ag2', symbol: 'Ag', name: '銀離子 2', atomicNumber: 47,
      valenceElectrons: 0, maxValence: 18, targetSlots: 1, radius: 60, color: '#e2e8f0', charge: '+',
      x: 600, y: 350, opacity: 0.7, scale: 0.9, isTarget: true
    }
  ],
  transfers: [
    { fromAtomId: 'Cu', toAtomId: 'Ag1', count: 1 },
    { fromAtomId: 'Cu', toAtomId: 'Ag2', count: 1 }
  ]
};

const SCENARIOS = [LEVEL_1_NA_CL, LEVEL_2_MG_O, LEVEL_3_ZN_CU, LEVEL_4_CU_AG];

// --- Main Menu Component ---

const MainMenu = ({ onSelect }: { onSelect: (s: Scenario) => void }) => {
  return (
    <div className="w-full max-w-4xl px-4 animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4">
          Redox Master
        </h1>
        <p className="text-slate-400 text-lg">
          互動式氧化還原反應模擬器
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario)}
            className="group relative bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Atom size={64} />
            </div>
            
            <div className="flex items-center gap-3 mb-3">
               <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                 {scenario.level}
               </div>
               <h3 className="text-xl font-bold text-slate-100">{scenario.title}</h3>
            </div>
            
            <div className="bg-slate-900/50 rounded px-3 py-1.5 inline-block mb-4 border border-slate-800">
               <code className="text-sm text-green-400 font-mono">{scenario.equation}</code>
            </div>

            <p className="text-slate-400 text-sm line-clamp-2">
                {scenario.description.split('。')[0]}
            </p>

            <div className="mt-4 flex items-center text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0">
                開始實驗 &rarr;
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- App Component ---

function App() {
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] text-slate-50 font-sans selection:bg-blue-500/30">
      
      {currentScenario ? (
        <RedoxSimulator 
          scenario={currentScenario} 
          onBack={() => setCurrentScenario(null)} 
        />
      ) : (
        <MainMenu onSelect={setCurrentScenario} />
      )}
      
      <footer className="mt-16 text-slate-600 text-sm pb-4">
        <p>© 2024 Educational Science Interactive - Powered by Gemini</p>
      </footer>
    </div>
  );
}

export default App;
