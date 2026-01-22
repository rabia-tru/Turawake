
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackIcon, PlayIcon, BoltIcon, LightbulbIcon } from './icons';

const BreakZonePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'reflex' | 'math'>('reflex');

    // --- Reflex Game State ---
    const [reflexState, setReflexState] = useState<'start' | 'waiting' | 'ready' | 'result'>('start');
    const [reflexMessage, setReflexMessage] = useState("Tap 'Start' to test your reaction time.");
    const [startTime, setStartTime] = useState(0);
    const [reactionTime, setReactionTime] = useState(0);
    const reflexTimerRef = useRef<number | null>(null);

    // --- Math Game State ---
    const [mathState, setMathState] = useState<'start' | 'playing' | 'result'>('start');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [problem, setProblem] = useState<{ q: string; options: number[]; answer: number } | null>(null);
    const mathTimerRef = useRef<number | null>(null);

    // --- Reflex Logic ---
    const handleStartReflex = () => {
        setReflexState('waiting');
        setReflexMessage("Wait for green...");
        const randomDelay = Math.floor(Math.random() * 2000) + 1000;
        reflexTimerRef.current = window.setTimeout(() => {
            setReflexState('ready');
            setReflexMessage("TAP NOW!");
            setStartTime(Date.now());
        }, randomDelay);
    };

    const handleTapReflex = () => {
        if (reflexState === 'waiting') {
            if (reflexTimerRef.current) clearTimeout(reflexTimerRef.current);
            setReflexState('result');
            setReflexMessage("Too early! Try again.");
            setReactionTime(0);
        } else if (reflexState === 'ready') {
            const time = Date.now() - startTime;
            setReactionTime(time);
            setReflexState('result');
            if (time < 250) setReflexMessage("Great! You are alert.");
            else if (time < 400) setReflexMessage("Average. Careful.");
            else setReflexMessage("Slow! You need rest.");
        }
    };

    // --- Math Logic ---
    const generateProblem = useCallback(() => {
        const ops = ['+', '-', '*'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a = Math.floor(Math.random() * 10) + 1;
        let b = Math.floor(Math.random() * 10) + 1;
        let ans = 0;

        if (op === '+') ans = a + b;
        else if (op === '-') { 
            if (a < b) [a, b] = [b, a]; // Ensure positive result
            ans = a - b; 
        }
        else if (op === '*') {
            a = Math.floor(Math.random() * 5) + 1; // Smaller numbers for multiply
            b = Math.floor(Math.random() * 5) + 1;
            ans = a * b;
        }

        // Generate wrong answers close to real one
        const options = new Set<number>();
        options.add(ans);
        while (options.size < 3) {
            const offset = Math.floor(Math.random() * 5) - 2; // -2 to +2
            if (offset !== 0) options.add(ans + offset);
        }

        setProblem({ 
            q: `${a} ${op} ${b}`, 
            answer: ans, 
            options: Array.from(options).sort(() => Math.random() - 0.5) 
        });
    }, []);

    const handleStartMath = () => {
        setScore(0);
        setTimeLeft(30);
        setMathState('playing');
        generateProblem();
    };

    const handleAnswerMath = (val: number) => {
        if (problem && val === problem.answer) {
            setScore(s => s + 1);
            generateProblem();
        } else {
            // Penalty for wrong answer? For now just shake or ignore.
            // Let's generate a new problem to keep flow.
            generateProblem();
        }
    };

    useEffect(() => {
        if (mathState === 'playing') {
            mathTimerRef.current = window.setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setMathState('result');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (mathTimerRef.current) clearInterval(mathTimerRef.current);
        };
    }, [mathState]);

    return (
        <div className="flex flex-col h-full p-4 bg-pro-gradient overflow-y-auto">
             <header className="flex items-center mb-6 relative">
                <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-slate-800 transition">
                    <BackIcon className="w-6 h-6"/>
                </button>
                <h1 className="text-2xl font-bold text-slate-100">Rest & Recharge</h1>
            </header>

            {/* Tabs */}
            <div className="flex p-1 mb-6 bg-slate-800/50 rounded-xl border border-slate-700">
                <button 
                    onClick={() => setActiveTab('reflex')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'reflex' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    Reflex Test
                </button>
                <button 
                    onClick={() => setActiveTab('math')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'math' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    Brain Teaser
                </button>
            </div>

            <div className="flex-grow flex flex-col items-center max-w-md mx-auto w-full">
                
                {/* REFLEX GAME UI */}
                {activeTab === 'reflex' && (
                    <div 
                        onClick={reflexState === 'waiting' || reflexState === 'ready' ? handleTapReflex : undefined}
                        className={`w-full aspect-square max-h-80 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 shadow-2xl border-4 cursor-pointer relative overflow-hidden ${
                            reflexState === 'waiting' ? 'bg-red-500/20 border-red-500' :
                            reflexState === 'ready' ? 'bg-green-500 border-green-400 scale-105' :
                            'bg-slate-800 border-slate-700'
                        }`}
                    >
                        {reflexState === 'start' && (
                            <div className="text-center p-6">
                                <BoltIcon className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Reflex Check</h2>
                                <p className="text-slate-300 mb-6">{reflexMessage}</p>
                                <button onClick={handleStartReflex} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition shadow-lg flex items-center mx-auto">
                                    <PlayIcon className="w-5 h-5 mr-2" /> Start Test
                                </button>
                            </div>
                        )}

                        {reflexState === 'waiting' && <h2 className="text-3xl font-bold text-red-400 animate-pulse">Wait for Green...</h2>}
                        {reflexState === 'ready' && <h2 className="text-4xl font-black text-white">TAP NOW!</h2>}
                        
                        {reflexState === 'result' && (
                            <div className="text-center p-6">
                                <h2 className="text-5xl font-bold text-white mb-2">{reactionTime > 0 ? `${reactionTime}ms` : '---'}</h2>
                                <p className={`text-xl font-medium mb-6 ${reactionTime > 0 && reactionTime < 300 ? 'text-green-400' : 'text-yellow-400'}`}>{reflexMessage}</p>
                                <button onClick={handleStartReflex} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-full transition shadow-lg">
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* MATH GAME UI */}
                {activeTab === 'math' && (
                    <div className="w-full aspect-square max-h-80 bg-slate-800 border-4 border-slate-700 rounded-3xl flex flex-col items-center justify-center p-6 shadow-2xl relative overflow-hidden">
                        
                        {mathState === 'start' && (
                            <div className="text-center">
                                <LightbulbIcon className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Math Sprint</h2>
                                <p className="text-slate-300 mb-6">Solve as many as you can in 30s to wake up your brain!</p>
                                <button onClick={handleStartMath} className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full transition shadow-lg flex items-center mx-auto">
                                    <PlayIcon className="w-5 h-5 mr-2" /> Start
                                </button>
                            </div>
                        )}

                        {mathState === 'playing' && problem && (
                            <div className="w-full h-full flex flex-col items-center justify-between py-4">
                                <div className="w-full flex justify-between px-4 text-slate-400 font-mono font-bold">
                                    <span>Time: {timeLeft}s</span>
                                    <span>Score: {score}</span>
                                </div>
                                <div className="text-6xl font-bold text-white tracking-widest my-4">
                                    {problem.q}
                                </div>
                                <div className="grid grid-cols-3 gap-4 w-full">
                                    {problem.options.map((opt, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleAnswerMath(opt)}
                                            className="bg-slate-700 hover:bg-slate-600 text-white text-2xl font-bold py-4 rounded-xl border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 transition-all"
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {mathState === 'result' && (
                            <div className="text-center">
                                <h2 className="text-5xl font-bold text-white mb-2">{score}</h2>
                                <p className="text-slate-400 uppercase text-xs font-bold mb-4">Problems Solved</p>
                                <p className="text-xl font-medium mb-6 text-purple-300">
                                    {score > 10 ? "Sharp mind! You are alert." : "Brain fog detected. Rest a bit."}
                                </p>
                                <button onClick={handleStartMath} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-full transition shadow-lg">
                                    Play Again
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="mt-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 w-full text-center">
                    <h3 className="text-lg font-bold text-slate-200 mb-2">
                        {activeTab === 'reflex' ? "Why Reflexes?" : "Why Math?"}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        {activeTab === 'reflex' 
                            ? "Reaction times slow down significantly when drowsy. If you score consistently above 400ms, your braking reaction is compromised."
                            : "Solving simple problems forces your brain to engage its executive functions, clearing 'micro-sleep' fog and increasing alertness."
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BreakZonePage;
