'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { authenticatedRequest } from '@/lib/api';

interface Photo {
  id: string;
  file_url: string;
  caption: string | null;
  approved: boolean;
  uploaded_at: string;
  position: number | null;
}

interface Album {
  id: string;
  event_id: string;
  title: string;
  status: string;
  photos: Photo[];
}

export default function PhotoApprovalPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [isClient, setIsClient] = useState(false);
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPhotos, setUpdatingPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsClient(true);
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchAlbum();
  }, [router, eventId]);

  const fetchAlbum = async () => {
    try {
      setIsLoading(true);
      const data = await authenticatedRequest<Album>(`/albums/${eventId}`, {
        method: 'GET',
      }, () => {
        router.push('/login');
      });
      setAlbum(data);
    } catch (err) {
      if (err instanceof Error && err.message === 'Authentication required') {
        router.push('/login');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load photos');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleApproval = async (photoId: string, approved: boolean) => {
    setUpdatingPhotos((prev) => new Set(prev).add(photoId));
    try {
      await authenticatedRequest(`/photos/${photoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ approved }),
      }, () => {
        router.push('/login');
      });

      // Update local state
      if (album) {
        setAlbum({
          ...album,
          photos: album.photos.map((p) => (p.id === photoId ? { ...p, approved } : p)),
        });
      }
    } catch (err) {
      console.error('Failed to update photo:', err);
      alert(err instanceof Error ? err.message : 'Failed to update photo');
    } finally {
      setUpdatingPhotos((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading photos...</div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-red-600 mb-4">{error || 'Album not found'}</div>
          <button
            onClick={() => router.push(`/events/${eventId}`)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Event
          </button>
        </div>
      </div>
    );
  }

  const allPhotos = album.photos;
  const approvedPhotos = allPhotos.filter((p) => p.approved);
  const pendingPhotos = allPhotos.filter((p) => !p.approved);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/events/${eventId}/album`)}
            className="text-blue-600 hover:text-blue-700 mb-4 text-sm"
          >
            ← Back to Album Editor
          </button>
          <h1 className="text-2xl font-semibold mb-2">Approve Photos</h1>
          <p className="text-gray-600 text-sm">
            Review and approve photos uploaded by contributors. Only approved photos can be added to the album.
          </p>
        </div>

        {pendingPhotos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">
              Pending Approval ({pendingPhotos.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pendingPhotos.map((photo) => (
                <div key={photo.id} className="bg-white border-2 border-gray-200 rounded-lg p-3">
                  <div className="relative mb-2">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${photo.file_url}`}
                      alt={photo.caption || 'Photo'}
                      className="w-full h-32 object-cover rounded"
                    />
                  </div>
                  {photo.caption && (
                    <p className="text-xs text-gray-600 mb-2 truncate" title={photo.caption}>
                      {photo.caption}
                    </p>
                  )}
                  <button
                    onClick={() => handleToggleApproval(photo.id, true)}
                    disabled={updatingPhotos.has(photo.id)}
                    className="w-full px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingPhotos.has(photo.id) ? 'Updating...' : 'Approve'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {approvedPhotos.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Approved Photos ({approvedPhotos.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {approvedPhotos.map((photo) => (
                <div key={photo.id} className="bg-white border-2 border-green-400 rounded-lg p-3">
                  <div className="relative mb-2">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${photo.file_url}`}
                      alt={photo.caption || 'Photo'}
                      className="w-full h-32 object-cover rounded"
                    />
                    <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                      ✓ Approved
                    </div>
                  </div>
                  {photo.caption && (
                    <p className="text-xs text-gray-600 mb-2 truncate" title={photo.caption}>
                      {photo.caption}
                    </p>
                  )}
                  <button
                    onClick={() => handleToggleApproval(photo.id, false)}
                    disabled={updatingPhotos.has(photo.id)}
                    className="w-full px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingPhotos.has(photo.id) ? 'Updating...' : 'Reject'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {allPhotos.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No photos uploaded yet.</p>
            <p className="text-sm mt-2">Photos uploaded by contributors will appear here for approval.</p>
          </div>
        )}
      </div>
    </div>
  );
}


