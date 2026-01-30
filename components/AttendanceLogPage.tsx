
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { User, AttendanceRecord } from '../types';
import { Branch, Role } from '../types';
import { 
    getStudentByPin, 
    getUserByPin,
    markAttendance, 
    getAttendanceForUser, 
    getTodaysAttendanceForUser, 
    sendEmail, 
    getDistanceInKm, 
    CAMPUS_LAT, 
    CAMPUS_LON, 
    CAMPUS_RADIUS_KM, 
    cogniCraftService 
} from '../services';
import { Icons } from '../constants';
import { Modal, PermissionsPrompt } from '../components';

// --- LOCAL ICONS ---
const ArrowUpRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
    </svg>
);
const ArrowDownRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
    </svg>
);
const MapPinIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);

const CalendarView: React.FC<{ calendarData: Map<string, 'Present' | 'Absent'> }> = ({ calendarData }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (calendarData.size > 0) {
            const latestDate = Array.from(calendarData.keys()).sort().pop();
            if (latestDate) {
                const [year, month, day] = (latestDate as string).split('-').map(Number);
                setCurrentMonth(new Date(year, month - 1, day));
            }
        }
    }, [calendarData]);

    const monthlyStats = useMemo(() => {
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        let p = 0, a = 0, wd = 0;
        for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const status = calendarData.get(dateStr);
            if (status === 'Present') { p++; wd++; } 
            else if (status === 'Absent') { a++; wd++; }
        }
        return { P: p, A: a, WD: wd };
    }, [currentMonth, calendarData]);

    const renderDays = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const month = currentMonth.getMonth();
        const year = currentMonth.getFullYear();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        dayHeaders.forEach((day, i) => days.push(<div key={`head-${i}`} className="h-10 w-10 flex items-center justify-center text-xs font-bold text-slate-400">{day}</div>))
        
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;
            
            const status = calendarData.get(dateStr);
            const isToday = dateStr === todayStr;
            const isFuture = date > today;

            let dayClasses = 'h-10 w-10 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors';
            
            if (isToday) {
                dayClasses += ' ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-primary-500';
            }

            if (isFuture) {
                dayClasses += ' text-slate-400 dark:text-slate-600';
            } else if (status === 'Present') {
                dayClasses += ' bg-green-200 dark:bg-green-800/50 text-green-800 dark:text-green-200';
            } else if (status === 'Absent') {
                dayClasses += ' bg-red-200 dark:bg-red-800/50 text-red-800 dark:text-red-200';
            } else {
                dayClasses += ' text-slate-500 dark:text-slate-400';
            }
            
            days.push(
                <div key={day} className={dayClasses}>
                    {day}
                </div>
            );
        }
        return days;
    };
    
    const changeMonth = (offset: number) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + offset);
            return newDate;
        });
    };

    return (
         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">&larr;</button>
                <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">&rarr;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {renderDays()}
            </div>
            <div className="mt-6 flex justify-around text-center border-t dark:border-slate-700 pt-4">
                <div><p className="font-bold text-xl text-green-600">{monthlyStats.P}</p><p className="text-xs text-slate-500">Present</p></div>
                <div><p className="font-bold text-xl text-red-600">{monthlyStats.A}</p><p className="text-xs text-slate-500">Absent</p></div>
                <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{monthlyStats.WD}</p><p className="text-xs text-slate-500">Working Days</p></div>
            </div>
             <div className="mt-4 flex justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-200 dark:bg-green-800/50"></div> Present</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-200 dark:bg-red-800/50"></div> Absent</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full ring-2 ring-primary-500"></div> Today</div>
            </div>
        </div>
    );
};

const adjustContrast = (ctx: CanvasRenderingContext2D, contrast: number): void => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] - 128) + 128;
        data[i + 1] = factor * (data[i + 1] - 128) + 128;
        data[i + 2] = factor * (data[i + 2] - 128) + 128;
    }
    ctx.putImageData(imageData, 0, 0);
};

const AttendanceLogPage: React.FC<{ user: User; refreshDashboardStats: () => Promise<void> }> = ({ user, refreshDashboardStats }) => {
    type LocationStatus = 'On-Campus' | 'Off-Campus' | 'Fetching' | 'Error' | 'Idle';
    interface LocationData {
      status: LocationStatus;
      distance: number | null;
      coordinates: { latitude: number; longitude: number } | null;
      accuracy: number | null;
      error: string;
    }
    type AttendanceMode = 'student' | 'staff';

    const [mode, setMode] = useState<AttendanceMode>('student');
    const [step, setStep] = useState<'capture' | 'verifying' | 'result' | 'permissions'>('capture');
    const [pinParts, setPinParts] = useState({ prefix: '23210', branch: 'EC', roll: '' });
    const [staffPin, setStaffPin] = useState('');
    const [userToVerify, setUserToVerify] = useState<User | null>(null);
    const [attendanceResult, setAttendanceResult] = useState<AttendanceRecord | null>(null);
    const [historicalData, setHistoricalData] = useState<AttendanceRecord[]>([]);
    const [cameraStatus, setCameraStatus] = useState<'idle' | 'aligning' | 'awaitingBlink' | 'blinkDetected' | 'verifying' | 'failed'>('idle');
    const [cameraError, setCameraError] = useState('');
    const [alreadyMarked, setAlreadyMarked] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [locationData, setLocationData] = useState<LocationData>({ status: 'Idle', distance: null, coordinates: null, accuracy: null, error: '' });
    const [showOffCampusModal, setShowOffCampusModal] = useState(false);
    const [referenceImageError, setReferenceImageError] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const locationWatchId = useRef<number | null>(null);
    const isNonStudent = user.role !== Role.STUDENT;

    useEffect(() => {
        return () => {
            if (locationWatchId.current !== null) {
                navigator.geolocation.clearWatch(locationWatchId.current);
            }
        };
    }, []);

    const handlePinChange = useCallback(async (newRoll: string) => {
        setAlreadyMarked(false);
        setCameraError('');
        setCapturedImage(null);
        setReferenceImageError('');
        const roll = newRoll.replace(/\D/g, '').slice(0, 3);
        setPinParts(p => ({...p, roll}));

        if (roll.length === 3) {
            const studentUser = await getStudentByPin(`${pinParts.prefix}-${pinParts.branch}-${roll}`);
            if (studentUser) {
                const todaysRecord = await getTodaysAttendanceForUser(studentUser.id);
                if (todaysRecord) {
                    setUserToVerify(null);
                    setAlreadyMarked(true);
                } else {
                    if (!studentUser.referenceImageUrl) {
                        setUserToVerify(studentUser);
                        setReferenceImageError('Reference photo is missing for this student.');
                    } else {
                        setUserToVerify(studentUser);
                    }
                }
            } else {
                setUserToVerify(null);
            }
        } else {
            setUserToVerify(null);
        }
    }, [pinParts.prefix, pinParts.branch]);

    const handleStaffPinChange = useCallback(async (pin: string) => {
        const upPin = pin.toUpperCase();
        setStaffPin(upPin);
        setAlreadyMarked(false);
        setCameraError('');
        setCapturedImage(null);
        setReferenceImageError('');
        
        if (upPin.length >= 3) {
            const foundUser = await getUserByPin(upPin);
            // Must be staff/faculty/admin, not a student
            if (foundUser && foundUser.role !== Role.STUDENT) {
                const todaysRecord = await getTodaysAttendanceForUser(foundUser.id);
                if (todaysRecord) {
                    setUserToVerify(null);
                    setAlreadyMarked(true);
                } else {
                    if (!foundUser.referenceImageUrl) {
                        setUserToVerify(foundUser);
                        setReferenceImageError('Reference photo missing. Please update in Manage Users.');
                    } else {
                        setUserToVerify(foundUser);
                    }
                }
            } else {
                setUserToVerify(null);
            }
        } else {
            setUserToVerify(null);
        }
    }, []);

    const handleMarkAttendance = useCallback(async () => {
        if(!userToVerify) return;

        const result = await markAttendance(userToVerify.id, locationData.coordinates);
        await refreshDashboardStats();
        const history = await getAttendanceForUser(userToVerify.id);
        setAttendanceResult(result);
        setHistoricalData(history);
        
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
        
        if (locationWatchId.current !== null) {
            navigator.geolocation.clearWatch(locationWatchId.current);
            locationWatchId.current = null;
        }

        setStep('result');

        const notificationBody = `Dear User,\n\nAttendance for ${userToVerify.name} (PIN: ${userToVerify.pin}) has been marked as PRESENT.\n\nTimestamp: ${result.timestamp}\nLocation Status: ${result.location?.status}\n\nRegards,\nMira Attendance System`;
        
        const sendNotification = async (email: string, subject: string, body: string) => {
            try {
                await sendEmail(email, subject, body);
            } catch (error) {
                console.error(`Failed to send notification email:`, error);
            }
        };
        
        if (userToVerify.email && userToVerify.email_verified) {
             sendNotification(userToVerify.email, `Attendance Confirmation`, notificationBody);
        }

        if(userToVerify.phoneNumber) {
            const whatsappMessage = `Attendance for ${userToVerify.name} (${userToVerify.pin}) marked PRESENT at ${result.timestamp}.`;
            const whatsappUrl = `https://wa.me/${userToVerify.phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;
            window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        }
    }, [userToVerify, refreshDashboardStats, locationData.coordinates]);

    const handleCapture = useCallback(async () => {
        if (videoRef.current && canvasRef.current && userToVerify?.referenceImageUrl) {
            setCameraStatus('verifying');
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                adjustContrast(context, 20);
            }
            const dataUrl = canvas.toDataURL('image/jpeg');
            setCapturedImage(dataUrl);
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
            try {
                const result = await cogniCraftService.verifyFace(userToVerify.referenceImageUrl, dataUrl);
                if (result.quality === 'POOR') {
                    setCameraStatus('failed');
                    setCameraError(`Verification failed: ${result.reason}`);
                } else if (result.isMatch) {
                    if (locationData.status === 'On-Campus') {
                        handleMarkAttendance();
                    } else if (locationData.status === 'Off-Campus') {
                        setShowOffCampusModal(true);
                    } else {
                        setCameraStatus('failed');
                        setCameraError(`Location is required.`);
                    }
                } else {
                    setCameraStatus('failed');
                    setCameraError("Identity match failed.");
                }
            } catch (e) {
                setCameraStatus('failed');
                setCameraError("Verification error.");
            }
        }
    }, [userToVerify, handleMarkAttendance, locationData.status]);

    // FIX: Define handleOffCampusCancellation to close the modal and update UI state on cancellation.
    const handleOffCampusCancellation = useCallback(() => {
        setShowOffCampusModal(false);
        setCameraStatus('failed');
        setCameraError('Attendance cancelled: User is off-campus.');
    }, []);

    const startCamera = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                setCapturedImage(null);
                setCameraError('');
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480 } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        setCameraStatus('aligning');
                        setTimeout(() => {
                            setCameraStatus('awaitingBlink');
                        }, 1500);
                    }
                }
            } catch (err) {
                setCameraError('Camera access denied.');
                setCameraStatus('failed');
            }
        }
    };
    
    const startAttendanceProcess = async () => {
        if (!userToVerify) return;
        handleStartVerification();
    };

    const handleStartVerification = () => {
        setCameraError('');
        setStep('verifying');
        setLocationData({ status: 'Fetching', distance: null, coordinates: null, accuracy: null, error: '' });
    
        if (navigator.geolocation) {
            locationWatchId.current = navigator.geolocation.watchPosition(
                (position) => {
                    const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
                    const distance = getDistanceInKm(coords.latitude, coords.longitude, CAMPUS_LAT, CAMPUS_LON);
                    const status: LocationStatus = distance <= CAMPUS_RADIUS_KM ? 'On-Campus' : 'Off-Campus';
                    setLocationData({ status, distance, coordinates: coords, accuracy: position.coords.accuracy, error: '' });
                    if (locationWatchId.current !== null) {
                        navigator.geolocation.clearWatch(locationWatchId.current);
                        locationWatchId.current = null;
                    }
                },
                (error) => {
                    setLocationData(prev => ({ ...prev, status: 'Error', error: 'Location denied.' }));
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
        startCamera();
    };

    useEffect(() => {
        if (cameraStatus === 'awaitingBlink') {
            const blinkTimer = setTimeout(() => setCameraStatus('blinkDetected'), 2000);
            return () => clearTimeout(blinkTimer);
        }
    }, [cameraStatus]);

    useEffect(() => {
        if (cameraStatus === 'blinkDetected') handleCapture();
    }, [cameraStatus, handleCapture]);

    const reset = () => {
        setStep('capture');
        setUserToVerify(null);
        setPinParts({ prefix: '23210', branch: 'EC', roll: '' });
        setStaffPin('');
        setAttendanceResult(null);
        setHistoricalData([]);
        setCameraStatus('idle');
        setCameraError('');
        setAlreadyMarked(false);
        setLocationData({ status: 'Idle', distance: null, coordinates: null, accuracy: null, error: '' });
        setCapturedImage(null);
        setReferenceImageError('');
    };

    const { overallPercentage, trend, presentDays, workingDays, calendarData } = useMemo(() => {
        const total = historicalData.length;
        if (total === 0) return { overallPercentage: 0, trend: 0, presentDays: 0, workingDays: 0, calendarData: new Map<string, 'Present' | 'Absent'>() };
        const present = historicalData.filter(r => r.status === 'Present').length;
        const percentage = Math.round((present / total) * 100);
        const last7Days = historicalData.slice(0, 7);
        const last7DaysPresent = last7Days.filter(r => r.status === 'Present').length;
        const prev7Days = historicalData.slice(7, 14);
        const prev7DaysPresent = prev7Days.filter(r => r.status === 'Present').length;
        const trendValue = last7DaysPresent - prev7DaysPresent;
        const calData = new Map<string, 'Present' | 'Absent'>(historicalData.map(r => [r.date, r.status]));
        return { overallPercentage: percentage, trend: trendValue, presentDays: present, workingDays: total, calendarData: calData };
    }, [historicalData]);
    
    if (step === 'permissions') {
        return <PermissionsPrompt onGranted={() => { setStep('capture'); handleStartVerification(); }} />;
    }

    if (step === 'result') {
        return (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg text-center">
                    <Icons.checkCircle className="h-16 w-16 text-green-500 mx-auto" />
                    <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Attendance Marked for {userToVerify?.name}!</h2>
                    <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-400 text-sm">
                        <p>Recorded at: <span className="font-semibold">{attendanceResult?.timestamp}</span></p>
                        <p>Geo-Fence: <span className={`font-semibold ${attendanceResult?.location?.status === 'On-Campus' ? 'text-green-600' : 'text-amber-500'}`}>{attendanceResult?.location?.status}</span></p>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                                <p className="text-sm font-medium text-slate-500">Overall Attendance</p>
                                <p className="text-4xl font-bold mt-1">{overallPercentage}%</p>
                                <div className={`flex items-center text-sm mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {trend >= 0 ? <ArrowUpRightIcon className="w-4 h-4" /> : <ArrowDownRightIcon className="w-4 h-4" />}
                                    <span>{Math.abs(trend)} days vs last week</span>
                                </div>
                            </div>
                             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                                <p className="text-sm font-medium text-slate-500">Current Session</p>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 my-2.5">
                                    <div className="bg-green-500 h-4 rounded-full" style={{ width: `${overallPercentage}%` }}></div>
                                </div>
                                <p className="text-right text-sm font-semibold">{presentDays} / {workingDays} days</p>
                            </div>
                        </div>
                        <CalendarView calendarData={calendarData} />
                    </div>
                    <div className="space-y-6">
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                            <h4 className="text-lg font-bold mb-4">Verification Profile</h4>
                            <div className="flex items-center space-x-4">
                                <img src={userToVerify?.imageUrl} alt={userToVerify?.name} className="h-16 w-16 rounded-full object-cover ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-800" />
                                <div><p className="text-xl font-bold">{userToVerify?.name}</p><p className="text-sm text-slate-500 font-mono">{userToVerify?.pin}</p></div>
                            </div>
                            <div className="border-t border-slate-200 dark:border-slate-700 mt-4 pt-4 space-y-2 text-sm">
                                <div className="flex justify-between items-center"><span className="text-slate-500">Branch/Dept</span><span className="font-semibold">{userToVerify?.branch}</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-500">Role</span><span className="font-semibold">{userToVerify?.role}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-center">
                    <button onClick={reset} className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 shadow-lg">Mark Another</button>
                </div>
            </div>
        );
    }

    const studentMarkingUI = (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl animate-fade-in-down">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Student Marking</h2>
            <div className="mt-6">
                <div className="group flex items-center w-full bg-slate-200/20 dark:bg-slate-900/30 border border-slate-400 dark:border-slate-600 rounded-lg p-3 text-xl font-mono tracking-wider focus-within:border-primary-500 transition-all">
                    <select value={pinParts.prefix} onChange={e => {setUserToVerify(null); setAlreadyMarked(false); setPinParts(p => ({ ...p, prefix: e.target.value, roll: '' }));}} className="bg-transparent outline-none cursor-pointer text-slate-800 dark:text-white font-semibold">
                        {['25210', '24210', '23210'].map(prefix => (<option key={prefix} value={prefix} className="bg-slate-200 dark:bg-slate-800">{prefix}</option>))}
                    </select>
                    <span className="mx-3 text-slate-400">/</span>
                    <select value={pinParts.branch} onChange={e => {setUserToVerify(null); setAlreadyMarked(false); setPinParts(p => ({...p, branch: e.target.value, roll: ''}));}} className="bg-transparent outline-none cursor-pointer text-slate-800 dark:text-white font-semibold">
                        {Object.values(Branch).map(b => <option key={b} value={b} className="bg-slate-200 dark:bg-slate-800">{b}</option>)}
                    </select>
                    <span className="mx-3 text-slate-400">/</span>
                    <input value={pinParts.roll} onChange={e => handlePinChange(e.target.value)} placeholder="001" maxLength={3} className="w-24 bg-transparent outline-none text-slate-800 dark:text-white" />
                </div>
            </div>
            <div className="mt-8 min-h-[3rem]">
                {userToVerify && !referenceImageError && (<p className="text-center text-2xl font-bold text-primary-600 dark:text-primary-400 animate-fade-in">{userToVerify.name}</p>)}
                {referenceImageError && (<p className="text-center text-lg font-semibold text-red-500">{referenceImageError}</p>)}
                {alreadyMarked && (<p className="text-center text-lg font-semibold text-amber-500">Attendance already marked today.</p>)}
            </div>
            <button onClick={startAttendanceProcess} disabled={!userToVerify || !!referenceImageError || step !== 'capture'} className="w-full mt-8 py-3 bg-primary-600 text-white text-lg font-bold rounded-lg disabled:opacity-50 shadow-xl shadow-primary-500/20 active:scale-95 transition-all">
                Mark Student Presence
            </button>
        </div>
    );

    const staffMarkingUI = (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl animate-fade-in-down">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Staff / Faculty Identification</h2>
            <p className="text-sm text-slate-500 mt-1">Enter employee PIN (e.g., FAC-01, HOD-02, STF-04)</p>
            <div className="mt-6">
                <input 
                    type="text"
                    value={staffPin}
                    onChange={(e) => handleStaffPinChange(e.target.value)}
                    placeholder="ENTER EMPLOYEE PIN"
                    className="w-full bg-slate-200/20 dark:bg-slate-900/30 border border-slate-400 dark:border-slate-600 rounded-lg p-4 text-2xl font-mono tracking-widest text-center focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all uppercase"
                />
            </div>
            <div className="mt-8 min-h-[3rem]">
                {userToVerify && !referenceImageError && (
                    <div className="flex items-center justify-center gap-4 animate-fade-in bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <img src={userToVerify.imageUrl} className="w-12 h-12 rounded-full object-cover" alt="" />
                        <div className="text-left">
                            <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{userToVerify.name}</p>
                            <p className="text-xs font-bold text-primary-500 uppercase tracking-widest">{userToVerify.role} • {userToVerify.branch}</p>
                        </div>
                    </div>
                )}
                {referenceImageError && (<p className="text-center text-lg font-semibold text-red-500">{referenceImageError}</p>)}
                {alreadyMarked && (<p className="text-center text-lg font-semibold text-amber-500">Already marked present today.</p>)}
            </div>
            <button onClick={startAttendanceProcess} disabled={!userToVerify || !!referenceImageError || step !== 'capture'} className="w-full mt-8 py-3 bg-slate-900 dark:bg-white text-slate-100 dark:text-slate-900 text-lg font-bold rounded-lg disabled:opacity-50 shadow-2xl active:scale-95 transition-all">
                Mark Employee Presence
            </button>
        </div>
    );

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-[calc(100vh-5rem)]">
                <canvas ref={canvasRef} className="hidden" />
                <div>
                  {isNonStudent && (
                    <div className="mb-6 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl flex gap-1 shadow-inner">
                      <button onClick={() => { reset(); setMode('student'); }} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${mode === 'student' ? 'bg-white dark:bg-slate-700 shadow-md text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>Mark Student</button>
                      <button onClick={() => { reset(); setMode('staff'); }} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${mode === 'staff' ? 'bg-white dark:bg-slate-700 shadow-md text-accent-600 dark:text-accent-400' : 'text-slate-500'}`}>Mark Faculty/Staff</button>
                    </div>
                  )}
                  {mode === 'student' ? studentMarkingUI : staffMarkingUI}
                </div>
                <div className="flex flex-col items-center justify-center text-center">
                    {step === 'verifying' ? (
                        cameraStatus !== 'failed' ? (
                            capturedImage ? (
                                <div className="flex items-center gap-4 animate-fade-in">
                                    <img src={capturedImage} alt="Captured" className="w-40 h-40 rounded-full object-cover shadow-lg border-2 border-primary-500" />
                                    <Icons.send className="w-8 h-8 text-slate-400" />
                                    <img src={userToVerify?.referenceImageUrl || userToVerify?.imageUrl} alt="Reference" className="w-40 h-40 rounded-full object-cover shadow-lg border-2 border-slate-500" />
                                </div>
                            ) : (
                                <div className="relative w-80 h-80 rounded-full overflow-hidden shadow-2xl border-4 border-slate-300 dark:border-slate-700">
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover -scale-x-100" />
                                    <div className={`absolute inset-0 rounded-full border-8 transition-all ${cameraStatus === 'verifying' ? 'border-primary-500 animate-pulse' : 'border-transparent'}`}></div>
                                </div>
                            )
                        ) : (
                            <div className="w-80 h-80 rounded-full bg-red-500/10 flex items-center justify-center border-4 border-red-500/20">
                                <Icons.xCircle className="w-24 h-24 text-red-500/50" />
                            </div>
                        )
                    ) : (
                        <div className="w-80 h-80 rounded-full bg-slate-200 dark:bg-slate-700/50 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl"><Icons.logo className="w-24 h-24 text-slate-400" /></div>
                    )}
                    <div className="mt-6 min-h-[4.5rem]">
                        {step === 'verifying' && cameraStatus !== 'failed' && (
                            <div className="animate-fade-in">
                                <p className="text-xl font-black uppercase tracking-widest text-slate-800 dark:text-white">
                                    {cameraStatus === 'aligning' ? "Aligning System..." :
                                     cameraStatus === 'awaitingBlink' ? "Blink to Verify" :
                                     cameraStatus === 'blinkDetected' ? "Blink Captured!" : "Verifying Identity..."}
                                </p>
                                <div className="mt-2 text-sm p-2 border rounded-lg bg-slate-100 dark:bg-slate-900/50 max-w-xs mx-auto">
                                    {locationData.status === 'Fetching' ? <p className="animate-pulse">Acquiring GPS Signal...</p>
                                    : locationData.status === 'Error' ? <span className="text-red-500">Error: {locationData.error}</span>
                                    : <div className={`font-bold flex items-center justify-center gap-1 ${locationData.status === 'On-Campus' ? 'text-green-500' : 'text-amber-500'}`}>
                                        <MapPinIcon className="w-4 h-4" /> {locationData.status}
                                      </div>}
                                </div>
                            </div>
                        )}
                        {step === 'verifying' && cameraStatus === 'failed' && (
                             <div className="text-center animate-scale-in">
                                <p className="text-xl font-bold text-red-500">Verification Interrupted</p>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{cameraError}</p>
                                <button onClick={handleStartVerification} className="mt-4 px-6 py-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold rounded-lg shadow-lg">Try Again</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Modal isOpen={showOffCampusModal} onClose={handleOffCampusCancellation} title="Location Restriction">
                <div className="text-center p-2">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MapPinIcon className="w-10 h-10 text-amber-500" />
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">You are currently detected as <span className="font-bold text-amber-500">Off-Campus</span>.</p>
                    <p className="text-sm text-slate-500 mt-2">Attendance policy requires presence within college boundaries (500m radius).</p>
                    <div className="mt-8 flex flex-col gap-3">
                        <button onClick={() => { setShowOffCampusModal(false); handleMarkAttendance(); }} className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all">Proceed with Warning</button>
                        <button onClick={handleOffCampusCancellation} className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-xl">Cancel Attempt</button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default AttendanceLogPage;
