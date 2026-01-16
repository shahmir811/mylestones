'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import { authenticatedRequest } from '@/lib/api';

interface Event {
  id: string;
  title: string;
  person_name: string;
  event_type: 'celebration' | 'remembrance';
  status: string;
}

export default function EventsPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const data = await authenticatedRequest<Event[]>('/events', {
          method: 'GET',
        }, () => {
          router.push('/login');
        });
        setEvents(data);
      } catch (err) {
        if (err instanceof Error && err.message === 'Authentication required') {
          router.push('/login');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load events');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [router]);

  if (!isClient) {
    return null;
  }

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <main className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold text-slate-900">Events</h1>
          <Link
            href="/events/new"
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
          >
            Create Event
          </Link>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-slate-600 bg-white rounded-xl border border-slate-200 shadow-sm">
            Loading events...
          </div>
        )}

        {error && (
          <div className="text-red-600 py-4 bg-red-50 border border-red-200 rounded-lg p-4">{error}</div>
        )}

        {!isLoading && !error && events.length === 0 && (
          <div className="text-center py-12 text-slate-600 bg-white rounded-xl border border-slate-200 shadow-sm">
            No events yet. Create your first event to get started!
          </div>
        )}

        {!isLoading && !error && events.length > 0 && (
          <div className="space-y-4">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block border border-slate-200 rounded-xl p-6 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">{event.title}</h2>
                    <p className="text-slate-600 mb-3">Person: {event.person_name}</p>
                    <div className="flex gap-4 text-sm text-slate-500">
                      <span className="capitalize">Type: {event.event_type}</span>
                      <span className="capitalize">Status: {event.status}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

