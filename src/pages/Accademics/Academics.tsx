import { useEffect, useState } from 'react';
import AcademicStaffProfileCard, { AcademicStaffProfileCardProps } from '../../components/AcademicStaffProfileCard';

export function Academics() {
  const [staffList, setStaffList] = useState<AcademicStaffProfileCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const baseUrl = import.meta.env.VITE_CMS_URL || import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';
        const res = await fetch(`${baseUrl}/api/academic-staffs?populate=*`);
        
        if (!res.ok) {
          setStatus(`Error ${res.status}: Strapi is blocking access. Go to Strapi Settings > Roles > Public and check 'find' for Academic Staff.`);
          setIsLoading(false);
          return;
        }

        const json = await res.json();

        if (json.data && json.data.length > 0) {
          const formattedStaff = json.data.map((item: any) => {
            const attrs = item.attributes || item;
            const mediaImage = attrs.imageUrl || attrs.image || attrs.avatar;
            const mediaCv = attrs.cvUrl || attrs.cvurl || attrs.cvDocument || attrs.cv;
            
            const imagePath = mediaImage?.url || mediaImage?.data?.attributes?.url;
            const cvPath = mediaCv?.url || mediaCv?.data?.attributes?.url;

            return {
              name: attrs.name,
              role: attrs.role,
              specialty: attrs.specialty || '',
              email: attrs.email || '',
              bio: attrs.bio || '',
              cvLabel: attrs.cvLabel || attrs.cvlabel || 'Download CV (PDF)',
              qualifications: attrs.qualifications || [],
              researchDirections: attrs.researchDirections || [],
              experience: attrs.experience || [],
              imageUrl: imagePath ? (imagePath.startsWith('http') ? imagePath : `${baseUrl}${imagePath}`) : '/accademics/image-not-hero.png',
              cvUrl: cvPath ? (cvPath.startsWith('http') ? cvPath : `${baseUrl}${cvPath}`) : '#'
            };
          });
          setStaffList(formattedStaff);
        } else {
          setStatus("Connected to Strapi, but no Staff profiles found. Did you click 'Publish' instead of just 'Save'?");
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
        setStatus("Network Error: Could not connect to Strapi.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaff();
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-[1400px] px-4 py-16 pt-32">
      <h1 className="mb-12 text-center text-4xl font-bold text-emerald-700 dark:text-emerald-400 sm:text-left">Academic Staff</h1>
      
      {isLoading ? (
        <div className="animate-pulse p-12 text-center text-xl font-bold text-emerald-600 dark:text-emerald-400">Loading Staff from Strapi...</div>
      ) : status ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-xl font-bold text-emerald-700 dark:border-slate-700 dark:text-emerald-400">
          {status}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {staffList.map((member, index) => (
            <AcademicStaffProfileCard key={index} {...member} />
          ))}
        </div>
      )}
    </div>
  );
}