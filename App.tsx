
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppMode, AppState } from './types';
import ThreeScene from './components/ThreeScene';
import VisionService from './services/vision';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    mode: AppMode.TREE,
    handData: null,
    uiVisible: true,
    isLoaded: false
  });
  const [visionActive, setVisionActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const visionServiceRef = useRef<VisionService | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        setState(prev => ({ ...prev, uiVisible: !prev.uiVisible }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initVision = async () => {
    if (!videoRef.current || visionActive) return;
    try {
      setVisionActive(true);
      setCameraError(false);
      const vision = new VisionService(videoRef.current);
      await vision.initialize();
      visionServiceRef.current = vision;
      
      const detect = () => {
        const result = vision.detect();
        if (result) {
          setState(prev => {
            let nextMode = prev.mode;
            if (result.fist) nextMode = AppMode.TREE;
            else if (result.open) nextMode = AppMode.SCATTER;
            else if (result.pinch) nextMode = AppMode.FOCUS;
            return { ...prev, mode: nextMode, handData: result };
          });
        }
        requestAnimationFrame(detect);
      };
      detect();
    } catch (err) {
      console.error("Camera failed:", err);
      setVisionActive(false);
      setCameraError(true);
      alert("请确保在 HTTPS 环境下打开，并授予摄像头权限。");
    }
  };

  const handleLoaded = useCallback(() => {
    setTimeout(() => {
      setState(prev => ({ ...prev, isLoaded: true }));
    }, 1500);
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          window.dispatchEvent(new CustomEvent('add-photo', { detail: ev.target.result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMode = () => {
      setState(prev => {
          const modes = [AppMode.TREE, AppMode.SCATTER, AppMode.FOCUS];
          const nextIdx = (modes.indexOf(prev.mode) + 1) % modes.length;
          return { ...prev, mode: modes[nextIdx] };
      });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '圣诞魔法互动体验',
          text: '快来看看我的互动3D圣诞树，还能用手势控制！',
          url: window.location.href,
        });
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板，快分享给朋友吧！');
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none touch-none font-['Playfair_Display']">
      <ThreeScene 
        mode={state.mode} 
        handData={state.handData} 
        onLoaded={handleLoaded} 
      />

      {/* Share Button (Left) */}
      <button 
        onClick={handleShare}
        className={`fixed top-6 left-6 z-[60] w-12 h-12 flex items-center justify-center rounded-full glass-button pointer-events-auto transition-opacity duration-500 ${state.uiVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      </button>

      {/* UI Toggle (Right) */}
      <button 
        onClick={() => setState(p => ({...p, uiVisible: !p.uiVisible}))}
        className="fixed top-6 right-6 z-[60] w-12 h-12 flex items-center justify-center rounded-full glass-button pointer-events-auto"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {state.uiVisible ? <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/> : <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>}
        </svg>
      </button>

      {/* Loading Screen */}
      {!state.isLoaded && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-1000">
          <div id="loader-spinner" className="mb-8"></div>
          <p className="text-[#d4af37] font-['Cinzel'] tracking-[0.5em] text-[10px] uppercase opacity-70 animate-pulse">Initializing Holiday Magic</p>
        </div>
      )}

      {/* Interactive UI */}
      <div className={`fixed inset-0 z-10 pointer-events-none transition-all duration-1000 ${state.uiVisible ? 'opacity-100' : 'ui-hidden'}`}>
        <div className="absolute top-[18vh] left-0 w-full flex flex-col items-center px-8">
          <h1 className="text-[36px] md:text-[72px] gold-gradient-text font-bold leading-tight text-center mb-2 drop-shadow-2xl">Merry Christmas</h1>
          <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-50"></div>
        </div>

        <div className="absolute bottom-[8vh] left-0 w-full flex flex-col items-center gap-6 pointer-events-auto px-6">
          <div className="flex flex-col md:flex-row gap-4 w-full max-w-[280px] md:max-w-none items-center justify-center">
              <label className="glass-button w-full md:w-auto px-10 py-4 rounded-full text-[#fceea7] text-[11px] tracking-[0.3em] cursor-pointer inline-block uppercase font-bold text-center">
                ADD MEMORY
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>

              <button 
                onClick={initVision}
                className={`glass-button w-full md:w-auto px-10 py-4 rounded-full text-[#fceea7] text-[11px] tracking-[0.3em] uppercase font-bold text-center transition-all ${visionActive ? 'bg-[#d4af37]/20 border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.3)]' : ''}`}
              >
                {visionActive ? 'MAGIC ACTIVE' : 'ENABLE HAND MAGIC'}
              </button>
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-[#d4af37]/70 text-[9px] md:text-[12px] uppercase tracking-[0.25em] font-['Cinzel'] text-center leading-relaxed">
              {visionActive ? (
                <span className="flex gap-4">
                    <span>FIST: TREE</span>
                    <span>OPEN: SCATTER</span>
                    <span>PINCH: FOCUS</span>
                </span>
              ) : 'Control the tree with gestures'}
            </p>
            <button onClick={toggleMode} className="md:hidden text-[#d4af37]/40 text-[9px] tracking-[0.1em] underline underline-offset-4 decoration-1 decoration-[#d4af37]/20">TAP TO CYCLE MODES</button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 opacity-0 pointer-events-none w-[160px] h-[120px]">
        <video ref={videoRef} autoPlay playsInline webkit-playsinline="true" muted className="w-full h-full object-cover" />
      </div>
    </div>
  );
};

export default App;
