import { useEffect, useState } from 'react';
import { getBulletins } from '../api';

export default function BulletinOverlay() {
  const [open, setOpen] = useState(false);
  const [bulletins, setBulletins] = useState([]);

  const loadBulletins = async () => {
    try {
      const data = await getBulletins();
      setBulletins(data.bulletins || []);
    } catch (error) {
      console.error('Failed to fetch bulletins', error);
    }
  };

  useEffect(() => {
    loadBulletins();
    const interval = setInterval(loadBulletins, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[90] flex h-16 w-16 items-center justify-center rounded-full bg-[#CC2229] text-3xl text-white shadow-2xl transition-transform hover:scale-105"
        title="View bulletins"
      >
        <i className="fas fa-bullhorn text-2xl" aria-hidden="true" />
        {bulletins.length > 0 ? (
          <span className="absolute -left-1 -top-1 rounded-full bg-white px-2 py-1 text-xs font-bold text-[#CC2229] shadow">
            {bulletins.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed bottom-24 right-6 z-[89] w-[min(92vw,420px)] rounded-2xl border border-red-100 bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Bulletin Announcements</h3>
              <p className="text-sm text-gray-500">Company-wide updates available to your portal.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Close
            </button>
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {bulletins.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                No active bulletins right now.
              </p>
            ) : (
              bulletins.map((bulletin) => (
                <div key={bulletin.id} className="rounded-xl border border-red-100 bg-red-50/60 p-4">
                  <p className="font-semibold text-gray-900">{bulletin.title}</p>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{bulletin.message}</p>
                  <p className="mt-3 text-xs text-gray-500">
                    {bulletin.company_name ? `${bulletin.company_name} • ` : ''}
                    {bulletin.created_at ? new Date(bulletin.created_at).toLocaleString() : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
