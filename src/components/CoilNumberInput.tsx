'use client';

import React, { useRef, useEffect } from 'react';

interface CoilNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function CoilNumberInput({ value, onChange, required }: CoilNumberInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Ensure value is handled in chunks of 5, total 8 blocks
  const getChunks = (val: string) => {
    const chunks = [];
    for (let i = 0; i < 8; i++) {
      chunks.push(val.substring(i * 5, (i + 1) * 5) || '');
    }
    return chunks;
  };

  const displayChunks = getChunks(value);

  const handleChange = (index: number, val: string) => {
    const newChunks = [...displayChunks];
    newChunks[index] = val.toUpperCase().slice(0, 5);
    
    const newValue = newChunks.join('');
    onChange(newValue);

    // Auto-focus move logic: if 5 chars entered, move to next
    if (val.length >= 5 && index < 7) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace: if current box is empty, move to previous
    if (e.key === 'Backspace' && !displayChunks[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          maxLength={5}
          className="w-14 h-8 text-center border-2 border-slate-300 rounded-md uppercase font-mono text-sm font-bold bg-white text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
          value={displayChunks[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          required={required && i === 0}
          placeholder="-----"
          autoComplete="off"
        />
      ))}
    </div>
  );
}
