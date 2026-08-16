import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, GraduationCap, Users, Building, FileBadge, MapPin, Calendar, ArrowLeft } from 'lucide-react';
import { getDoctors, getReviews } from '../../lib/api';

export default function PublicDoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctorDetails, setDoctorDetails] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    // Fetch doctor by ID (assuming getDoctors handles single ID or we filter)
    getDoctors().then(res => {
      const match = res.data.find((d: any) => d._id === id);
      if (match) {
        setDoctorDetails(match);
        getReviews(match._id).then(r => setReviews(r.data)).catch(() => {});
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Loading profile...</div>;
  if (!doctorDetails) return <div className="p-12 text-center text-red-500 font-medium">Doctor not found.</div>;

  const rating = doctorDetails?.rating || 0;
  const reviewCount = doctorDetails?.reviewCount || 0;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium transition-colors">
        <ArrowLeft className="w-5 h-5" /> Back to Search
      </button>

      {/* Top Banner / Identity */}
      <div className="bg-white rounded-t-2xl rounded-b-xl border border-slate-200 shadow-sm overflow-hidden mb-6 relative">
        <div className="h-40 bg-slate-900 w-full relative">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900"></div>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        </div>
        
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-start -mt-16 mb-4">
            <div className="w-32 h-32 bg-white rounded-full shadow-lg border-4 border-white flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-slate-100"></div>
              <span className="text-5xl font-extrabold text-blue-900 relative z-10 shadow-sm">{doctorDetails.name?.charAt(0) || 'D'}</span>
            </div>
            <button 
              onClick={() => navigate(`/patient/book/${doctorDetails._id}`)}
              className="mt-20 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" /> Book Appointment
            </button>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{doctorDetails.name}</h1>
            <p className="text-lg text-slate-700 mt-1 font-medium">{doctorDetails.specialization}</p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {doctorDetails.location || 'Location not specified'}</span>
              <span className="flex items-center gap-1.5 text-blue-600 font-bold"><Users className="w-4 h-4" /> {doctorDetails.reviewCount ? `${doctorDetails.reviewCount * 5}+ Patients` : 'Building practice'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content (About, Exp, Edu) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* About */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">About</h2>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[15px]">
              {doctorDetails.bio || 'No summary provided.'}
            </p>
          </div>

          {/* Experience */}
          {doctorDetails.experiences && doctorDetails.experiences.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Experience</h2>
              <div className="space-y-0">
                {doctorDetails.experiences.map((exp: any, i: number) => (
                  <div key={i} className="flex gap-5 relative pb-8 last:pb-0 group">
                    {i !== doctorDetails.experiences.length - 1 && (
                      <div className="absolute left-[23px] top-12 bottom-0 w-0.5 bg-slate-200"></div>
                    )}
                    <div className="relative z-10 w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm group-hover:border-blue-300 group-hover:bg-blue-50 transition-colors">
                      <Building className="w-6 h-6 text-slate-500 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="pt-1">
                      <h3 className="text-base font-bold text-slate-900">{exp.title}</h3>
                      <p className="text-slate-800 font-medium text-[15px]">{exp.hospital}</p>
                      <p className="text-sm text-slate-500 mb-3 mt-0.5">{exp.duration}</p>
                      <p className="text-[15px] text-slate-700 leading-relaxed">{exp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {doctorDetails.educations && doctorDetails.educations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Education</h2>
              <div className="space-y-0">
                {doctorDetails.educations.map((edu: any, i: number) => (
                  <div key={i} className="flex gap-5 relative pb-8 last:pb-0 group">
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
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Side Content */}
        <div className="space-y-6">
          
          {/* Timings */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-5">Consultation Timings</h3>
            <p className="text-[15px] font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
              {doctorDetails.hours || 'Mon-Fri, 9AM-5PM'}
            </p>
          </div>

          {/* Skills */}
          {doctorDetails.skills && doctorDetails.skills.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-5">Skills</h3>
              <div className="flex flex-wrap gap-2.5">
                {doctorDetails.skills.map((skill: string, i: number) => (
                  <div key={i} className="px-3 py-1.5 bg-slate-100 text-slate-800 font-bold text-[13px] rounded-lg border border-slate-200 cursor-default">
                    {skill}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {doctorDetails.certifications && doctorDetails.certifications.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-5">Licenses & Certifications</h3>
              <div className="space-y-4">
                {doctorDetails.certifications.map((cert: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5"><FileBadge className="w-6 h-6 text-slate-400" /></div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{cert.name}</p>
                      <p className="text-[13px] text-slate-700">{cert.issuer}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Issued {cert.year}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Recent Reviews */}
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
