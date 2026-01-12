import axios from 'axios';

export interface Book {
    id: string;
    volumeInfo: {
        title: string;
        authors?: string[];
        publishedDate?: string;
        description?: string;
        imageLinks?: {
            thumbnail?: string;
        };
    };
}

export interface SearchBooksResponse {
    items?: Book[];
    totalItems: number;
}

let searchAbortController: AbortController | null = null;

/**
 * Searches for books using the searchBooks Firebase Function.
 * Handles debouncing and request cancellation via AbortController.
 */
export async function searchBooks(q: string, maxResults = 10, startIndex = 0): Promise<Book[]> {
    if (searchAbortController) {
        searchAbortController.abort();
    }
    searchAbortController = new AbortController();

    try {
        const baseUrl = 'https://us-central1-top-x-co.cloudfunctions.net/searchBooks';
        const response = await axios.get<SearchBooksResponse>(baseUrl, {
            params: { q, maxResults, startIndex },
            signal: searchAbortController.signal,
        });

        return response.data.items || [];
    } catch (error: any) {
        if (axios.isCancel(error)) {
            return [];
        }
        console.error('Search books error:', error);
        throw error;
    }
}
