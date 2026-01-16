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
      <div className="min-h-screen bg-slate-50 p-8">
        <main className="max-w-2xl mx-auto">
          <div className="text-center py-12 text-slate-600 bg-white rounded-xl border border-slate-200 shadow-sm">Loading event...</div>
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
      <div className="min-h-screen bg-slate-50 p-8">
        <main className="max-w-2xl mx-auto">
          <div className="text-red-600 py-4 bg-red-50 border border-red-200 rounded-lg p-4 mb-4">{error || 'Event not found'}</div>
          <button
            onClick={() => router.push('/events')}
            className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
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
    <div className="min-h-screen bg-slate-50 p-8">
      <main className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/events')}
            className="text-blue-600 hover:text-blue-700 mb-4 font-medium transition-colors"
          >
            ← Back to Events
          </button>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-semibold text-slate-900">{event.title}</h1>
            <button
              onClick={() => router.push(`/events/${eventId}/album`)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
            >
              View Album
            </button>
          </div>
        </div>

        {showStartCollectingConfirm && (
          <div className="mb-6 border border-blue-200 bg-blue-50 rounded-xl p-5 shadow-sm">
            <p className="text-blue-800 mb-4 font-medium">
              Once you start collecting, you can invite people to upload photos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleStartCollecting}
                disabled={isUpdatingStatus}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
              >
                {isUpdatingStatus ? 'Starting...' : 'Confirm'}
              </button>
              <button
                onClick={() => {
                  setShowStartCollectingConfirm(false);
                  setStatusError(null);
                }}
                disabled={isUpdatingStatus}
                className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-medium transition-colors text-slate-700 bg-white"
              >
                Cancel
              </button>
            </div>
            {statusError && (
              <div className="mt-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                {statusError}
              </div>
            )}
          </div>
        )}

        {!showStartCollectingConfirm && isDraft && (
          <div className="mb-6">
            <button
              onClick={() => setShowStartCollectingConfirm(true)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
            >
              Start Collecting Photos
            </button>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-5 border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
            <div>
              <span className="text-sm font-medium text-slate-500 block mb-1">Person Name</span>
              <p className="mt-1 text-slate-900">{event.person_name}</p>
            </div>

            <div>
              <span className="text-sm font-medium text-slate-500 block mb-1">Event Type</span>
              <p className="mt-1 capitalize text-slate-900">{event.event_type}</p>
            </div>

            <div>
              <span className="text-sm font-medium text-slate-500 block mb-1">Status</span>
              <p className="mt-1 capitalize text-slate-900">{event.status}</p>
            </div>

            {event.description && (
              <div>
                <span className="text-sm font-medium text-slate-500 block mb-1">Description</span>
                <p className="mt-1 text-slate-900">{event.description}</p>
              </div>
            )}

            <div>
              <span className="text-sm font-medium text-slate-500 block mb-1">Created</span>
              <p className="mt-1 text-slate-900">{new Date(event.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-slate-900">Invite Contributors</h2>
            
            {!canInvite && (
              <div className="mb-4 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                Invites can only be sent when event status is "collecting"
              </div>
            )}

            <form onSubmit={handleSendInvites} className="space-y-4">
              <div>
                <label htmlFor="emails" className="block text-sm font-medium mb-2 text-slate-700">
                  Email Addresses
                </label>
                <textarea
                  id="emails"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={!canInvite || isSendingInvites}
                  placeholder="Enter email addresses separated by commas or new lines&#10;example@email.com, another@email.com"
                  rows={4}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Separate multiple emails with commas or new lines
                </p>
              </div>

              {inviteSuccess && (
                <div className="text-green-700 text-sm space-y-2 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="font-medium">{inviteSuccess}</div>
                  {inviteLinks.length > 0 && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                      <p className="text-xs font-medium text-slate-700 mb-2">Upload links (for testing):</p>
                      <div className="space-y-2">
                        {inviteLinks.map((invite, idx) => (
                          <div key={idx} className="text-xs">
                            <div className="text-slate-600 mb-1">{invite.email}:</div>
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
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                  {inviteError}
                </div>
              )}

              <button
                type="submit"
                disabled={!canInvite || isSendingInvites}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
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

