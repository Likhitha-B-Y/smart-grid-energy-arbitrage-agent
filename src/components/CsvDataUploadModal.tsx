import React, { useState, useRef } from 'react';
import { X, UploadCloud, Download, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { parseAndValidateCsv, generateSampleCsvString, ParsedCsvRow } from '../utils/csvParser';

interface CsvDataUploadModalProps {
  onLoadCsvData: (rows: ParsedCsvRow[], filename: string) => void;
  onClose: () => void;
}

export const CsvDataUploadModal: React.FC<CsvDataUploadModalProps> = ({
  onLoadCsvData,
  onClose,
}) => {
  const [fileName, setFileName] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setValidationErrors([]);
    setValidationWarnings([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = parseAndValidateCsv(text);
      setValidationErrors(res.errors);
      setValidationWarnings(res.warnings);
      setParsedRows(res.rows);
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setValidationErrors(['Error reading file.']);
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const csvContent = generateSampleCsvString();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'smart_grid_sample_telemetry.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApply = () => {
    if (parsedRows.length > 0) {
      onLoadCsvData(parsedRows, fileName || 'Custom CSV');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Household Telemetry CSV</h2>
              <span className="text-xs text-slate-400">
                Upload historical smart meter, solar inverter, and dynamic pricing readings
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="py-4 space-y-4 text-xs">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 bg-slate-950/50 rounded-xl p-6 text-center cursor-pointer transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileText className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <p className="text-slate-200 font-medium text-sm">
              {fileName ? fileName : 'Click to select or drag & drop CSV file'}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Supports standard smart meter formats (timestamp, solar_kw, demand_kw, import_price, etc.)
            </p>
          </div>

          {/* Sample CSV Download Bar */}
          <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-300">
              Need an example format? Download a validated 24-hour sample dataset.
            </div>
            <button
              onClick={handleDownloadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample CSV</span>
            </button>
          </div>

          {/* Validation Status */}
          {validationErrors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>CSV Validation Errors ({validationErrors.length})</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {validationWarnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-300">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Validation Notices ({validationWarnings.length})</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs">
                {validationWarnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedRows.length > 0 && validationErrors.length === 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-300">
              <div className="flex items-center gap-2 font-bold mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>CSV Successfully Validated: {parsedRows.length} Hourly Time Periods Ready</span>
              </div>
              {/* Preview first 3 rows */}
              <div className="bg-slate-950/60 rounded-lg p-2 font-mono text-[11px] overflow-x-auto text-slate-300">
                <div className="text-slate-500 mb-1">Preview (First 3 Hours):</div>
                {parsedRows.slice(0, 3).map((r, i) => (
                  <div key={i}>
                    {r.timeLabel} • Solar: {r.solarKw}kW • Load: {r.demandKw}kW • Tariff: ${r.importPrice}/kWh
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={parsedRows.length === 0 || validationErrors.length > 0 || isProcessing}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-colors"
          >
            Load Data into Simulation
          </button>
        </div>
      </div>
    </div>
  );
};
