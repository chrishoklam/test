import React, { useMemo } from 'react';

interface AtomProps {
  id: string;
  symbol: string;
  name: string;
  radius: number;
  color: string;
  valenceElectrons: number;
  maxValence: number; // Used to calculate slots/angles
  targetSlots?: number; // How many empty slots to visualize explicitly
  charge: string;
  opacity?: number;
  scale?: number;
  isTarget?: boolean;
}

const Atom: React.FC<AtomProps> = ({
  symbol,
  name,
  radius,
  color,
  valenceElectrons,
  maxValence,
  targetSlots = 0,
  charge,
  opacity = 1,
  scale = 1,
  isTarget
}) => {
  // Shell configurations (Simplified Bohr model)
  const shells = useMemo(() => [
    { r: radius * 0.3, dashed: true },
    { r: radius * 0.6, dashed: true },
    { r: radius * 1.0, dashed: false }, // Valence shell
  ], [radius]);

  // Calculate electron positions
  // We distribute them evenly around the circle starting from different angles based on count
  const renderElectrons = () => {
    const items = [];
    const step = 360 / Math.max(8, maxValence); // Assume octet usually, unless specified
    
    // Render existing valence electrons
    for (let i = 0; i < valenceElectrons; i++) {
      // Offset starting angle so they look nice. 
      // If full (8), 0..315.
      // If 1 (Na), we usually want it at 0 or 180 depending on side.
      // For generic, we just fill from 0.
      // However, to make it look like a "pair" filling order is complex, we'll do simple distribution.
      // For the sake of the game, simpler is better: fill clockwise.
      
      const angle = i * step; 
      const rad = (angle * Math.PI) / 180;
      items.push(
        <circle
          key={`e-${i}`}
          cx={Math.cos(rad) * radius}
          cy={Math.sin(rad) * radius}
          r={6}
          fill="#facc15" // Yellow 400
          stroke="#ca8a04"
          strokeWidth="1"
        />
      );
    }
    return items;
  };

  // Render Target Slots (Empty holes)
  const renderSlots = () => {
    if (!isTarget || targetSlots <= 0) return null;
    
    const items = [];
    const step = 360 / Math.max(8, maxValence);
    
    // We want slots to appear where electrons are NOT.
    // Ideally, we place slots at angles following the existing electrons.
    // e.g. Cl has 7 electrons (0..6*45), slot is at 7*45 (315) or 180 depending on orientation.
    // To simplify: We just start placing slots from the "end" of the electron list.
    
    // Special alignment for visual clarity:
    // If it's an ion receiving electrons, we often want the slot facing the source.
    // We'll rely on the parent to rotate the Atom group if needed, or just standard filling.
    
    for (let i = 0; i < targetSlots; i++) {
      const electronIndex = valenceElectrons + i;
      const angle = electronIndex * step;
      const rad = (angle * Math.PI) / 180;
      
      items.push(
        <circle
          key={`slot-${i}`}
          cx={Math.cos(rad) * radius}
          cy={Math.sin(rad) * radius}
          r={8}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="3 3"
          className="animate-pulse"
        />
      );
    }
    return items;
  };

  return (
    <g style={{ opacity: opacity, transition: 'all 1s ease-in-out' }}>
      <g transform={`scale(${scale})`}>
        {/* Label */}
        <text
          x="0"
          y={-radius * 1.5}
          textAnchor="middle"
          className="fill-slate-300 text-lg font-semibold pointer-events-none select-none"
        >
          {name}
        </text>

        {/* Charge Indicator */}
        <text
          x={radius * 0.9}
          y={-radius * 0.9}
          textAnchor="middle"
          className={`text-xl font-bold pointer-events-none select-none ${charge && charge !== '0' && !charge.startsWith('0') ? 'fill-yellow-400' : 'fill-slate-500'}`}
        >
          {symbol}
          <tspan dy="-10" fontSize="0.7em">{charge === '0' ? '' : charge}</tspan>
        </text>

        {/* Nucleus */}
        <circle r={radius * 0.25} fill={color} className="opacity-90 shadow-inner" />
        <text
          x="0"
          y="2"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-white font-bold text-sm pointer-events-none select-none"
        >
          {symbol}
        </text>

        {/* Inner Shells */}
        {shells.map((shell, i) => (
          <circle
            key={`shell-${i}`}
            r={shell.r}
            fill="none"
            stroke={color}
            strokeWidth={shell.dashed ? 1 : 2}
            className={shell.dashed ? "opacity-30" : "opacity-60"}
            strokeDasharray={shell.dashed ? "4 2" : "none"}
          />
        ))}

        {/* Inner Electron Decorations (Fixed for visual density) */}
        {[0, 120, 240].map((angle, i) => {
             const r = shells[0].r;
             const rad = (angle * Math.PI) / 180;
             return <circle key={`in-e-${i}`} cx={Math.cos(rad)*r} cy={Math.sin(rad)*r} r={3} fill="#94a3b8" opacity="0.5"/>
        })}

        {/* Valence Items */}
        {renderElectrons()}
        {renderSlots()}
      </g>
    </g>
  );
};

export default Atom;
