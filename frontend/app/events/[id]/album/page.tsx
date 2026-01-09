'use client';

import { authenticatedRequest } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCenter,
	useDroppable,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

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
	template_type: string;
	page_count: number | null;
	status: string;
	created_at: string;
	updated_at: string;
	photos: Photo[];
	pdf_url?: string | null;
}

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

interface Page {
	position: number;
	photo?: Photo;
}

function PagePhoto({
	photo,
	pagePosition,
	isLocked,
	onRemove,
}: {
	photo: Photo;
	pagePosition: number;
	isLocked: boolean;
	onRemove: () => void;
}) {
	return (
		<div className='relative w-full h-full'>
			<img
				src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${photo.file_url}`}
				alt={photo.caption || 'Photo'}
				className='w-full h-full object-cover'
			/>
			{!isLocked && (
				<button
					onClick={e => {
						e.stopPropagation();
						onRemove();
					}}
					className='absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg hover:bg-red-600 transition-colors shadow-lg'
					title='Remove photo'>
					×
				</button>
			)}
		</div>
	);
}

function BookPage({
	page,
	pageNumber,
	isActive,
	onClick,
	onRemovePhoto,
	isLocked,
}: {
	page: Page;
	pageNumber: number;
	isActive: boolean;
	onClick: () => void;
	onRemovePhoto: () => void;
	isLocked: boolean;
}) {
	const { setNodeRef, isOver } = useDroppable({
		id: `page-${page.position}`,
		disabled: isLocked,
	});

	return (
		<div
			ref={setNodeRef}
			onClick={onClick}
			className={`relative aspect-square border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
				isActive
					? 'border-blue-500 shadow-lg scale-105'
					: isOver
					? 'border-green-500 bg-green-50'
					: 'border-gray-300 hover:border-gray-400'
			} ${isLocked ? 'cursor-default' : ''}`}>
			{page.photo ? (
				<PagePhoto photo={page.photo} pagePosition={page.position} isLocked={isLocked} onRemove={onRemovePhoto} />
			) : (
				<div className='w-full h-full bg-gray-100 flex items-center justify-center text-gray-400'>
					<div className='text-center'>
						<div className='text-4xl mb-2'>+</div>
						<div className='text-sm'>Drop photo here</div>
					</div>
				</div>
			)}
			<div className='absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded'>
				Page {pageNumber}
			</div>
		</div>
	);
}

function PageThumbnail({
	page,
	pageNumber,
	isActive,
	onClick,
	isLocked,
}: {
	page: Page;
	pageNumber: number;
	isActive: boolean;
	onClick: () => void;
	isLocked: boolean;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `page-${page.position}`,
		disabled: isLocked,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			onClick={onClick}
			className={`w-16 h-16 border-2 rounded overflow-hidden cursor-move ${
				isActive ? 'border-blue-500' : 'border-gray-300'
			} ${isLocked ? 'cursor-default' : ''}`}>
			{page.photo ? (
				<img
					src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${page.photo.file_url}`}
					alt={`Page ${pageNumber}`}
					className='w-full h-full object-cover'
				/>
			) : (
				<div className='w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs'>
					{pageNumber}
				</div>
			)}
		</div>
	);
}

function PhotoTrayItem({ photo, isPlaced, isLocked }: { photo: Photo; isPlaced: boolean; isLocked: boolean }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `photo-${photo.id}`,
		disabled: isLocked,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : isPlaced ? 0.5 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			className={`relative shrink-0 w-24 h-24 rounded overflow-hidden border-2 ${
				isPlaced ? 'border-green-400 opacity-50' : 'border-gray-300'
			} ${isLocked ? 'cursor-default' : 'cursor-move'}`}>
			<img
				src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${photo.file_url}`}
				alt={photo.caption || 'Photo'}
				className='w-full h-full object-cover'
			/>
			{isPlaced && <div className='absolute top-0 right-0 bg-green-500 text-white text-xs px-1 rounded-bl'>✓</div>}
		</div>
	);
}

function PageListEnd({
	pages,
	setPages,
	persistReorder,
	approvedPhotos,
}: {
	pages: Page[];
	setPages: (pages: Page[]) => void;
	persistReorder: (pages: Page[]) => Promise<void>;
	approvedPhotos: Photo[];
}) {
	const { setNodeRef, isOver } = useDroppable({
		id: 'page-list-end',
	});

	return (
		<div
			ref={setNodeRef}
			className={`w-16 h-16 border-2 border-dashed rounded flex items-center justify-center text-xs transition-colors ${
				isOver ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-300 text-gray-400'
			}`}>
			+
		</div>
	);
}

function PhotoTray({ photos, pages, isLocked }: { photos: Photo[]; pages: Page[]; isLocked: boolean }) {
	const placedPhotoIds = new Set(pages.filter(p => p.photo).map(p => p.photo!.id));

	if (photos.length === 0) {
		return (
			<div className='bg-white border-t border-gray-200 p-4'>
				<h3 className='text-sm font-medium text-gray-700 mb-3'>Photo Tray</h3>
				<p className='text-gray-500 text-sm'>
					No approved photos yet. Photos need to be approved before they can be added to the album.
				</p>
			</div>
		);
	}

	return (
		<div className='bg-white border-t border-gray-200 p-4'>
			<h3 className='text-sm font-medium text-gray-700 mb-3'>
				Photo Tray ({photos.length} {photos.length === 1 ? 'photo' : 'photos'})
			</h3>
			<div className='flex gap-2 overflow-x-auto pb-2'>
				<SortableContext items={photos.map(p => `photo-${p.id}`)} strategy={horizontalListSortingStrategy}>
					{photos.map(photo => (
						<PhotoTrayItem key={photo.id} photo={photo} isPlaced={placedPhotoIds.has(photo.id)} isLocked={isLocked} />
					))}
				</SortableContext>
			</div>
		</div>
	);
}

export default function AlbumEditorPage() {
	const router = useRouter();
	const params = useParams();
	const eventId = params.id as string;
	const [isClient, setIsClient] = useState(false);
	const [album, setAlbum] = useState<Album | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPageIndex, setCurrentPageIndex] = useState(0);
	const [pages, setPages] = useState<Page[]>([]);
	const [isReordering, setIsReordering] = useState(false);
	const [isFinalizing, setIsFinalizing] = useState(false);
	const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
	const [showPrintModal, setShowPrintModal] = useState(false);
	const [isPrinting, setIsPrinting] = useState(false);
	const [shippingAddress, setShippingAddress] = useState('');
	const [event, setEvent] = useState<Event | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);

	// Refs to ensure handlers always use latest state
	const pagesRef = useRef<Page[]>([]);
	const approvedPhotosRef = useRef<Photo[]>([]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		})
	);

	useEffect(() => {
		setIsClient(true);
		if (!isAuthenticated()) {
			router.push('/login');
			return;
		}

		fetchAlbum();
		fetchEvent();
	}, [router, eventId]);

	// Ensure currentPageIndex is valid when pages change
	useEffect(() => {
		if (pages.length > 0 && currentPageIndex >= pages.length) {
			setCurrentPageIndex(pages.length - 1);
		}
	}, [pages, currentPageIndex]);

	const fetchAlbum = async () => {
		try {
			setIsLoading(true);
			const data = await authenticatedRequest<Album>(
				`/albums/${eventId}`,
				{
					method: 'GET',
				},
				() => {
					router.push('/login');
				}
			);

			setAlbum(data);

			// Build pages from photos with positions
			const photosWithPositions = data.photos
				.filter(p => p.approved && p.position !== null)
				.sort((a, b) => (a.position || 0) - (b.position || 0));

			const pageList: Page[] = photosWithPositions.map(photo => ({
				position: photo.position!,
				photo,
			}));

			// Ensure at least one empty page if no pages exist
			if (pageList.length === 0) {
				pageList.push({ position: 1 });
			} else {
				// Add an empty page at the end for adding new photos
				const maxPosition = Math.max(...pageList.map(p => p.position));
				pageList.push({ position: maxPosition + 1 });
			}

			setPages(pageList);

			// Set pdf_url if available
			if (data.pdf_url) {
				setPdfUrl(data.pdf_url);
			} else {
				setPdfUrl(null);
			}
		} catch (err) {
			if (err instanceof Error && err.message === 'Authentication required') {
				router.push('/login');
			} else {
				setError(err instanceof Error ? err.message : 'Failed to load album');
			}
		} finally {
			setIsLoading(false);
		}
	};

	const fetchEvent = async () => {
		try {
			const data = await authenticatedRequest<Event>(
				`/events/${eventId}`,
				{
					method: 'GET',
				},
				() => {
					router.push('/login');
				}
			);
			setEvent(data);
		} catch (err) {
			console.error('Failed to fetch event:', err);
		}
	};

	const approvedPhotos = useMemo(() => {
		if (!album) return [];
		// Get all approved photos, sorted by position (placed first) then upload date
		return album.photos
			.filter(p => p.approved)
			.sort((a, b) => {
				// Photos with positions come first
				if (a.position !== null && b.position === null) return -1;
				if (a.position === null && b.position !== null) return 1;
				// If both have positions, sort by position
				if (a.position !== null && b.position !== null) {
					return a.position - b.position;
				}
				// Otherwise sort by upload date
				return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
			});
	}, [album]);

	// Update refs when state changes to ensure handlers use latest values
	useEffect(() => {
		pagesRef.current = pages;
	}, [pages]);

	useEffect(() => {
		approvedPhotosRef.current = approvedPhotos;
	}, [approvedPhotos]);

	const handleDragStart = (event: any) => {
		setActiveId(event.active.id);
	};

	const handleDragEnd = async (event: any) => {
		const { active, over } = event;
		setActiveId(null);

		if (!over) return;

		// Use refs to get latest state
		const currentPages = pagesRef.current;
		const currentApprovedPhotos = approvedPhotosRef.current;

		// Handle page reordering
		if (active.id.toString().startsWith('page-') && over.id.toString().startsWith('page-')) {
			const oldIndex = currentPages.findIndex(p => `page-${p.position}` === active.id);
			const newIndex = currentPages.findIndex(p => `page-${p.position}` === over.id);

			if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
				const newPages = arrayMove(currentPages, oldIndex, newIndex);
				// Update positions
				const updatedPages = newPages.map((page, idx) => ({
					...page,
					position: idx + 1,
				}));
				setPages(updatedPages);
				// Persist in background without blocking
				persistReorder(updatedPages).catch(console.error);
			}
			return;
		}

		// Handle photo drop on page (only if not a page-photo)
		if (
			active.id.toString().startsWith('photo-') &&
			!active.id.toString().startsWith('page-photo-') &&
			over?.id?.toString().startsWith('page-')
		) {
			const photoId = active.id.toString().replace('photo-', '');
			const photo = currentApprovedPhotos.find(p => p.id === photoId);
			if (!photo) return;

			const pagePosition = parseInt(over.id.toString().replace('page-', ''));
			const pageIndex = currentPages.findIndex(p => p.position === pagePosition);

			if (pageIndex !== -1) {
				const newPages = [...currentPages];
				// Remove photo from other pages
				newPages.forEach(p => {
					if (p.photo?.id === photoId) {
						p.photo = undefined;
					}
				});
				// Add photo to target page
				newPages[pageIndex].photo = photo;

				// Ensure there's always an empty page at the end for adding more photos
				const hasEmptyPage = newPages.some((p, idx) => !p.photo && idx === newPages.length - 1);
				if (!hasEmptyPage) {
					const maxPosition = Math.max(...newPages.map(p => p.position));
					newPages.push({ position: maxPosition + 1 });
				}

				setPages(newPages);
				// Persist in background without blocking
				persistReorder(newPages.filter(p => p.photo)).catch(console.error);
			}
			return;
		}

		// Handle photo drop at the end (create new page)
		if (active.id.toString().startsWith('photo-') && over?.id === 'page-list-end') {
			const photoId = active.id.toString().replace('photo-', '');
			const photo = currentApprovedPhotos.find(p => p.id === photoId);
			if (!photo) return;

			const newPages = [...currentPages];
			// Remove photo from existing pages
			newPages.forEach(p => {
				if (p.photo?.id === photoId) {
					p.photo = undefined;
				}
			});

			// Find the last empty page or create a new one
			const lastEmptyIndex = newPages.findIndex((p, idx) => !p.photo && idx === newPages.length - 1);
			if (lastEmptyIndex !== -1) {
				// Use the last empty page
				newPages[lastEmptyIndex].photo = photo;
			} else {
				// Create a new page
				const newPosition = newPages.length > 0 ? Math.max(...newPages.map(p => p.position)) + 1 : 1;
				newPages.push({ position: newPosition, photo });
			}

			// Always ensure there's an empty page at the end for adding more photos
			const maxPosition = Math.max(...newPages.map(p => p.position));
			newPages.push({ position: maxPosition + 1 });

			setPages(newPages);
			// Persist in background without blocking
			persistReorder(newPages.filter(p => p.photo)).catch(console.error);
		}
	};

	const persistReorder = async (pageList: Page[]) => {
		if (!album) return;

		// Only include pages with photos, sorted by position
		const pagesWithPhotos = pageList.filter(p => p.photo).sort((a, b) => a.position - b.position);

		const photoIds = pagesWithPhotos.map(p => p.photo!.id);

		// Backend doesn't accept empty arrays, so skip if no photos
		if (photoIds.length === 0) {
			return;
		}

		try {
			setIsReordering(true);
			await authenticatedRequest(
				`/albums/${album.id}/reorder`,
				{
					method: 'POST',
					body: JSON.stringify({ photo_ids: photoIds }),
				},
				() => {
					router.push('/login');
				}
			);
			// Don't refresh - state is already updated, just sync positions
			// Update positions in local state to match backend, but preserve empty pages
			const updatedPages = pageList.map((page, idx) => {
				if (page.photo) {
					const photoIndex = photoIds.findIndex(id => id === page.photo!.id);
					return {
						...page,
						position: photoIndex !== -1 ? photoIndex + 1 : page.position,
					};
				}
				return page;
			});

			// Ensure there's always an empty page at the end
			const hasEmptyPage = updatedPages.some((p, idx) => !p.photo && idx === updatedPages.length - 1);
			if (!hasEmptyPage) {
				const maxPosition = Math.max(...updatedPages.map(p => p.position), 0);
				updatedPages.push({ position: maxPosition + 1 });
			}

			setPages(updatedPages);
		} catch (err) {
			console.error('Failed to reorder:', err);
			// Only refresh on error to restore state
			await fetchAlbum();
			alert(err instanceof Error ? err.message : 'Failed to save changes');
		} finally {
			setIsReordering(false);
		}
	};

	const handlePageClick = (index: number) => {
		setCurrentPageIndex(index);
	};

	const handlePreviousPage = () => {
		if (currentPageIndex > 0) {
			setCurrentPageIndex(currentPageIndex - 1);
		}
	};

	const handleNextPage = () => {
		if (currentPageIndex < pages.length - 1) {
			setCurrentPageIndex(currentPageIndex + 1);
		}
	};

	const handleRemovePhoto = async (pageIndex: number) => {
		const newPages = [...pages];
		newPages[pageIndex].photo = undefined;

		// Ensure there's always an empty page at the end
		const hasEmptyPage = newPages.some((p, idx) => !p.photo && idx === newPages.length - 1);
		if (!hasEmptyPage) {
			const maxPosition = Math.max(...newPages.map(p => p.position), 0);
			newPages.push({ position: maxPosition + 1 });
		}

		setPages(newPages);
		// Persist in background without blocking
		persistReorder(newPages.filter(p => p.photo)).catch(console.error);
	};

	const handleFinalize = async () => {
		if (!album) return;

		try {
			setIsFinalizing(true);
			await authenticatedRequest(
				`/albums/${album.id}/finalize`,
				{
					method: 'POST',
				},
				() => {
					router.push('/login');
				}
			);
			setShowFinalizeConfirm(false);
			await fetchAlbum();
			alert('Album finalized successfully. Editor is now locked.');
		} catch (err) {
			console.error('Failed to finalize:', err);
			alert(err instanceof Error ? err.message : 'Failed to finalize album');
		} finally {
			setIsFinalizing(false);
		}
	};

	const handlePrint = async () => {
		if (!album || !shippingAddress.trim()) {
			alert('Please enter a shipping address');
			return;
		}

		try {
			setIsPrinting(true);
			await authenticatedRequest(
				'/print-orders',
				{
					method: 'POST',
					body: JSON.stringify({
						album_id: album.id,
						print_format: 'SQUARE_20x20',
						shipping_address: shippingAddress.trim(),
					}),
				},
				() => {
					router.push('/login');
				}
			);
			setShowPrintModal(false);
			setShippingAddress('');
			router.push(`/events/${eventId}/completed`);
		} catch (err) {
			console.error('Failed to create print order:', err);
			alert(err instanceof Error ? err.message : 'Failed to create print order');
		} finally {
			setIsPrinting(false);
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
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-gray-600'>Loading album...</div>
			</div>
		);
	}

	if (error || !album) {
		return (
			<div className='min-h-screen p-8'>
				<div className='max-w-4xl mx-auto'>
					<div className='text-red-600 mb-4'>{error || 'Album not found'}</div>
					<button
						onClick={() => router.push(`/events/${eventId}`)}
						className='px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50'>
						Back to Event
					</button>
				</div>
			</div>
		);
	}

	const isLocked = album.status === 'ready' || album.status === 'printed' || album.status === 'sent_to_print';
	const canPrint = album.status === 'ready';
	const currentPage = pages[currentPageIndex] || { position: 1 };

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}>
			<div className='min-h-screen flex flex-col bg-gray-50'>
				{/* Actions Header */}
				<div className='bg-white border-b border-gray-200 p-4'>
					<div className='max-w-6xl mx-auto flex justify-between items-center'>
						<div>
							<button
								onClick={() => router.push(`/events/${eventId}`)}
								className='text-blue-600 hover:text-blue-700 mb-2 text-sm'>
								← Back to Event
							</button>
							<div className='flex items-center gap-4'>
								<h1 className='text-xl font-semibold'>{album.title}</h1>
								{!isLocked && (
									<button
										onClick={() => router.push(`/events/${eventId}/photos`)}
										className='text-sm text-blue-600 hover:text-blue-700 underline'>
										Approve Photos
									</button>
								)}
							</div>
							<div>
								<p className='text-sm text-gray-600'>
									Status: <span className='capitalize'>{album.status}</span>
									{isLocked && <span className='ml-2 text-orange-600'>(Locked)</span>}
								</p>
								{canPrint && !pdfUrl && <p className='text-xs text-gray-500 mt-1'>PDF not ready yet</p>}
							</div>
						</div>
						<div className='flex gap-2'>
							{!isLocked && (
								<button
									onClick={() => setShowFinalizeConfirm(true)}
									disabled={pages.filter(p => p.photo).length === 0}
									className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'>
									Finalize Album
								</button>
							)}
							{canPrint && (
								<>
									<button
										onClick={() => {
											if (pdfUrl) {
												const fullUrl = pdfUrl.startsWith('http')
													? pdfUrl
													: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${pdfUrl}`;
												window.open(`${fullUrl}#zoom=100`, '_blank');
											}
										}}
										disabled={!pdfUrl}
										className='px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'>
										Preview Album (PDF)
									</button>
									{pdfUrl && (
										<a
											href={
												pdfUrl.startsWith('http')
													? pdfUrl
													: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${pdfUrl}`
											}
											download
											className='px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 inline-block text-center'>
											Download PDF
										</a>
									)}
									{!pdfUrl && (
										<button
											disabled
											className='px-4 py-2 border border-gray-300 text-gray-700 rounded-md opacity-50 cursor-not-allowed'>
											Download PDF
										</button>
									)}
									<button
										onClick={() => setShowPrintModal(true)}
										className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'>
										Print Album
									</button>
								</>
							)}
						</div>
					</div>
				</div>

				{showFinalizeConfirm && (
					<div className='bg-yellow-50 border-b border-yellow-200 p-4'>
						<div className='max-w-6xl mx-auto'>
							<p className='text-yellow-800 mb-3'>
								Are you sure you want to finalize this album? This will lock all edits and cannot be undone.
							</p>
							<div className='flex gap-2'>
								<button
									onClick={handleFinalize}
									disabled={isFinalizing}
									className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50'>
									{isFinalizing ? 'Finalizing...' : 'Yes, Finalize'}
								</button>
								<button
									onClick={() => setShowFinalizeConfirm(false)}
									disabled={isFinalizing}
									className='px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50'>
									Cancel
								</button>
							</div>
						</div>
					</div>
				)}

				{showPrintModal && (
					<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
						<div className='bg-white rounded-lg max-w-lg w-full p-6'>
							<h2 className='text-xl font-semibold mb-4'>Print Album</h2>
							<p className='text-red-600 mb-4 font-medium'>
								This action is irreversible. Once you confirm, the album will be sent to print and cannot be modified.
							</p>
							<div className='space-y-4 mb-6'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Album Title</label>
									<p className='text-gray-900'>{album?.title}</p>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Event</label>
									<p className='text-gray-900'>{event?.title || 'Loading...'}</p>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Print Format</label>
									<p className='text-gray-900'>Square 20×20 cm</p>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Shipping Address <span className='text-red-600'>*</span>
									</label>
									<textarea
										value={shippingAddress}
										onChange={e => setShippingAddress(e.target.value)}
										placeholder='Enter full shipping address...'
										rows={4}
										className='w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
									/>
								</div>
							</div>
							<div className='flex gap-2 justify-end'>
								<button
									onClick={() => {
										setShowPrintModal(false);
										setShippingAddress('');
									}}
									disabled={isPrinting}
									className='px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50'>
									Cancel
								</button>
								<button
									onClick={handlePrint}
									disabled={isPrinting || !shippingAddress.trim()}
									className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'>
									{isPrinting ? 'Processing...' : 'Confirm & Print'}
								</button>
							</div>
						</div>
					</div>
				)}

				{isReordering && (
					<div className='bg-blue-50 border-b border-blue-200 p-2 text-center text-sm text-blue-800'>
						Saving changes...
					</div>
				)}

				{/* Book Preview - Center */}
				<div className='flex-1 flex items-center justify-center p-8'>
					<div className='max-w-2xl w-full'>
						<div className='aspect-square max-w-lg mx-auto'>
							<BookPage
								page={currentPage}
								pageNumber={currentPage.position}
								isActive={true}
								onClick={() => {}}
								onRemovePhoto={() => handleRemovePhoto(currentPageIndex)}
								isLocked={isLocked}
							/>
						</div>

						{/* Page Navigation */}
						<div className='flex justify-between items-center mt-6'>
							<button
								onClick={handlePreviousPage}
								disabled={currentPageIndex === 0 || isLocked}
								className='px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'>
								← Previous
							</button>
							<div className='text-sm text-gray-600'>
								Page {currentPageIndex + 1} of {pages.length}
							</div>
							<button
								onClick={handleNextPage}
								disabled={currentPageIndex === pages.length - 1 || isLocked}
								className='px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'>
								Next →
							</button>
						</div>

						{/* Page Thumbnails */}
						<div className='mt-6'>
							<div className='flex gap-2 justify-center overflow-x-auto pb-2'>
								<SortableContext items={pages.map(p => `page-${p.position}`)} strategy={horizontalListSortingStrategy}>
									{pages.map((page, index) => (
										<PageThumbnail
											key={page.position}
											page={page}
											pageNumber={page.position}
											isActive={index === currentPageIndex}
											onClick={() => handlePageClick(index)}
											isLocked={isLocked}
										/>
									))}
								</SortableContext>
								{!isLocked && (
									<PageListEnd
										pages={pages}
										setPages={setPages}
										persistReorder={persistReorder}
										approvedPhotos={approvedPhotos}
									/>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Photo Tray - Bottom */}
				<PhotoTray photos={approvedPhotos} pages={pages} isLocked={isLocked} />

				<DragOverlay>
					{activeId ? (
						<div className='w-24 h-24 rounded overflow-hidden border-2 border-blue-500 opacity-90'>
							{activeId.toString().startsWith('photo-') && (
								<img
									src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${
										approvedPhotos.find(p => `photo-${p.id}` === activeId)?.file_url
									}`}
									alt='Dragging'
									className='w-full h-full object-cover'
								/>
							)}
							{activeId.toString().startsWith('page-photo-') &&
								(() => {
									const match = activeId.toString().match(/page-photo-([^-]+)-(\d+)/);
									if (!match) return null;
									const photoId = match[1];
									const page = pages.find(p => p.photo?.id === photoId);
									return page?.photo ? (
										<img
											src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${page.photo.file_url}`}
											alt='Dragging'
											className='w-full h-full object-cover'
										/>
									) : null;
								})()}
						</div>
					) : null}
				</DragOverlay>
			</div>
		</DndContext>
	);
}
