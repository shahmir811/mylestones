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
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Events</h1>
          <Link
            href="/events/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Event
          </Link>
        </div>

        {isLoading && (
          <div className="text-center py-8 text-gray-600">Loading events...</div>
        )}

        {error && (
          <div className="text-red-600 py-4">{error}</div>
        )}

        {!isLoading && !error && events.length === 0 && (
          <div className="text-center py-8 text-gray-600">No events yet</div>
        )}

        {!isLoading && !error && events.length > 0 && (
          <div className="space-y-4">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">{event.title}</h2>
                    <p className="text-gray-600 mt-1">Person: {event.person_name}</p>
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      <span>Type: {event.event_type}</span>
                      <span>Status: {event.status}</span>
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

