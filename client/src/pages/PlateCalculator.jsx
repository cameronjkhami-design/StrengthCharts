import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPrimaryColor } from '../utils/colors';

const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const BAR_LBS = 45;
const BAR_KG = 20;

function calculatePlates(targetWeight, unit) {
  const bar = unit === 'lbs' ? BAR_LBS : BAR_KG;
  const availablePlates = unit === 'lbs' ? PLATES_LBS : PLATES_KG;

  if (targetWeight <= bar) return { plates: [], perSide: 0, bar };

  let remaining = (targetWeight - bar) / 2; // weight per side
  const plates = [];

  for (const plate of availablePlates) {
    while (remaining >= plate - 0.01) {
      plates.push(plate);
      remaining -= plate;
    }
  }

  return {
    plates,
    perSide: (targetWeight - bar) / 2,
    bar,
    remainder: Math.round(remaining * 100) / 100,
  };
}

// Plate color mapping
function getPlateColor(weight, unit) {
  if (unit === 'lbs') {
    if (weight === 45) return '#3b82f6';
    if (weight === 35) return '#f59e0b';
    if (weight === 25) return '#22c55e';
    if (weight === 10) return '#ef4444';
    if (weight === 5) return '#a855f7';
    if (weight === 2.5) return '#6b7280';
  } else {
    if (weight === 25) return '#ef4444';
    if (weight === 20) return '#3b82f6';
    if (weight === 15) return '#f59e0b';
    if (weight === 10) return '#22c55e';
    if (weight === 5) return '#a855f7';
    if (weight === 2.5) return '#ec4899';
    if (weight === 1.25) return '#6b7280';
  }
  return '#6b7280';
}

function getPlateHeight(weight, unit) {
  if (unit === 'lbs') {
    if (weight >= 25) return 'h-20';
    if (weight >= 10) return 'h-16';
    if (weight >= 5) return 'h-14';
    return 'h-12';
  }
  if (weight >= 15) return 'h-20';
  if (weight >= 10) return 'h-16';
  if (weight >= 5) return 'h-14';
  return 'h-12';
}

export default function PlateCalculator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unit = user?.unit_pref || 'lbs';
  const [targetWeight, setTargetWeight] = useState('');
  const [barWeight, setBarWeight] = useState(unit === 'lbs' ? BAR_LBS : BAR_KG);

  const target = parseFloat(targetWeight);
  const result = !isNaN(target) && target > 0 ? calculatePlates(target, unit) : null;

  // Quick weight presets
  const presets = unit === 'lbs'
    ? [135, 185, 225, 275, 315, 365, 405, 495]
    : [60, 80, 100, 120, 140, 160, 180, 200];

  return (
    <div className="px-4 pt-6 pb-4 overflow-x-hidden">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="text-primary text-sm font-display font-bold uppercase mb-4 flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </button>

      <h1 className="font-display font-extrabold text-3xl text-white mb-2">Plate Calculator</h1>
      <p className="text-gray-500 text-xs mb-5">Calculate plates needed per side of the barbell</p>

      {/* Target Weight Input */}
      <div className="card mb-4">
        <label className="font-display font-bold text-sm uppercase text-gray-400 mb-2 block">
          Target Weight ({unit})
        </label>
        <input
          type="number"
          value={targetWeight}
          onChange={(e) => setTargetWeight(e.target.value)}
          placeholder={`Enter weight in ${unit}`}
          className="input-field w-full font-display text-2xl text-center mb-3"
          inputMode="decimal"
          step="any"
        />

        {/* Quick presets */}
        <div className="flex gap-2 flex-wrap">
          {presets.map(w => (
            <button
              key={w}
              onClick={() => setTargetWeight(String(w))}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold uppercase transition-all ${
                targetWeight === String(w)
                  ? 'bg-primary text-dark-900'
                  : 'bg-dark-700 text-gray-400 border border-dark-500'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Bar Weight Selector */}
      <div className="card mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-display font-bold text-sm uppercase text-gray-400">Bar Weight</h3>
            <p className="text-gray-500 text-[10px]">Standard barbell</p>
          </div>
          <span className="font-display font-bold text-lg text-white">{barWeight} {unit}</span>
        </div>
      </div>

      {/* Result */}
      {result && (
        <>
          {target <= barWeight ? (
            <div className="card text-center py-6">
              <p className="text-gray-400 text-sm">Target weight is less than or equal to the bar weight</p>
              <p className="text-gray-500 text-xs mt-1">Just use the empty bar ({barWeight} {unit})</p>
            </div>
          ) : (
            <>
              {/* Visual plate representation */}
              <div className="card mb-4">
                <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-4">
                  Per Side: {result.perSide} {unit}
                </h3>

                {/* Barbell visual */}
                <div className="flex items-center justify-center gap-0.5 mb-4 py-4">
                  {/* Left plates (reversed) */}
                  <div className="flex items-center gap-0.5">
                    {[...result.plates].reverse().map((plate, i) => (
                      <div
                        key={`l-${i}`}
                        className={`${getPlateHeight(plate, unit)} w-3 rounded-sm flex items-center justify-center`}
                        style={{ backgroundColor: getPlateColor(plate, unit) }}
                      >
                        <span className="text-[6px] text-white font-bold rotate-90 whitespace-nowrap">{plate}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bar */}
                  <div className="h-3 bg-gray-500 rounded-full flex-1 max-w-[120px] flex items-center justify-center">
                    <span className="text-[7px] text-dark-900 font-bold">{barWeight}</span>
                  </div>

                  {/* Right plates */}
                  <div className="flex items-center gap-0.5">
                    {result.plates.map((plate, i) => (
                      <div
                        key={`r-${i}`}
                        className={`${getPlateHeight(plate, unit)} w-3 rounded-sm flex items-center justify-center`}
                        style={{ backgroundColor: getPlateColor(plate, unit) }}
                      >
                        <span className="text-[6px] text-white font-bold rotate-90 whitespace-nowrap">{plate}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {result.remainder > 0 && (
                  <p className="text-yellow-400 text-xs text-center">
                    Note: {result.remainder} {unit} cannot be loaded with standard plates
                  </p>
                )}
              </div>

              {/* Plate breakdown list */}
              <div className="card mb-4">
                <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">
                  Plate Breakdown
                </h3>
                <div className="space-y-2">
                  {(() => {
                    const counts = {};
                    for (const p of result.plates) {
                      counts[p] = (counts[p] || 0) + 1;
                    }
                    return Object.entries(counts).map(([plate, count]) => (
                      <div key={plate} className="flex items-center gap-3 py-2 px-3 bg-dark-700 rounded-xl">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: getPlateColor(parseFloat(plate), unit) + '30' }}
                        >
                          <div
                            className="w-4 h-4 rounded-sm"
                            style={{ backgroundColor: getPlateColor(parseFloat(plate), unit) }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-display font-bold text-sm">{plate} {unit}</p>
                          <p className="text-gray-500 text-[10px]">plate</p>
                        </div>
                        <div className="text-right">
                          <p className="text-primary font-display font-bold text-lg">{count}x</p>
                          <p className="text-gray-500 text-[10px]">per side</p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-gray-400 font-display font-bold text-sm">{count * 2}x</p>
                          <p className="text-gray-500 text-[10px]">total</p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Summary */}
              <div className="card mb-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="font-display font-extrabold text-xl text-primary">{target}</p>
                    <p className="text-gray-500 text-[10px] uppercase">Total {unit}</p>
                  </div>
                  <div>
                    <p className="font-display font-extrabold text-xl text-white">{barWeight}</p>
                    <p className="text-gray-500 text-[10px] uppercase">Bar {unit}</p>
                  </div>
                  <div>
                    <p className="font-display font-extrabold text-xl text-white">{result.plates.length}</p>
                    <p className="text-gray-500 text-[10px] uppercase">Plates/Side</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Plate reference */}
      <div className="card mb-4">
        <h3 className="font-display font-bold text-sm uppercase text-gray-400 mb-3">
          Standard Plates
        </h3>
        <div className="flex gap-2 flex-wrap justify-center">
          {(unit === 'lbs' ? PLATES_LBS : PLATES_KG).map(plate => (
            <div
              key={plate}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-dark-700"
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: getPlateColor(plate, unit) }}
              />
              <span className="text-white text-xs font-display font-bold">{plate}</span>
              <span className="text-gray-500 text-[8px]">{unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
