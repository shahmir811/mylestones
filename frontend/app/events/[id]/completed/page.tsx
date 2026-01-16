'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { authenticatedRequest } from '@/lib/api';

interface Event {
	id: string;
	title: string;
	person_name: string;
	event_type: string;
	description?: string;
	status: string;
	created_at: string;
	updated_at: string;
}

interface Album {
	id: string;
	event_id: string;
	title: string;
	status: string;
}

export default function CompletedPage() {
	const router = useRouter();
	const params = useParams();
	const eventId = params.id as string;
	const [isClient, setIsClient] = useState(false);
	const [event, setEvent] = useState<Event | null>(null);
	const [album, setAlbum] = useState<Album | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setIsClient(true);
		if (!isAuthenticated()) {
			router.push('/login');
			return;
		}

		fetchData();
	}, [router, eventId]);

	const fetchData = async () => {
		try {
			setIsLoading(true);

			// Fetch event
			const eventData = await authenticatedRequest<Event>(
				`/events/${eventId}`,
				{
					method: 'GET',
				},
				() => {
					router.push('/login');
				}
			);
			setEvent(eventData);

			// Fetch album
			try {
				const albumData = await authenticatedRequest<Album>(
					`/albums/${eventId}`,
					{
						method: 'GET',
					},
					() => {
						router.push('/login');
					}
				);
				setAlbum(albumData);
			} catch (err) {
				console.error('Failed to fetch album:', err);
			}
		} catch (err) {
			if (err instanceof Error && err.message === 'Authentication required') {
				router.push('/login');
			} else {
				setError(err instanceof Error ? err.message : 'Failed to load data');
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

	if (isLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-slate-50'>
				<div className='text-slate-600 bg-white rounded-xl border border-slate-200 shadow-sm px-8 py-6'>Loading...</div>
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className='min-h-screen bg-slate-50 p-8'>
				<div className='max-w-4xl mx-auto'>
					<div className='text-red-600 mb-4 bg-red-50 border border-red-200 rounded-lg p-4'>{error || 'Event not found'}</div>
					<button
						onClick={() => router.push(`/events/${eventId}`)}
						className='px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors'>
						Back to Event
					</button>
				</div>
			</div>
		);
	}

	const getStatusDisplay = () => {
		if (event.status === 'sent_to_print') {
			return 'Sent to Print';
		}
		return event.status.charAt(0).toUpperCase() + event.status.slice(1);
	};

	return (
		<div className='min-h-screen bg-slate-50 flex items-center justify-center p-8'>
			<div className='max-w-2xl w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8'>
				<div className='text-center mb-8'>
					<div className='text-5xl mb-4 text-green-600'>✓</div>
					<h1 className='text-3xl font-semibold text-slate-900 mb-2'>Album Sent to Print</h1>
					<p className='text-slate-600'>Your album has been successfully submitted for printing.</p>
				</div>

				<div className='space-y-6 mb-8'>
					{album && (
						<div className='border-b border-slate-200 pb-4'>
							<label className='block text-sm font-medium text-slate-500 mb-1'>Album</label>
							<p className='text-slate-900 font-medium'>{album.title}</p>
						</div>
					)}
					<div className='border-b border-slate-200 pb-4'>
						<label className='block text-sm font-medium text-slate-500 mb-1'>Event</label>
						<p className='text-slate-900 font-medium'>{event.title}</p>
					</div>

					<div className='border-b border-slate-200 pb-4'>
						<label className='block text-sm font-medium text-slate-500 mb-1'>Print Status</label>
						<p className='text-slate-900 font-medium'>{getStatusDisplay()}</p>
					</div>

					<div className='bg-slate-50 border border-slate-200 rounded-lg p-4'>
						<p className='text-sm text-slate-700'>
							<strong>This album is locked.</strong> No further edits can be made.
						</p>
					</div>
				</div>

				<div className='flex justify-center'>
					<button
						onClick={() => router.push(`/events/${eventId}`)}
						className='px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors'>
						Back to Event
					</button>
				</div>
			</div>
		</div>
	);
}

