import React from 'react';

export interface Coordinate {
  x: number;
  y: number;
}

export interface AtomConfig {
  id: string;
  symbol: string;
  name: string;
  atomicNumber: number; // For identifying distinct colors/sizes if needed, or visual logic
  valenceElectrons: number; // Current count
  maxValence: number; // For calculating slots (usually 8, sometimes 2 or 18)
  radius: number;
  color: string;
  charge: string;
  x: number;
  y: number;
  opacity: number;
  scale: number;
  isSource?: boolean; // Can donate electrons
  isTarget?: boolean; // Can accept electrons
  targetSlots?: number; // Explicit number of slots to draw (if different from maxValence - valence)
}

export interface ElectronTransferConfig {
  fromAtomId: string;
  toAtomId: string;
  count: number; // Total electrons to transfer for this specific pair
}

export interface Scenario {
  id: string;
  level: number;
  title: string;
  description: string;
  equation: string;
  atoms: AtomConfig[];
  transfers: ElectronTransferConfig[];
  explanationPrompt: string; // Prompt for AI
}

export interface GameState {
  scenarioId: string;
  atoms: AtomConfig[]; // Current state of atoms
  transferredCount: Record<string, number>; // Key: "fromId-toId", Value: count
  isComplete: boolean;
}
