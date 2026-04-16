import { useEffect, useState } from 'react';
import { NewsCarousel } from '../components/EventsNewsCarousels';

export default function NewsPage() {
  const [newsList, setNewsList] = useState<any[]>([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const baseUrl = import.meta.env.VITE_CMS_URL || import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';
        const res = await fetch(`${baseUrl}/api/news-items?populate=*`);
        const json = await res.json();

        const toAbsoluteUrl = (path: string) =>
          path.startsWith('http') ? path : `${baseUrl}${path}`;

        const extractImageUrls = (...mediaFields: any[]): string[] => {
          const urls: string[] = [];

          const appendIfValid = (value: any) => {
            const path = value?.url || value?.attributes?.url;
            if (typeof path === 'string' && path.length > 0) {
              urls.push(toAbsoluteUrl(path));
            }
          };

          mediaFields.forEach((mediaField) => {
            if (!mediaField) {
              return;
            }

            if (Array.isArray(mediaField)) {
              mediaField.forEach(appendIfValid);
              return;
            }

            if (Array.isArray(mediaField.data)) {
              mediaField.data.forEach(appendIfValid);
              return;
            }

            appendIfValid(mediaField.data || mediaField);
          });

          return Array.from(new Set(urls));
        };
        
        if (json.data) {
          setNewsList(
            json.data.map((item: any) => {
              const attrs = item.attributes || item;
              const imageUrls = extractImageUrls(attrs.imageUrl, attrs.image, attrs.images, attrs.gallery);
              const fallbackUrls = imageUrls.length > 0 ? imageUrls : ['/accademics/news/news-1.jpg'];

              return {
                id: item.id.toString(),
                title: attrs.title,
                description: attrs.description,
                href: attrs.href || '#',
                imageUrl: fallbackUrls[0],
                imageUrls: fallbackUrls,
              };
            })
          );
        }
      } catch (error) {
        console.error("Error fetching news:", error);
      }
    };
    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-white py-24 pt-32 dark:bg-[#070d19]">
      <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-12">
        <div className="mb-16 text-center sm:text-left">
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">University News</h1>
          <p className="text-xl font-medium text-emerald-700 dark:text-emerald-400">Stay updated with the latest happenings around campus.</p>
        </div>
        <NewsCarousel news={newsList} />
      </div>
    </div>
  );
}