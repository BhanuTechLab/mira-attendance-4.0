
import React, { useState, useEffect, useMemo } from 'react';
import { getUsers, addUser, updateUser, deleteUser, getAllSbtetResultsForPin, saveSbtetResult } from '../services';
import type { User, SBTETResult } from '../types';
import { Role } from '../types';
import { PlusIcon, EditIcon, DeleteIcon, IdCardIcon } from './Icons';
import { RolePill, Modal } from '../components';
import { Icons } from '../constants';

const createAvatar = (seed: string) => `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(seed)}`;

const generateIdCard = async (user: User) => {
    const canvas = document.createElement('canvas');
    const width = 540;
    const height = 856;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        alert("Failed to create ID card. Canvas context is not supported.");
        return;
    }

    const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => {
             console.error(`Failed to load image: ${src}`, err);
             const fallback = new Image();
             fallback.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
             resolve(fallback);
        };
        img.src = src;
    });

    const logoUrl = 'https://gptc-sangareddy.ac.in/images/logo.png';
    const signatureUrl = 'https://i.imgur.com/gza12Hk.png';

    try {
        const [studentImage, logoImage, signatureImage] = await Promise.all([
            loadImage(user.imageUrl!),
            loadImage(logoUrl),
            loadImage(signatureUrl)
        ]);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#F8E8EE';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(width, 0); ctx.lineTo(width, height); ctx.lineTo(0, height);
        ctx.bezierCurveTo(180, 650, 180, 250, 150, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#D50000';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, height);
        ctx.bezierCurveTo(140, 650, 140, 250, 110, 0);
        ctx.closePath();
        ctx.fill();
        
        const logoW = 90;
        const logoH = 90;
        ctx.drawImage(logoImage, (width - logoW) / 2, 20, logoW, logoH);
        
        ctx.fillStyle = '#000033';
        ctx.textAlign = 'center';

        ctx.font = 'bold 26px "Inter", sans-serif';
        ctx.fillText('GOVERNMENT POLYTECHNIC', width / 2, 130);
        
        ctx.font = 'bold 30px "Inter", sans-serif';
        ctx.fillText('SANGAREDDY', width / 2, 160);
        
        const photoW = 180;
        const photoH = 225;
        const photoX = (width - photoW) / 2;
        const photoY = 180;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#A0AEC0';
        ctx.lineWidth = 1;
        ctx.strokeRect(photoX - 1, photoY - 1, photoW + 2, photoH + 2);
        ctx.drawImage(studentImage, photoX, photoY, photoW, photoH);

        ctx.fillStyle = '#000033';
        ctx.font = 'bold 32px "Inter", sans-serif';
        ctx.fillText(user.name.toUpperCase(), width / 2, photoY + photoH + 35);

        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.drawImage(logoImage, (width - 200) / 2, 500, 200, 200);
        ctx.restore();

        ctx.textAlign = 'left';
        let currentY = photoY + photoH + 80;

        const drawDetail = (label: string, value: string, y: number) => {
            const labelX = 40;
            const colonX = 190;
            const valueX = 210;
            
            ctx.font = 'bold 20px "Inter", sans-serif';
            ctx.fillStyle = '#333333';
            ctx.fillText(label, labelX, y);
            ctx.fillText(':', colonX, y);

            ctx.font = '20px "Inter", sans-serif';
            ctx.fillStyle = '#1A202C';
            ctx.fillText(value, valueX, y);
        };
        
        drawDetail("Branch", user.branch, currentY); currentY += 45;
        drawDetail("Pin No", user.pin, currentY); currentY += 45;
        drawDetail("Mobile No", user.phoneNumber?.slice(-10) || 'N/A', currentY); currentY += 50;

        ctx.font = 'bold 20px "Inter", sans-serif';
        ctx.fillStyle = '#333333';
        const addressLabel = "Address";
        const addressLabelWidth = ctx.measureText(addressLabel).width;
        ctx.fillText(addressLabel, 40, currentY);
        ctx.beginPath();
        ctx.moveTo(40, currentY + 4);
        ctx.lineTo(40 + addressLabelWidth, currentY + 4);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        currentY += 30;
        
        ctx.font = '20px "Inter", sans-serif';
        ctx.fillStyle = '#1A202C';
        ctx.fillText("Jawharnagar Colony,", 40, currentY);

        const signatureY = height - 160;
        ctx.drawImage(signatureImage, 350, signatureY, 150, 60);
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px "Inter"';
        ctx.fillStyle = '#1A202C';
        ctx.fillText('Principal', 425, signatureY + 90);
        ctx.font = '14px "Inter"';
        ctx.fillText('Govt. Polytechnic, Sangareddy', 425, signatureY + 110);

    } catch (e) {
        console.error("Could not generate ID card due to an error:", e);
        alert("Failed to generate ID card. One or more required images could not be loaded. Please check the console for details.");
        return;
    }

    const link = document.createElement('a');
    link.download = `ID_Card_${user.pin}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const UserFormModal: React.FC<{
    user?: User | null;
    onClose: () => void;
    onSave: (user: User) => void;
}> = ({ user, onClose, onSave }) => {
    const isEditMode = !!user;
    const [formData, setFormData] = useState<Partial<User>>({
        name: user?.name || '',
        pin: user?.pin || '',
        branch: user?.branch || 'EC',
        role: user?.role || Role.STUDENT,
        email: user?.email || '',
        parent_email: user?.parent_email || '',
        imageUrl: user?.imageUrl || '',
        referenceImageUrl: user?.referenceImageUrl || '',
        fatherName: user?.fatherName || '',
        aadharNumber: user?.aadharNumber || '',
        phoneNumber: user?.phoneNumber || '',
        parentPhoneNumber: user?.parentPhoneNumber || '',
        tenthMarks: user?.tenthMarks || '',
        documents: user?.documents || [],
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(prev => ({ ...prev, imageUrl: event.target?.result as string }));
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    
    const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(prev => ({ ...prev, referenceImageUrl: event.target?.result as string }));
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            filesArray.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const newDoc = {
                        name: file.name,
                        type: file.type,
                        url: event.target?.result as string
                    };
                    setFormData(prev => ({
                        ...prev,
                        documents: [...(prev.documents || []), newDoc]
                    }));
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeDocument = (index: number) => {
        setFormData(prev => ({
            ...prev,
            documents: (prev.documents || []).filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userToSave: User = {
            id: user?.id || `new_${Date.now()}`,
            year: parseInt(formData.pin?.split('-')[0] || '0'),
            college_code: formData.pin?.split('-')[1] || '',
            email_verified: user?.email_verified || false,
            parent_email_verified: user?.parent_email_verified || false,
            ...formData,
        } as User;
        onSave(userToSave);
    };

    const inputClasses = "mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";
    const sectionLabel = "text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-6 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-2";
    const previewSrc = formData.imageUrl || (formData.name ? createAvatar(formData.name) : '');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-40 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-down" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{isEditMode ? 'Edit User' : 'Register New User'}</h2>
                <p className="text-sm text-slate-500 mb-6">Complete all sections to ensure accurate system records.</p>
                
                <form onSubmit={handleSubmit}>
                    {/* General Role Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">System Role</label>
                            <select name="role" value={formData.role} onChange={handleInputChange} className={inputClasses}>
                                {Object.values(Role).map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">PIN / Employee ID</label>
                            <input type="text" name="pin" required value={formData.pin} onChange={handleInputChange} placeholder="e.g., 23210-EC-001" className={inputClasses} />
                        </div>
                    </div>

                    <div className={sectionLabel}><Icons.users className="w-4 h-4"/> Personal Details</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Full Name</label>
                            <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className={inputClasses} />
                        </div>
                        {formData.role === Role.STUDENT && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium">Father's Name</label>
                                    <input type="text" name="fatherName" required value={formData.fatherName} onChange={handleInputChange} className={inputClasses} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Aadhar Number</label>
                                    <input type="text" name="aadharNumber" required maxLength={12} value={formData.aadharNumber} onChange={handleInputChange} placeholder="12-digit number" className={inputClasses} />
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-sm font-medium">Branch/Department</label>
                            <select name="branch" value={formData.branch} onChange={handleInputChange} className={inputClasses}>
                                <option>CS</option><option>EC</option><option>EEE</option><option>Office</option><option>Library</option><option>ADMIN</option>
                            </select>
                        </div>
                    </div>

                    <div className={sectionLabel}><Icons.whatsapp className="w-4 h-4"/> Contact Information</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium">Student/Staff Phone Number</label>
                            <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className={inputClasses} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Email Address</label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={inputClasses} />
                        </div>
                        {formData.role === Role.STUDENT && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium">Parent Phone Number</label>
                                    <input type="text" name="parentPhoneNumber" value={formData.parentPhoneNumber} onChange={handleInputChange} className={inputClasses} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Parent Email</label>
                                    <input type="email" name="parent_email" value={formData.parent_email} onChange={handleInputChange} className={inputClasses} />
                                </div>
                            </>
                        )}
                    </div>

                    {formData.role === Role.STUDENT && (
                        <>
                            <div className={sectionLabel}><Icons.syllabus className="w-4 h-4"/> Academic History</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">10th Marks / CGPA</label>
                                    <input type="text" name="tenthMarks" value={formData.tenthMarks} onChange={handleInputChange} placeholder="e.g., 9.8 or 550/600" className={inputClasses} />
                                </div>
                            </div>
                        </>
                    )}

                    <div className={sectionLabel}><Icons.camera className="w-4 h-4"/> Media & Documents</div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Profile Image</label>
                                <div className="mt-1 flex items-center gap-4">
                                    <img src={previewSrc} alt="Avatar" className="w-12 h-12 rounded-full object-cover bg-slate-100" />
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="text-xs file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-primary-50 file:text-primary-700" />
                                </div>
                            </div>
                            {formData.role === Role.STUDENT && (
                                <div>
                                    <label className="block text-sm font-medium">AI Reference Photo</label>
                                    <div className="mt-1 flex items-center gap-4">
                                        {formData.referenceImageUrl && <img src={formData.referenceImageUrl} alt="Ref" className="w-12 h-12 rounded-full object-cover bg-slate-100" />}
                                        <input type="file" accept="image/*" onChange={handleReferenceImageChange} className="text-xs file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-accent-50 file:text-accent-700" />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium">Supporting Documents (PDF, Doc, Images)</label>
                            <div className="mt-1">
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 hover:bg-slate-100 dark:border-slate-600 dark:hover:border-slate-500">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Icons.upload className="w-8 h-8 mb-4 text-slate-500" />
                                            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400 font-semibold">Click to upload documents</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">PDF, JPG, PNG or DOCX</p>
                                        </div>
                                        <input type="file" className="hidden" multiple onChange={handleDocumentUpload} />
                                    </label>
                                </div>
                            </div>
                            
                            {formData.documents && formData.documents.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {formData.documents.map((doc, idx) => (
                                        <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs">
                                            <span className="truncate max-w-[150px]" title={doc.name}>{doc.name}</span>
                                            <button type="button" onClick={() => removeDocument(idx)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="font-semibold py-2 px-6 rounded-lg transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600">Cancel</button>
                        <button type="submit" className="font-semibold py-2 px-6 rounded-lg transition-colors bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-primary-600/50">Save Student Records</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ResultsEditorModal: React.FC<{
    student: User;
    onClose: () => void;
}> = ({ student, onClose }) => {
    const [semester, setSemester] = useState(1);
    const [result, setResult] = useState<SBTETResult | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchResult = async () => {
        setLoading(true);
        const allResults = await getAllSbtetResultsForPin(student.pin);
        const existingResult = allResults.find(r => r.semester === semester);
        if (existingResult) {
            setResult(existingResult);
        } else {
            // Create default skeleton
            setResult({
                id: `res-${student.pin}-${semester}`,
                pin: student.pin,
                semester,
                subjects: [
                    { code: 'SUB-01', name: '', mid1: 0, mid2: 0, internal: 0, external: 0, total: 0, credits: 0 }
                ],
                totalMarks: 0,
                creditsEarned: 0,
                sgpa: 0,
                status: 'Fail'
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchResult();
    }, [semester, student.pin]);

    const handleSubjectChange = (index: number, field: string, value: any) => {
        if (!result) return;
        const newSubjects = [...result.subjects];
        
        // Ensure values don't exceed max marks
        let sanitizedValue = Number(value);
        if (field === 'mid1' || field === 'mid2' || field === 'internal') {
            if (sanitizedValue > 20) sanitizedValue = 20;
        } else if (field === 'external') {
            if (sanitizedValue > 40) sanitizedValue = 40;
        }

        newSubjects[index] = { ...newSubjects[index], [field]: field === 'name' ? value : sanitizedValue };
        
        // Updated calculation: total = mid1 + mid2 + internal + external (Semester end)
        if (['mid1', 'mid2', 'internal', 'external'].includes(field)) {
            newSubjects[index].total = Number(newSubjects[index].mid1) + 
                                       Number(newSubjects[index].mid2) + 
                                       Number(newSubjects[index].internal) + 
                                       Number(newSubjects[index].external);
        }

        setResult({ ...result, subjects: newSubjects });
    };

    const addSubject = () => {
        if (!result) return;
        setResult({
            ...result,
            subjects: [...result.subjects, { code: `SUB-0${result.subjects.length+1}`, name: '', mid1: 0, mid2: 0, internal: 0, external: 0, total: 0, credits: 0 }]
        });
    };

    const removeSubject = (index: number) => {
        if (!result) return;
        setResult({
            ...result,
            subjects: result.subjects.filter((_, i) => i !== index)
        });
    };

    const handleSave = async () => {
        if (!result) return;
        setIsSaving(true);
        
        // Final calculations before saving
        const totalMarks = result.subjects.reduce((sum, s) => sum + s.total, 0);
        const creditsEarned = result.subjects.reduce((sum, s) => sum + (s.total >= 35 ? 4 : 0), 0);
        const isPass = result.subjects.every(s => s.total >= 35);

        const finalResult: SBTETResult = {
            ...result,
            totalMarks,
            creditsEarned,
            status: isPass ? 'Pass' : 'Fail'
        };

        await saveSbtetResult(finalResult);
        setIsSaving(false);
        alert(`SBTET results for Semester ${semester} saved successfully!`);
    };

    const inputClasses = "w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all";

    return (
        <Modal isOpen={true} onClose={onClose} title={`Edit SBTET Results: ${student.name}`} maxWidthClass="max-w-4xl">
            <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-4 scrollbar-thin">
                <div className="flex items-center justify-between border-b dark:border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Target Semester:</label>
                        <select 
                            value={semester} 
                            onChange={(e) => setSemester(Number(e.target.value))}
                            className="p-2.5 px-4 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold focus:ring-2 focus:ring-primary-500 transition-shadow"
                        >
                            {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Total Subjects</p>
                        <p className="text-2xl font-black text-primary-500">{result?.subjects.length || 0}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-semibold text-slate-500 animate-pulse">Synchronizing academic data...</p>
                    </div>
                ) : result && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 text-[11px] font-black text-slate-400 uppercase px-4 text-center">
                            <div className="col-span-4 text-left">Academic Subject</div>
                            <div className="col-span-1.5">Mid 1 (20)</div>
                            <div className="col-span-1.5">Mid 2 (20)</div>
                            <div className="col-span-1.5">Internal (20)</div>
                            <div className="col-span-1.5">Semester (40)</div>
                            <div className="col-span-2">Total Score</div>
                        </div>

                        <div className="space-y-3">
                            {result.subjects.map((sub, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-slate-100/50 dark:bg-slate-800/30 p-4 rounded-2xl relative group border border-transparent hover:border-primary-500/30 transition-all duration-300">
                                    <div className="col-span-4">
                                        <input 
                                            placeholder="Enter subject name..." 
                                            value={sub.name} 
                                            onChange={e => handleSubjectChange(idx, 'name', e.target.value)}
                                            className={inputClasses} 
                                        />
                                    </div>
                                    <div className="col-span-1.5">
                                        <input 
                                            type="number" 
                                            max={20}
                                            value={sub.mid1} 
                                            onChange={e => handleSubjectChange(idx, 'mid1', e.target.value)}
                                            className={`${inputClasses} text-center`} 
                                        />
                                    </div>
                                    <div className="col-span-1.5">
                                        <input 
                                            type="number" 
                                            max={20}
                                            value={sub.mid2} 
                                            onChange={e => handleSubjectChange(idx, 'mid2', e.target.value)}
                                            className={`${inputClasses} text-center`} 
                                        />
                                    </div>
                                    <div className="col-span-1.5">
                                        <input 
                                            type="number" 
                                            max={20}
                                            value={sub.internal} 
                                            onChange={e => handleSubjectChange(idx, 'internal', e.target.value)}
                                            className={`${inputClasses} text-center`} 
                                        />
                                    </div>
                                    <div className="col-span-1.5">
                                        <input 
                                            type="number" 
                                            max={40}
                                            value={sub.external} 
                                            onChange={e => handleSubjectChange(idx, 'external', e.target.value)}
                                            className={`${inputClasses} text-center`} 
                                        />
                                    </div>
                                    <div className="col-span-2 flex flex-col items-center">
                                        <span className="text-2xl font-black text-primary-600 dark:text-primary-400">
                                            {sub.total}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.total >= 35 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {sub.total >= 35 ? 'PASS' : 'FAIL'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => removeSubject(idx)} 
                                        className="absolute -right-2 -top-2 bg-red-500 text-white rounded-full w-6 h-6 text-sm opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110 shadow-lg flex items-center justify-center font-bold z-10"
                                    >
                                        <Icons.close className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={addSubject}
                            className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-500 hover:text-primary-500 hover:border-primary-500 transition-all hover:bg-primary-500/5 flex items-center justify-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" /> Add Additional Subject
                        </button>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-white dark:bg-slate-900 pb-2 border-t dark:border-slate-800">
                    <button onClick={onClose} className="px-6 py-3 text-sm font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">Discard Changes</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || loading}
                        className="px-10 py-3 text-sm font-bold rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 shadow-xl shadow-primary-600/20 active:scale-95 transition-all"
                    >
                        {isSaving ? 'Finalizing...' : 'Commit Results to Database'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const AuthModal: React.FC<{
    action: string;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ action, onClose, onSuccess }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 w-full max-sm text-center animate-fade-in-down" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2">Principal Authentication</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Please verify your identity to {action}.</p>
            <div className="p-4 border-2 border-dashed rounded-lg border-slate-300 dark:border-slate-600">
                 <p className="font-semibold text-primary-500">Biometric / OTP</p>
                 <p className="text-xs text-slate-500">This is a simulated authentication step.</p>
            </div>
            <div className="mt-6 flex justify-center gap-4">
                <button type="button" onClick={onClose} className="font-semibold py-2 px-4 rounded-lg transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600">Cancel</button>
                <button type="button" onClick={onSuccess} className="font-semibold py-2 px-4 rounded-lg transition-colors bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-primary-500/50">Authenticate</button>
            </div>
        </div>
    </div>
);


const ManageUsersPage: React.FC<{ user: User | null }> = ({ user: authenticatedUser }) => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<string>('23'); // Default to current 23 batch
    const [modalState, setModalState] = useState<{ type: 'form' | 'auth' | 'results' | null, user?: User | null, action?: string, isDelete?: boolean }>({ type: null });
    
    const fetchUsers = () => getUsers().then(setAllUsers);

    useEffect(() => {
        fetchUsers();
    }, []);

    const { faculty, staff, students } = useMemo(() => {
        // Requirements: Exclude bhanu99517 from display
        const displayableUsers = allUsers.filter(u => u.pin !== 'bhanu99517');
        const principal = displayableUsers.find(u => u.role === Role.PRINCIPAL);
        
        const rawStudents = displayableUsers.filter(u => u.role === Role.STUDENT);
        const filteredStudents = selectedBatch === 'All' 
            ? rawStudents 
            : rawStudents.filter(s => s.pin.startsWith(selectedBatch));

        return {
            faculty: [principal, ...displayableUsers.filter(u => u.role === Role.HOD || u.role === Role.FACULTY)].filter(Boolean) as User[],
            staff: displayableUsers.filter(u => u.role === Role.STAFF),
            students: filteredStudents
        };
    }, [allUsers, selectedBatch]);

    const isBhanuAdmin = authenticatedUser?.pin === 'bhanu99517';
    const canManageFacultyOrStaff = (authenticatedUser?.role === Role.PRINCIPAL || authenticatedUser?.role === Role.SUPER_ADMIN) && !isBhanuAdmin;
    const canManageStudents = authenticatedUser?.role === Role.PRINCIPAL || authenticatedUser?.role === Role.FACULTY || authenticatedUser?.role === Role.HOD || authenticatedUser?.role === Role.SUPER_ADMIN;

    const handleAction = (action: 'add' | 'edit' | 'delete' | 'results', userToManage: User | null, requiresAuth: boolean) => {
        if (action === 'results' && userToManage) {
            setModalState({ type: 'results', user: userToManage });
            return;
        }

        if (requiresAuth && authenticatedUser?.role !== Role.SUPER_ADMIN) {
            const actionText = action === 'add' ? 'add a new user' : `${action} ${userToManage?.name}`;
            setModalState({ type: 'auth', user: userToManage, action: actionText, isDelete: action === 'delete' });
        } else {
             if (action === 'delete' && userToManage) {
                 if(window.confirm(`Are you sure you want to delete ${userToManage.name}? This action cannot be undone.`)) {
                    deleteUser(userToManage.id).then(fetchUsers);
                 }
             } else {
                setModalState({ type: 'form', user: userToManage });
             }
        }
    };

    const handleGenerateIdCard = async (userToGenerate: User) => {
        try {
            await generateIdCard(userToGenerate);
        } catch (error) {
            console.error("Failed to generate ID card:", error);
            alert(`Could not generate ID card. See console for details.`);
        }
    };
    
    const handleAuthSuccess = () => {
        if (modalState.isDelete && modalState.user) {
            deleteUser(modalState.user.id).then(() => {
                setModalState({ type: null });
                fetchUsers();
            });
        } else {
             setModalState(prev => ({ ...prev, type: 'form' }));
        }
    };

    const handleSaveUser = async (userToSave: User) => {
        if (userToSave.id.startsWith('new_')) {
            await addUser(userToSave);
        } else {
            await updateUser(userToSave.id, userToSave);
        }
        setModalState({ type: null });
        fetchUsers();
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="space-y-8">
                {/* Specific restriction for bhanu99517 admin: hide faculty and staff management */}
                {!isBhanuAdmin && (
                    <>
                        <UserTable 
                            title="Faculty & Leadership" 
                            users={faculty} 
                            canManage={canManageFacultyOrStaff}
                            onAdd={() => handleAction('add', null, true)}
                            onEdit={(user) => handleAction('edit', user, true)} 
                            onDelete={(user) => handleAction('delete', user, true)} 
                        />
                        
                        <UserTable 
                            title="Administrative Staff" 
                            users={staff} 
                            canManage={canManageFacultyOrStaff}
                            onAdd={() => handleAction('add', null, true)}
                            onEdit={(user) => handleAction('edit', user, true)} 
                            onDelete={(user) => handleAction('delete', user, true)} 
                        />
                    </>
                )}

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div className="flex items-center gap-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Students</h3>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-slate-500">Batch Filter:</label>
                                <select 
                                    value={selectedBatch} 
                                    onChange={(e) => setSelectedBatch(e.target.value)}
                                    className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary-500"
                                >
                                    <optgroup label="Active Batches">
                                        <option value="25">25 Batch</option>
                                        <option value="24">24 Batch</option>
                                        <option value="23">23 Batch</option>
                                    </optgroup>
                                    <optgroup label="Completed Batches (Alumni)">
                                        <option value="22">22 Batch</option>
                                        <option value="21">21 Batch</option>
                                        <option value="20">20 Batch</option>
                                    </optgroup>
                                    <option value="All">All Students</option>
                                </select>
                            </div>
                        </div>
                        {canManageStudents && !isBhanuAdmin && (
                            <button onClick={() => handleAction('add', null, false)} className="font-semibold py-2 px-4 rounded-lg transition-colors bg-primary-600 text-white hover:bg-primary-700 shadow-lg flex items-center gap-2">
                                <PlusIcon className="w-5 h-5" /> Add New
                            </button>
                        )}
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name / Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Info</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Batch Info</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {students.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-11 w-11">
                                                    <img className="h-11 w-11 rounded-full object-cover" src={user.imageUrl} alt="" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</div>
                                                    <div className="mt-1"><RolePill role={user.role}/></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                            <div className="font-mono">{user.pin}</div>
                                            <div>{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                            {(() => {
                                                const batch = user.pin.substring(0, 2);
                                                const isCompleted = ['20', '21', '22'].includes(batch);
                                                return (
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{batch} Batch</span>
                                                        <span className={`text-xs ${isCompleted ? 'text-amber-500' : 'text-green-500'}`}>
                                                            {isCompleted ? 'Completed' : 'Active'}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-1">
                                                {/* Bhanu Super Admin can edit SBTET results for ANY student */}
                                                {isBhanuAdmin && (
                                                    <button 
                                                        onClick={() => handleAction('results', user, false)} 
                                                        title="Edit SBTET Results" 
                                                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 p-2 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                                    >
                                                        <Icons.results className="w-5 h-5"/>
                                                    </button>
                                                )}
                                                
                                                {/* Normal management actions - hidden for Bhanu Admin as per "keep only manage users" and specialized request */}
                                                {!isBhanuAdmin && canManageStudents && (
                                                    <>
                                                        <button onClick={() => handleGenerateIdCard(user)} title="Generate ID Card" className="text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><IdCardIcon className="w-5 h-5"/></button>
                                                        <button onClick={() => handleAction('edit', user, false)} className="text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><EditIcon className="w-5 h-5"/></button>
                                                        <button onClick={() => handleAction('delete', user, false)} className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><DeleteIcon className="w-5 h-5"/></button>
                                                    </>
                                                )}
                                                {!isBhanuAdmin && !canManageStudents && (
                                                    <span className="text-slate-400 dark:text-slate-500 text-xs italic">No permissions</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {students.length === 0 && <p className="text-center py-10 text-slate-500">No students found for {selectedBatch} Batch.</p>}
                    </div>
                </div>
            </div>
            
            {modalState.type === 'auth' && (
                <AuthModal
                    action={modalState.action!}
                    onClose={() => setModalState({ type: null })}
                    onSuccess={handleAuthSuccess}
                />
            )}
            
            {modalState.type === 'form' && (
                <UserFormModal
                    user={modalState.user}
                    onClose={() => setModalState({ type: null })}
                    onSave={handleSaveUser}
                />
            )}

            {modalState.type === 'results' && modalState.user && (
                <ResultsEditorModal 
                    student={modalState.user} 
                    onClose={() => setModalState({ type: null })} 
                />
            )}
        </div>
    );
};

const UserTable: React.FC<{
    title: string;
    users: User[];
    canManage: boolean;
    onAdd: () => void;
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
}> = ({ title, users, canManage, onAdd, onEdit, onDelete }) => (
     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            {canManage && (
                <button onClick={onAdd} className="font-semibold py-2 px-4 rounded-lg transition-colors bg-primary-600 text-white hover:bg-primary-700 shadow-lg flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" /> Add New
                </button>
            )}
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead className="border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name / Role</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Info</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-11 w-11">
                                        <img className="h-11 w-11 rounded-full object-cover" src={user.imageUrl} alt="" />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</div>
                                        <div className="mt-1"><RolePill role={user.role}/></div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                <div className="font-mono">{user.pin}</div>
                                <div>{user.email}</div>
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.email_verified ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                                    {user.email_verified ? 'Verified' : 'Unverified'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {canManage ? (
                                    <div className="flex justify-end gap-1">
                                        {user.role !== Role.PRINCIPAL ? (
                                            <>
                                                <button onClick={() => onEdit(user)} className="text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><EditIcon className="w-5 h-5"/></button>
                                                <button onClick={() => onDelete(user)} className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><DeleteIcon className="w-5 h-5"/></button>
                                            </>
                                        ) : (
                                             <span className="text-slate-400 dark:text-slate-500 text-xs italic px-2">Locked</span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-slate-400 dark:text-slate-500 text-xs italic">No permissions</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

export default ManageUsersPage;
