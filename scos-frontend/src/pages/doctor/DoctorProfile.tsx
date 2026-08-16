import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Star, GraduationCap, Users, Save, X, Edit2, Plus, Trash2, Building, FileBadge, MapPin } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import { getReviews, getDoctors, updateDoctor } from '../../lib/api';

interface Education { degree: string; institution: string; year: string; }
interface Experience { title: string; hospital: string; duration: string; description: string; }
interface Certification { name: string; issuer: string; year: string; }
interface ScheduleDay { day: string; isAvailable: boolean; startTime: string; endTime: string; }

interface ProfileForm {
  specialization: string;
  location: string;
  hours: string; // Legacy
  schedule: {
    isSameEveryday: boolean;
    days: ScheduleDay[];
  };
  experience: number;
  bio: string;
  educations: Education[];
  experiences: Experience[];
  certifications: Certification[];
  skills: { value: string }[];
}

export default function DoctorProfile() {
  const { user } = useAuthStore();
  const [doctorDetails, setDoctorDetails] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeModal, setActiveModal] = useState<'intro' | 'about' | 'experience' | 'education' | 'skills' | 'certifications' | 'hours' | null>(null);

  const { register, control, handleSubmit, reset, watch, setValue } = useForm<ProfileForm>({
    defaultValues: {
      specialization: '', location: '', hours: '', experience: 0, bio: '',
      educations: [], experiences: [], certifications: [], skills: [],
      schedule: {
        isSameEveryday: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({
          day: d, isAvailable: true, startTime: '09:00', endTime: '17:00'
        }))
      }
    }
  });

  const eduArray = useFieldArray({ control, name: "educations" });
  const expArray = useFieldArray({ control, name: "experiences" });
  const certArray = useFieldArray({ control, name: "certifications" });
  const skillsArray = useFieldArray({ control, name: "skills" });

  const defaultScheduleDays = () => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({
    day: d, isAvailable: true, startTime: '09:00', endTime: '17:00'
  }));

  const loadData = () => {
    getDoctors().then(res => {
      const match = res.data.find((d: any) => d.name === user?.name);
      if (match) {
        // Ensure schedule.days is always a valid array
        const safeDays = (match.schedule?.days && Array.isArray(match.schedule.days) && match.schedule.days.length > 0)
          ? match.schedule.days
          : defaultScheduleDays();

        const safeSchedule = {
          isSameEveryday: match.schedule?.isSameEveryday ?? true,
          days: safeDays,
        };

        setDoctorDetails({ ...match, schedule: safeSchedule });
        reset({
          specialization: match.specialization || '',
          location: match.location || '',
          hours: match.hours || '',
          experience: match.experience || 0,
          bio: match.bio || '',
          educations: match.educations || [],
          experiences: match.experiences || [],
          certifications: match.certifications || [],
          skills: (match.skills || []).map((s: string) => ({ value: s })),
          schedule: safeSchedule,
        });
        getReviews(match._id).then(r => setReviews(r.data)).catch(() => {});
      }
    }).catch(() => {});
  };

  useEffect(() => { loadData(); }, [user]);

  const onSubmit = async (data: ProfileForm) => {
    if (!doctorDetails) return;
    try {
      const payload = {
        ...data,
        skills: data.skills.map(s => s.value).filter(v => v.trim() !== '')
      };
      await updateDoctor(doctorDetails._id, payload);
      setDoctorDetails({ ...doctorDetails, ...payload });
      setActiveModal(null);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const rating = doctorDetails?.rating || 0;
  const reviewCount = doctorDetails?.reviewCount || 0;

  // Render Modal Wrapper
  const renderModal = (id: string, title: string, children: React.ReactNode) => {
    if (activeModal !== id) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <button onClick={() => { setActiveModal(null); reset(); loadData(); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            {children}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={() => { setActiveModal(null); reset(); loadData(); }} className="px-5 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit(onSubmit)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2">
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      
      {/* -------------------- Modals -------------------- */}
      
      {renderModal('intro', 'Edit Intro', (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Headline / Specialization</label>
            <input {...register('specialization')} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Senior Cardiologist at SCOS" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Location</label>
              <input {...register('location')} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. New York, NY" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Years of Experience</label>
              <input type="number" {...register('experience')} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>
      ))}

      {renderModal('about', 'Edit About', (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Professional Summary</label>
          <textarea {...register('bio')} className="w-full h-48 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed" placeholder="Write a brief professional summary..." />
        </div>
      ))}

      {renderModal('hours', 'Edit Timings', (
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700 mb-2">Consultation Schedule</label>
          <div className="flex items-center gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <input type="checkbox" {...register('schedule.isSameEveryday')} id="sameEveryday" className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="sameEveryday" className="text-sm font-medium text-slate-700">Use same timings for everyday</label>
          </div>
          
          {watch('schedule.isSameEveryday') ? (
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Start Time</label>
                 <input type="time" {...register('schedule.days.0.startTime')} onChange={(e) => {
                   const val = e.target.value;
                   const days = watch('schedule.days');
                   setValue('schedule.days', days.map(d => ({...d, startTime: val})));
                 }} className="w-full p-2.5 border rounded-lg" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">End Time</label>
                 <input type="time" {...register('schedule.days.0.endTime')} onChange={(e) => {
                   const val = e.target.value;
                   const days = watch('schedule.days');
                   setValue('schedule.days', days.map(d => ({...d, endTime: val})));
                 }} className="w-full p-2.5 border rounded-lg" />
               </div>
             </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                <div key={day} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-20">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...register(`schedule.days.${idx}.isAvailable` as const)} className="w-4 h-4 rounded text-blue-600" />
                      <span className="font-bold text-sm text-slate-700">{day}</span>
                    </label>
                  </div>
                  {watch(`schedule.days.${idx}.isAvailable` as const) ? (
                    <div className="flex-1 flex gap-2">
                      <input type="time" {...register(`schedule.days.${idx}.startTime` as const)} className="w-full p-2 text-sm border rounded-lg" />
                      <span className="self-center text-slate-400">-</span>
                      <input type="time" {...register(`schedule.days.${idx}.endTime` as const)} className="w-full p-2 text-sm border rounded-lg" />
                    </div>
                  ) : (
                    <div className="flex-1 text-sm text-slate-400 font-medium px-2 py-2">Not Available</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {renderModal('experience', 'Edit Experience', (
        <div className="space-y-6">
          {expArray.fields.map((item, index) => (
            <div key={item.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl relative">
              <button onClick={() => expArray.remove(index)} className="absolute top-4 right-4 text-red-500 hover:bg-red-100 p-1.5 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-8">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Title</label>
                  <input {...register(`experiences.${index}.title`)} placeholder="Ex: Attending Surgeon" className="w-full p-2.5 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Hospital / Clinic</label>
                  <input {...register(`experiences.${index}.hospital`)} placeholder="Ex: General Hospital" className="w-full p-2.5 border rounded-lg" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Duration</label>
                  <input {...register(`experiences.${index}.duration`)} placeholder="Ex: Jan 2018 - Present" className="w-full p-2.5 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                <textarea {...register(`experiences.${index}.description`)} placeholder="Describe your responsibilities..." className="w-full p-2.5 border rounded-lg resize-none" rows={3} />
              </div>
            </div>
          ))}
          <button onClick={() => expArray.append({ title: '', hospital: '', duration: '', description: '' })} className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Add Experience
          </button>
        </div>
      ))}

      {renderModal('education', 'Edit Education', (
        <div className="space-y-4">
          {eduArray.fields.map((item, index) => (
            <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex gap-3 items-start">
              <div className="flex-1 space-y-3">
                <input {...register(`educations.${index}.institution`)} placeholder="School/University Name" className="w-full p-2.5 border rounded-lg" />
                <div className="flex gap-3">
                  <input {...register(`educations.${index}.degree`)} placeholder="Degree (Ex: M.D.)" className="flex-1 p-2.5 border rounded-lg" />
                  <input {...register(`educations.${index}.year`)} placeholder="Year" className="w-24 p-2.5 border rounded-lg" />
                </div>
              </div>
              <button onClick={() => eduArray.remove(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 className="w-5 h-5" /></button>
            </div>
          ))}
          <button onClick={() => eduArray.append({ degree: '', institution: '', year: '' })} className="w-full py-3 border-2 border-dashed border-indigo-300 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Add Education
          </button>
        </div>
      ))}

      {renderModal('skills', 'Edit Skills', (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {skillsArray.fields.map((item, index) => (
              <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-2 border rounded-lg">
                <input {...register(`skills.${index}.value`)} placeholder="e.g. Echocardiography" className="flex-1 p-1.5 bg-transparent outline-none" />
                <button onClick={() => skillsArray.remove(index)} className="p-1.5 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <button onClick={() => skillsArray.append({ value: '' })} className="w-full py-3 border-2 border-dashed border-emerald-300 text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Add Skill
          </button>
        </div>
      ))}

      {renderModal('certifications', 'Edit Licenses & Certifications', (
        <div className="space-y-4">
          {certArray.fields.map((item, index) => (
            <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
              <button onClick={() => certArray.remove(index)} className="absolute top-4 right-4 text-red-500 hover:bg-red-100 p-1.5 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              <input {...register(`certifications.${index}.name`)} placeholder="Certification Name" className="w-full mb-3 p-2.5 border rounded-lg pr-10" />
              <div className="flex gap-3">
                <input {...register(`certifications.${index}.issuer`)} placeholder="Issuing Organization" className="flex-1 p-2.5 border rounded-lg" />
                <input {...register(`certifications.${index}.year`)} placeholder="Year" className="w-24 p-2.5 border rounded-lg" />
              </div>
            </div>
          ))}
          <button onClick={() => certArray.append({ name: '', issuer: '', year: '' })} className="w-full py-3 border-2 border-dashed border-amber-300 text-amber-600 font-bold rounded-xl hover:bg-amber-50 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Add Certification
          </button>
        </div>
      ))}

      {/* -------------------- Main Page Profile -------------------- */}

      {/* Top Banner / Identity */}
      <div className="bg-white rounded-t-2xl rounded-b-xl border border-slate-200 shadow-sm overflow-hidden mb-6 mt-4 relative">
        <div className="h-40 bg-slate-900 w-full relative">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900"></div>
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        </div>
        
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-start -mt-16 mb-4">
            <div className="w-32 h-32 bg-white rounded-full shadow-lg border-4 border-white flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-slate-100"></div>
              <span className="text-5xl font-extrabold text-blue-900 relative z-10 shadow-sm">{user?.name?.charAt(0) || 'D'}</span>
            </div>
            <button onClick={() => setActiveModal('intro')} className="mt-20 p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors group">
              <Edit2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dr. {user?.name || 'Doctor'}</h1>
            <p className="text-lg text-slate-700 mt-1 font-medium">{doctorDetails?.specialization || 'Add your specialization'}</p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {doctorDetails?.location || 'Add location'}</span>
              <span className="flex items-center gap-1.5 text-blue-600 font-bold"><Users className="w-4 h-4" /> {doctorDetails?.reviewCount ? `${doctorDetails.reviewCount * 5}+ Patients` : 'Building practice'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content (About, Exp, Edu) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* About */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">About</h2>
              <button onClick={() => setActiveModal('about')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit2 className="w-5 h-5" /></button>
            </div>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[15px]">
              {doctorDetails?.bio || 'Add a summary about your professional background and clinical approach.'}
            </p>
          </div>

          {/* Experience */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Experience</h2>
              <button onClick={() => setActiveModal('experience')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit2 className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-0">
              {doctorDetails?.experiences?.length > 0 ? doctorDetails.experiences.map((exp: any, i: number) => (
                <div key={i} className="flex gap-5 relative pb-8 last:pb-0 group">
                  {/* Timeline Line */}
                  {i !== doctorDetails.experiences.length - 1 && (
                    <div className="absolute left-[23px] top-12 bottom-0 w-0.5 bg-slate-200"></div>
                  )}
                  {/* Icon */}
                  <div className="relative z-10 w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm group-hover:border-blue-300 group-hover:bg-blue-50 transition-colors">
                    <Building className="w-6 h-6 text-slate-500 group-hover:text-blue-600 transition-colors" />
                  </div>
                  {/* Content */}
                  <div className="pt-1">
                    <h3 className="text-base font-bold text-slate-900">{exp.title}</h3>
                    <p className="text-slate-800 font-medium text-[15px]">{exp.hospital}</p>
                    <p className="text-sm text-slate-500 mb-3 mt-0.5">{exp.duration}</p>
                    <p className="text-[15px] text-slate-700 leading-relaxed">{exp.description}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6">
                  <p className="text-slate-500 mb-4">Add your professional work experience.</p>
                  <button onClick={() => setActiveModal('experience')} className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-full hover:bg-blue-100 transition-colors text-sm">Add Experience</button>
                </div>
              )}
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Education</h2>
              <button onClick={() => setActiveModal('education')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit2 className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-0">
              {doctorDetails?.educations?.length > 0 ? doctorDetails.educations.map((edu: any, i: number) => (
                <div key={i} className="flex gap-5 relative pb-8 last:pb-0 group">
                  {/* Timeline Line */}
                  {i !== doctorDetails.educations.length - 1 && (
                    <div className="absolute left-[23px] top-12 bottom-0 w-0.5 bg-slate-200"></div>
                  )}
                  <div className="relative z-10 w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm group-hover:border-indigo-300 group-hover:bg-indigo-50 transition-colors">
                    <GraduationCap className="w-6 h-6 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <div className="pt-1">
                    <h3 className="text-base font-bold text-slate-900">{edu.institution}</h3>
                    <p className="text-[15px] text-slate-800">{edu.degree}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{edu.year}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6">
                  <p className="text-slate-500 mb-4">Add your educational background.</p>
                  <button onClick={() => setActiveModal('education')} className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-full hover:bg-indigo-100 transition-colors text-sm">Add Education</button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Side Content (Skills, Certs, Ratings) */}
        <div className="space-y-6">
          
          {/* Timings */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-900">Consultation Timings</h3>
              <button onClick={() => setActiveModal('hours')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit2 className="w-4 h-4" /></button>
            </div>
            {doctorDetails?.schedule ? (
              doctorDetails.schedule.isSameEveryday ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-[15px]">Everyday</span>
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                    {doctorDetails.schedule.days[0].isAvailable 
                      ? `${doctorDetails.schedule.days[0].startTime} - ${doctorDetails.schedule.days[0].endTime}`
                      : 'Not Available'}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {doctorDetails.schedule.days.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 last:pb-0">
                      <span className={`font-bold text-sm ${d.isAvailable ? 'text-slate-700' : 'text-slate-400'}`}>{d.day}</span>
                      {d.isAvailable ? (
                        <span className="text-sm font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {d.startTime} - {d.endTime}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-red-400 bg-red-50 px-2 py-0.5 rounded border border-red-100">Unavailable</span>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-[15px] font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {doctorDetails?.hours || 'Mon-Fri, 9AM-5PM'}
              </p>
            )}
          </div>

          {/* Skills */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-900">Skills</h3>
              <button onClick={() => setActiveModal('skills')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit2 className="w-4 h-4" /></button>
            </div>
            
            <div className="flex flex-wrap gap-2.5">
              {doctorDetails?.skills?.length > 0 ? doctorDetails.skills.map((skill: string, i: number) => (
                <div key={i} className="px-3 py-1.5 bg-slate-100 text-slate-800 font-bold text-[13px] rounded-lg border border-slate-200 hover:bg-slate-200 hover:border-slate-300 transition-colors cursor-default">
                  {skill}
                </div>
              )) : (
                <p className="text-slate-500 text-sm">Add skills to showcase your expertise.</p>
              )}
            </div>
          </div>

          {/* Hospital Affiliations */}
          {doctorDetails?.hospitals?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                Hospital Affiliations
              </h3>
              <div className="space-y-3">
                {doctorDetails.hospitals.map((hosp: any) => (
                  <div key={hosp._id || hosp} className="flex items-center gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                      <Building className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{hosp.name || hosp}</p>
                      <p className="text-xs text-indigo-600 font-medium mt-0.5">Active Staff</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-900">Licenses & Certifications</h3>
              <button onClick={() => setActiveModal('certifications')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit2 className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-4">
              {doctorDetails?.certifications?.length > 0 ? doctorDetails.certifications.map((cert: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-0.5"><FileBadge className="w-6 h-6 text-slate-400" /></div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{cert.name}</p>
                    <p className="text-[13px] text-slate-700">{cert.issuer}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Issued {cert.year}</p>
                  </div>
                </div>
              )) : (
                <p className="text-slate-500 text-sm">No certifications added.</p>
              )}
            </div>
          </div>

          {/* Ratings */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Patient Ratings</h3>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-4xl font-extrabold text-slate-900">{rating > 0 ? rating.toFixed(1) : '—'}</span>
              <div className="flex flex-col items-start">
                <div className="flex">
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} className={`w-4 h-4 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                  ))}
                </div>
                <span className="text-xs font-medium text-slate-500">Based on {reviewCount} reviews</span>
              </div>
            </div>
          </div>

          {/* Recent Reviews (unchanged data presentation, slightly refined styling) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-h-96 overflow-y-auto">
            <h3 className="font-bold text-slate-900 mb-4">Recent Reviews</h3>
            {reviews.length === 0 ? (
               <p className="text-sm text-slate-500 text-center py-6">No reviews yet.</p>
            ) : (
               <div className="space-y-5">
                 {reviews.map(rev => (
                   <div key={rev._id} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                     <div className="flex items-center justify-between mb-1">
                       <span className="font-bold text-sm text-slate-900">{rev.patientId?.name || 'Anonymous Patient'}</span>
                       <span className="text-xs text-slate-400 font-medium">{new Date(rev.createdAt).toLocaleDateString()}</span>
                     </div>
                     <div className="flex mb-2">
                       {[1,2,3,4,5].map(star => (
                         <Star key={star} className={`w-3 h-3 ${star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                       ))}
                     </div>
                     <p className="text-sm text-slate-700 leading-relaxed">{rev.comment}</p>
                   </div>
                 ))}
               </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
