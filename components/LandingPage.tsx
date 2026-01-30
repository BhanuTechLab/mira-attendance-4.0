
import React, { useState } from 'react';
import { Icons } from '../constants';
import { User, AttendanceRecord, SBTETResult } from '../types';
import { getStudentByPin, getAttendanceForUser, getAllSbtetResultsForPin } from '../services';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FeatureCard: React.FC<{ title: string; desc: string; icon: React.FC<any>; color: string }> = ({ title, desc, icon: Icon, color }) => (
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm group hover:scale-[1.02] transition-all">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white mb-4 group-hover:animate-pulse`}>
            <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
);

const LandingPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [activeTool, setActiveTool] = useState<'attendance' | 'result' | 'none'>('none');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lookupResult, setLookupResult] = useState<{ type: 'attendance' | 'result', data: any, student: User } | null>(null);

    const handleQuickLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin) return;
        setIsLoading(true);
        setLookupResult(null);

        try {
            const student = await getStudentByPin(pin);
            if (!student) {
                alert("Student PIN not found.");
                return;
            }

            if (activeTool === 'attendance') {
                const history = await getAttendanceForUser(student.id);
                setLookupResult({ type: 'attendance', data: history, student });
            } else {
                const results = await getAllSbtetResultsForPin(student.pin);
                setLookupResult({ type: 'result', data: results, student });
            }
        } catch (err) {
            alert("Error fetching data. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    const downloadAttendancePDF = () => {
        if (!lookupResult || lookupResult.type !== 'attendance') return;
        const { student, data } = lookupResult;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Attendance Report - Mira 4.0', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Student Name: ${student.name}`, 20, 40);
        doc.text(`PIN: ${student.pin}`, 20, 48);
        
        const presentCount = data.filter((a: any) => a.status === 'Present').length;
        const percentage = Math.round((presentCount / (data.length || 1)) * 100);
        doc.text(`Overall Attendance: ${percentage}%`, 20, 56);

        autoTable(doc, {
            startY: 70,
            head: [['Date', 'Status', 'Timestamp', 'Location']],
            body: data.slice(0, 30).map((r: AttendanceRecord) => [
                r.date, 
                r.status, 
                r.timestamp || 'N/A', 
                r.location?.status || 'N/A'
            ]),
        });
        doc.save(`${student.pin}_Attendance_Report.pdf`);
    };

    const downloadResultsPDF = () => {
        if (!lookupResult || lookupResult.type !== 'result') return;
        const { student, data } = lookupResult;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Academic Result Sheet - Mira 4.0', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Student Name: ${student.name}`, 20, 40);
        doc.text(`PIN: ${student.pin}`, 20, 48);

        data.forEach((sem: SBTETResult, index: number) => {
            autoTable(doc, {
                startY: index === 0 ? 60 : (doc as any).lastAutoTable.finalY + 15,
                head: [[{ content: `Semester ${sem.semester} - SGPA: ${sem.sgpa}`, colSpan: 3, styles: { fillColor: [14, 165, 233] } }]],
                body: sem.subjects.map(s => [s.name, s.total, s.total >= 35 ? 'PASS' : 'FAIL']),
            });
        });
        doc.save(`${student.pin}_Result_Card.pdf`);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 blur-[120px] rounded-full animate-pulse-faint"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-500/10 blur-[120px] rounded-full animate-pulse-faint" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <Icons.logo className="h-8 w-8 text-primary-500" />
                            <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">MIRA 4.0</span>
                        </div>
                        <div className="hidden md:flex gap-8 text-sm font-semibold text-slate-600 dark:text-slate-400">
                            <a href="#features" className="hover:text-primary-500 transition-colors">Features</a>
                            <a href="#guide" className="hover:text-primary-500 transition-colors">How it Works</a>
                            <a href="#tools" className="hover:text-primary-500 transition-colors">Quick Tools</a>
                        </div>
                        <button 
                            onClick={onLogin}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-full font-bold text-sm shadow-lg shadow-primary-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            Log In
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-20 pb-32 px-4">
                <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
                    <div className="inline-block px-4 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-500 text-sm font-bold uppercase tracking-widest mb-4">
                        Intelligent Campus Ecosystem
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                        Seamless Management for <span className="text-primary-500">Academic Excellence.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
                        Empowering students and faculty with AI-driven attendance, deep analytics, and specialized study tools.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                        <button onClick={() => { setActiveTool('attendance'); document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' }) }} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-lg shadow-xl hover:opacity-90 transition-all hover:-translate-y-1">
                            Quick Check
                        </button>
                        <button onClick={onLogin} className="px-8 py-4 border-2 border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            Faculty Portal
                        </button>
                    </div>
                </div>
            </header>

            {/* Quick Tools Section */}
            <section id="tools" className="py-24 bg-white dark:bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4">Student Quick Lookup</h2>
                        <p className="text-slate-500 max-w-xl mx-auto">Access your essential records instantly without a full login. Securely indexed by your PIN.</p>
                    </div>

                    <div className="max-w-2xl mx-auto">
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-8">
                            <button 
                                onClick={() => { setActiveTool('attendance'); setLookupResult(null); }}
                                className={`py-3 rounded-xl font-bold transition-all ${activeTool === 'attendance' ? 'bg-white dark:bg-slate-700 shadow-md text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}
                            >
                                Attendance Check
                            </button>
                            <button 
                                onClick={() => { setActiveTool('result'); setLookupResult(null); }}
                                className={`py-3 rounded-xl font-bold transition-all ${activeTool === 'result' ? 'bg-white dark:bg-slate-700 shadow-md text-accent-600 dark:text-accent-400' : 'text-slate-500'}`}
                            >
                                Result Check
                            </button>
                        </div>

                        {activeTool !== 'none' && (
                            <form onSubmit={handleQuickLookup} className="animate-fade-in space-y-6">
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.toUpperCase())}
                                        placeholder="Enter your PIN (e.g., 23210-EC-001)"
                                        className="w-full p-5 pl-14 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-lg font-mono focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                    />
                                    <Icons.users className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                                </div>
                                <button 
                                    disabled={isLoading || !pin}
                                    type="submit"
                                    className="w-full py-5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-2xl font-black text-xl shadow-2xl shadow-primary-500/30 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? 'Searching Records...' : 'Verify & Find Data'}
                                </button>
                            </form>
                        )}

                        {lookupResult && (
                            <div className="mt-10 p-8 bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-500/30 rounded-3xl animate-scale-in">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <img src={lookupResult.student.imageUrl} className="w-16 h-16 rounded-full ring-4 ring-white dark:ring-slate-800 shadow-lg" alt="" />
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">{lookupResult.student.name}</h3>
                                            <p className="text-primary-600 dark:text-primary-400 font-bold font-mono">{lookupResult.student.pin}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={lookupResult.type === 'attendance' ? downloadAttendancePDF : downloadResultsPDF}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-primary-200 dark:border-primary-700 rounded-xl text-sm font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                                    >
                                        <Icons.download className="w-4 h-4" />
                                        Download PDF
                                    </button>
                                </div>
                                
                                {lookupResult.type === 'attendance' ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm text-center">
                                            <p className="text-xs text-slate-500 uppercase font-black mb-1">Percentage</p>
                                            <p className="text-4xl font-black text-green-500">
                                                {Math.round((lookupResult.data.filter((a: any) => a.status === 'Present').length / (lookupResult.data.length || 1)) * 100)}%
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm text-center">
                                            <p className="text-xs text-slate-500 uppercase font-black mb-1">Last Log</p>
                                            <p className={`text-xl font-black ${lookupResult.data[0]?.status === 'Present' ? 'text-blue-500' : 'text-red-500'}`}>
                                                {lookupResult.data[0]?.status || 'N/A'}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1">{lookupResult.data[0]?.date}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {lookupResult.data.length > 0 ? (
                                            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                                                {lookupResult.data.map((r: SBTETResult) => (
                                                    <div key={r.id} className="min-w-[140px] bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm text-center border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Sem {r.semester}</p>
                                                        <p className="text-2xl font-black text-accent-500">{r.sgpa.toFixed(2)}</p>
                                                        <p className={`text-[10px] font-black mt-1 py-0.5 rounded-full ${r.status === 'Pass' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{r.status}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <p className="text-center py-4 text-slate-500">No results found for this student.</p>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Detailed "How it Works" Section */}
            <section id="guide" className="py-24 bg-slate-100 dark:bg-slate-900/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">How Mira Empowers You</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto">A unified experience for students, faculty, and administrators to stay organized and efficient.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-10">
                            <div className="flex gap-6">
                                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-primary-500/20">1</div>
                                <div>
                                    <h4 className="font-bold text-xl mb-2">Smart Attendance System</h4>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Using advanced <strong>facial recognition</strong> and <strong>geo-fencing</strong>, attendance is marked instantly and securely. No proxies, no paperwork.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-primary-500/20">2</div>
                                <div>
                                    <h4 className="font-bold text-xl mb-2">Academic Dashboard</h4>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Students can track their <strong>SBTET results</strong>, view <strong>timetables</strong>, and monitor <strong>syllabus coverage</strong> in real-time.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-purple-500/20">3</div>
                                <div>
                                    <h4 className="font-bold text-xl mb-2">CogniCraft AI Integration</h4>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Our proprietary AI studio helps you <strong>summarize notes</strong>, <strong>generate practice quizzes</strong>, and explain complex concepts in simple terms.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary-500/20 blur-[80px] rounded-full"></div>
                            <div className="relative bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span className="ml-2 text-xs font-bold text-slate-400 uppercase tracking-widest">System Overview</span>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { title: 'Student Management', icon: Icons.users, desc: 'Centralized profiles with complete academic history.' },
                                        { title: 'AI Study Studio', icon: Icons.cogniCraft, desc: 'Convert text to PPT, generate lesson plans, and quiz yourself.' },
                                        { title: 'Admin Controls', icon: Icons.settings, desc: 'Granular role-based access control and system settings.' },
                                        { title: 'Live Reporting', icon: Icons.reports, desc: 'Exportable CSV/PDF reports for compliance and analysis.' },
                                    ].map((item, i) => (
                                        <div key={i} className="group p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-primary-500/50 transition-all cursor-default">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                                    <item.icon className="w-5 h-5 text-primary-500" />
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">{item.title}</h5>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Features Cards */}
            <section id="features" className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4">Cutting-Edge Features</h2>
                        <p className="text-slate-500 max-w-xl mx-auto">Built with the latest technologies to ensure reliability, security, and a top-tier user experience.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FeatureCard 
                            title="Face Verification" 
                            desc="High-precision AI facial recognition for attendance. Eliminates manual errors and fraud." 
                            icon={Icons.camera}
                            color="bg-blue-500"
                        />
                        <FeatureCard 
                            title="Geo-Enforcement" 
                            desc="Strict GPS-based geo-fencing ensures attendance is only marked within campus boundaries." 
                            icon={Icons.location}
                            color="bg-green-500"
                        />
                        <FeatureCard 
                            title="CogniCraft AI" 
                            desc="Proprietary academic assistant for summarizing notes, creating PPTs, and explaining concepts." 
                            icon={Icons.cogniCraft}
                            color="bg-purple-500"
                        />
                        <FeatureCard 
                            title="Deep Analytics" 
                            desc="Comprehensive data visualization for tracking progress, attendance trends, and performance." 
                            icon={Icons.reports}
                            color="bg-orange-500"
                        />
                    </div>
                </div>
            </section>

            {/* User Onboarding Steps */}
            <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-4xl font-black mb-16">Ready to Experience Mira?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto text-2xl font-black shadow-lg shadow-primary-500/30">1</div>
                            <h4 className="text-xl font-bold">Registration</h4>
                            <p className="text-slate-400">Administrators register students with a high-quality reference photo and PIN.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto text-2xl font-black shadow-lg shadow-primary-500/30">2</div>
                            <h4 className="text-xl font-bold">Daily Check-in</h4>
                            <p className="text-slate-400">Students mark attendance via facial verification while physically present on campus.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto text-2xl font-black shadow-lg shadow-primary-500/30">3</div>
                            <h4 className="text-xl font-bold">Academic Growth</h4>
                            <p className="text-slate-400">Access results, progress tracking, and AI study tools to excel in your curriculum.</p>
                        </div>
                    </div>
                    <div className="mt-20">
                        <button onClick={onLogin} className="px-12 py-5 bg-white text-slate-900 rounded-2xl font-black text-xl hover:bg-slate-100 transition-all hover:scale-105 shadow-2xl">
                            Go to Login
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <Icons.logo className="h-6 w-6 text-slate-400" />
                        <span className="text-lg font-black text-slate-500 uppercase tracking-tighter">Mira Attendance</span>
                    </div>
                    <p className="text-slate-500 text-sm">© 2024 Mira Attendance 4.0. Designed for next-generation polytechnics.</p>
                    <div className="flex gap-6">
                        <button onClick={onLogin} className="text-sm font-bold text-primary-500 hover:underline">Support</button>
                        <button onClick={onLogin} className="text-sm font-bold text-primary-500 hover:underline">Privacy Policy</button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
