'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { authenticatedRequest } from '@/lib/api';

interface CreateEventData {
  title: string;
  person_name: string;
  event_type: 'celebration' | 'remembrance';
  description?: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [title, setTitle] = useState('');
  const [personName, setPersonName] = useState('');
  const [eventType, setEventType] = useState<'celebration' | 'remembrance'>('celebration');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const eventData: CreateEventData = {
        title,
        person_name: personName,
        event_type: eventType,
      };

      if (description.trim()) {
        eventData.description = description.trim();
      }

      const event = await authenticatedRequest<{ id: string }>('/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      }, () => {
        router.push('/login');
      });

      router.push(`/events/${event.id}`);
    } catch (err) {
      if (err instanceof Error && err.message === 'Authentication required') {
        router.push('/login');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create event');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return null;
  }

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <main className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold mb-8 text-slate-900">Create Event</h1>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2 text-slate-700">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label htmlFor="person_name" className="block text-sm font-medium mb-2 text-slate-700">
              Person Name *
            </label>
            <input
              id="person_name"
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label htmlFor="event_type" className="block text-sm font-medium mb-2 text-slate-700">
              Event Type *
            </label>
            <select
              id="event_type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as 'celebration' | 'remembrance')}
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white"
            >
              <option value="celebration">Celebration</option>
              <option value="remembrance">Remembrance</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2 text-slate-700">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
            >
              {isLoading ? 'Creating...' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/events')}
              className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors text-slate-700 bg-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

