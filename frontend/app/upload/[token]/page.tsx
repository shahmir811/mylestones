'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';

interface Invite {
  event_id: string;
  title: string;
  person_name: string;
  event_type: 'celebration' | 'remembrance';
  status: string;
}

interface PhotoFile {
  file: File;
  caption: string;
  preview: string;
}

export default function UploadPage() {
  const params = useParams();
  const token = params.token as string;
  const [invite, setInvite] = useState<Invite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contributorName, setContributorName] = useState('');
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        setIsLoading(true);
        const data = await apiRequest<Invite>(`/invites/${token}`, {
          method: 'GET',
        });
        setInvite(data);
      } catch (err) {
        if (err instanceof Error) {
          const message = err.message;
          if (message.includes('expired') || message.includes('Invalid token') || message.includes('already been used')) {
            setError(message);
          } else {
            setError('Unable to load invite. Please check your link and try again.');
          }
        } else {
          setError('Unable to load invite. Please check your link and try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchInvite();
    }
  }, [token]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos: PhotoFile[] = files.map((file) => ({
      file,
      caption: '',
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const updatePhotoCaption = (index: number, caption: string) => {
    setPhotos((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], caption };
      return updated;
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Revoke object URL to prevent memory leak
      URL.revokeObjectURL(prev[index].preview);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (photos.length === 0) {
      setUploadError('Please select at least one photo to upload');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();

      // Add contributor name if provided
      if (contributorName.trim()) {
        formData.append('name', contributorName.trim());
      }

      // Add photos
      photos.forEach((photo) => {
        formData.append('photos', photo.file);
      });

      // Add captions as JSON array
      const captions = photos.map((photo) => photo.caption.trim() || '');
      formData.append('captions', JSON.stringify(captions));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/uploads/${token}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadSuccess(true);
      setPhotos([]);
      setContributorName('');
    } catch (err) {
      if (err instanceof Error) {
        const message = err.message;
        if (message.includes('not in collecting status')) {
          setUploadError('This event is no longer accepting contributions.');
        } else if (message.includes('Invalid file type') || message.includes('File size')) {
          setUploadError(message);
        } else {
          setUploadError('Failed to upload photos. Please try again.');
        }
      } else {
        setUploadError('Failed to upload photos. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="text-center">
          <div className="text-slate-600 bg-white rounded-xl border border-slate-200 shadow-sm px-8 py-6">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md w-full text-center bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="text-red-600 mb-4 bg-red-50 border border-red-200 rounded-lg p-3">{error || 'Invalid invite link'}</div>
          <p className="text-slate-600 text-sm">
            The invite link may be invalid, expired, or has already been used. Please contact the event organizer for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (uploadSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md w-full text-center bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="text-green-600 mb-4 text-2xl font-semibold">Thank you!</div>
          <p className="text-slate-700 mb-2 font-medium">
            Your memories have been successfully uploaded.
          </p>
          <p className="text-slate-600 text-sm">
            Your contributions will help create a beautiful collection for {invite.person_name}.
          </p>
        </div>
      </div>
    );
  }

  const eventTypeText = invite.event_type === 'celebration' ? 'celebration' : 'remembrance';
  const canUpload = invite.status === 'collecting';

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <main className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">
              Share Your Memories
            </h1>
            <p className="text-slate-600 mb-4">
              We're collecting memories for <span className="font-medium">{invite.person_name}</span>'s {eventTypeText}
            </p>
            <p className="text-slate-500 text-sm">
              {invite.title}
            </p>
          </div>

          {!canUpload && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <p className="text-yellow-800 text-sm font-medium">
                This event is no longer accepting contributions. The collection phase has ended.
              </p>
            </div>
          )}

          {canUpload && (
            <p className="text-slate-700 mb-6 text-center">
              Please share your photos and memories. Each photo can include an optional caption to help tell the story.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                Your Name (optional)
              </label>
              <input
                id="name"
                type="text"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                placeholder="How would you like to be credited?"
                disabled={!canUpload || isUploading}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
              />
            </div>

            <div>
              <label htmlFor="photos" className="block text-sm font-medium text-slate-700 mb-2">
                Photos *
              </label>
              <input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                disabled={!canUpload || isUploading}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
              />
              <p className="mt-2 text-xs text-slate-500">
                You can select multiple photos at once. Maximum 20 photos, 10MB each.
              </p>
            </div>

            {photos.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-700">Selected Photos</h3>
                {photos.map((photo, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex gap-4">
                      <img
                        src={photo.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="mb-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Caption (optional)
                          </label>
                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) => updatePhotoCaption(index, e.target.value)}
                            placeholder="Add a caption..."
                            disabled={!canUpload || isUploading}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uploadError && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">
                {uploadError}
              </div>
            )}

            <button
              type="submit"
              disabled={!canUpload || isUploading || photos.length === 0}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
            >
              {isUploading ? 'Uploading memories...' : 'Upload memories'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

