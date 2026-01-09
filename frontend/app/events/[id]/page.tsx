'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { authenticatedRequest } from '@/lib/api';

interface Event {
  id: string;
  title: string;
  person_name: string;
  event_type: 'celebration' | 'remembrance';
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [isClient, setIsClient] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<Array<{ email: string; token: string; link: string }>>([]);
  const [showStartCollectingConfirm, setShowStartCollectingConfirm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await authenticatedRequest<Event>(`/events/${eventId}`, {
        method: 'GET',
      }, () => {
        router.push('/login');
      });
      setEvent(data);
    } catch (err) {
      if (err instanceof Error && err.message === 'Authentication required') {
        router.push('/login');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load event');
      }
    } finally {
      setIsLoading(false);
    }
  }, [eventId, router]);

  useEffect(() => {
    setIsClient(true);
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (eventId) {
      fetchEvent();
    }
  }, [router, eventId, fetchEvent]);

  const handleStartCollecting = async () => {
    if (!event) return;

    setIsUpdatingStatus(true);
    setStatusError(null);

    try {
      await authenticatedRequest<Event>(`/events/${eventId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'collecting' }),
      }, () => {
        router.push('/login');
      });

      setShowStartCollectingConfirm(false);
      await fetchEvent();
    } catch (err) {
      if (err instanceof Error && err.message === 'Authentication required') {
        router.push('/login');
      } else {
        setStatusError(err instanceof Error ? err.message : 'Failed to update event status');
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (!isClient) {
    return null;
  }

  if (!isAuthenticated()) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <main className="max-w-2xl mx-auto">
          <div className="text-center py-8 text-gray-600">Loading event...</div>
        </main>
      </div>
    );
  }

  const parseEmails = (input: string): string[] => {
    return input
      .split(/[,\n]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);
  };

  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    const emails = parseEmails(emailInput);

    if (emails.length === 0) {
      setInviteError('Please enter at least one email address');
      return;
    }

    setIsSendingInvites(true);

    try {
      const response = await authenticatedRequest<{ invites: Array<{ email: string; token: string }> }>(`/events/${eventId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ emails }),
      }, () => {
        router.push('/login');
      });

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const links = response.invites.map((invite) => ({
        email: invite.email,
        token: invite.token,
        link: `${baseUrl}/upload/${invite.token}`,
      }));

      setInviteLinks(links);
      setInviteSuccess(`Successfully sent ${emails.length} invite(s)`);
      setEmailInput('');
    } catch (err) {
      if (err instanceof Error && err.message === 'Authentication required') {
        router.push('/login');
      } else {
        setInviteError(err instanceof Error ? err.message : 'Failed to send invites');
      }
    } finally {
      setIsSendingInvites(false);
    }
  };

  if (error || !event) {
    return (
      <div className="min-h-screen p-8">
        <main className="max-w-2xl mx-auto">
          <div className="text-red-600 py-4">{error || 'Event not found'}</div>
          <button
            onClick={() => router.push('/events')}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Events
          </button>
        </main>
      </div>
    );
  }

  const canInvite = event.status === 'collecting';
  const isDraft = event.status === 'draft';

  return (
    <div className="min-h-screen p-8">
      <main className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/events')}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Events
          </button>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold">{event.title}</h1>
            <button
              onClick={() => router.push(`/events/${eventId}/album`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              View Album
            </button>
          </div>
        </div>

        {showStartCollectingConfirm && (
          <div className="mb-6 border border-blue-200 bg-blue-50 rounded-lg p-4">
            <p className="text-blue-800 mb-3">
              Once you start collecting, you can invite people to upload photos.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleStartCollecting}
                disabled={isUpdatingStatus}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingStatus ? 'Starting...' : 'Confirm'}
              </button>
              <button
                onClick={() => {
                  setShowStartCollectingConfirm(false);
                  setStatusError(null);
                }}
                disabled={isUpdatingStatus}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            {statusError && (
              <div className="mt-3 text-red-600 text-sm">
                {statusError}
              </div>
            )}
          </div>
        )}

        {!showStartCollectingConfirm && isDraft && (
          <div className="mb-6">
            <button
              onClick={() => setShowStartCollectingConfirm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Start Collecting Photos
            </button>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-4 border border-gray-200 rounded-lg p-6">
            <div>
              <span className="text-sm font-medium text-gray-500">Person Name</span>
              <p className="mt-1">{event.person_name}</p>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-500">Event Type</span>
              <p className="mt-1 capitalize">{event.event_type}</p>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-500">Status</span>
              <p className="mt-1 capitalize">{event.status}</p>
            </div>

            {event.description && (
              <div>
                <span className="text-sm font-medium text-gray-500">Description</span>
                <p className="mt-1">{event.description}</p>
              </div>
            )}

            <div>
              <span className="text-sm font-medium text-gray-500">Created</span>
              <p className="mt-1">{new Date(event.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Invite Contributors</h2>
            
            {!canInvite && (
              <div className="mb-4 text-sm text-gray-500">
                Invites can only be sent when event status is "collecting"
              </div>
            )}

            <form onSubmit={handleSendInvites} className="space-y-4">
              <div>
                <label htmlFor="emails" className="block text-sm font-medium mb-1">
                  Email Addresses
                </label>
                <textarea
                  id="emails"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={!canInvite || isSendingInvites}
                  placeholder="Enter email addresses separated by commas or new lines&#10;example@email.com, another@email.com"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Separate multiple emails with commas or new lines
                </p>
              </div>

              {inviteSuccess && (
                <div className="text-green-600 text-sm space-y-2">
                  <div>{inviteSuccess}</div>
                  {inviteLinks.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">Upload links (for testing):</p>
                      <div className="space-y-2">
                        {inviteLinks.map((invite, idx) => (
                          <div key={idx} className="text-xs">
                            <div className="text-gray-600 mb-1">{invite.email}:</div>
                            <a
                              href={invite.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 break-all"
                            >
                              {invite.link}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {inviteError && (
                <div className="text-red-600 text-sm">
                  {inviteError}
                </div>
              )}

              <button
                type="submit"
                disabled={!canInvite || isSendingInvites}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingInvites ? 'Sending...' : 'Send Invites'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

