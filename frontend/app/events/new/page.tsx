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
    <div className="min-h-screen p-8">
      <main className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Create Event</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="person_name" className="block text-sm font-medium mb-1">
              Person Name *
            </label>
            <input
              id="person_name"
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="event_type" className="block text-sm font-medium mb-1">
              Event Type *
            </label>
            <select
              id="event_type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as 'celebration' | 'remembrance')}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="celebration">Celebration</option>
              <option value="remembrance">Remembrance</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/events')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

