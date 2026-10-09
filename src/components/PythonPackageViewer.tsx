import React, { useState } from 'react';
import { X, Code2, Copy, Check, Download, Terminal, Folder, FileCode, CheckCircle2 } from 'lucide-react';
import { PYTHON_PROJECT_FILES, PythonFileAsset } from '../utils/pythonExporter';

interface PythonPackageViewerProps {
  onClose: () => void;
}

export const PythonPackageViewer: React.FC<PythonPackageViewerProps> = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState<PythonFileAsset>(PYTHON_PROJECT_FILES[3]); // energy_optimizer.py
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = (file: PythonFileAsset) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.path.split('/').pop() || 'script.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full h-[85vh] p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Local Python Micro-Agent Package
              </h2>
              <span className="text-xs text-slate-400">
                Complete modular Python backend, automated test suite, and Windows setup
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

        {/* Content Body: Left File Tree & Right Code Editor */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 py-4">
          {/* File Explorer Tree */}
          <div className="w-full md:w-64 bg-slate-950/70 border border-slate-800 rounded-xl p-3 overflow-y-auto shrink-0 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>smart-grid-agent /</span>
              </div>
              <div className="space-y-1 text-xs">
                {PYTHON_PROJECT_FILES.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                      selectedFile.path === file.path
                        ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate font-mono text-[11px]">{file.path}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Windows PowerShell Quick Command Snippet */}
            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400">
              <div className="font-semibold text-slate-300 flex items-center gap-1 mb-1">
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>Windows Quickstart</span>
              </div>
              <code className="block bg-slate-900 p-1.5 rounded text-emerald-300 font-mono">
                python -m venv venv<br />
                .\venv\Scripts\activate<br />
                pip install -r requirements.txt<br />
                python app.py
              </code>
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 bg-slate-950/90 border border-slate-800 rounded-xl flex flex-col min-h-0 overflow-hidden">
            {/* File info banner */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-300">{selectedFile.path}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 text-[11px]">{selectedFile.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
                <button
                  onClick={() => handleDownloadFile(selectedFile)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Code Box */}
            <div className="flex-1 p-4 overflow-auto font-mono text-xs leading-relaxed text-slate-200">
              <pre className="selection:bg-amber-500/30 selection:text-amber-200">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
