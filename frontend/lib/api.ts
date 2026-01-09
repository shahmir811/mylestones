const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export interface ApiError {
	error: string;
	missingFields?: string[];
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const url = `${API_BASE_URL}${endpoint}`;

	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.error || 'Request failed');
	}

	return data;
}

export async function authenticatedRequest<T>(
	endpoint: string,
	options: RequestInit = {},
	onUnauthorized?: () => void
): Promise<T> {
	const { getToken, removeToken } = await import('./auth');
	const token = getToken();

	if (!token) {
		if (onUnauthorized) {
			onUnauthorized();
		}
		throw new Error('Authentication required');
	}

	const url = `${API_BASE_URL}${endpoint}`;

	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			...options.headers,
		},
	});

	const data = await response.json();

	if (response.status === 401) {
		removeToken();
		if (onUnauthorized) {
			onUnauthorized();
		}
		throw new Error(data.error || 'Authentication failed');
	}

	if (!response.ok) {
		throw new Error(data.error || 'Request failed');
	}

	return data;
}
