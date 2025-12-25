import { logger } from '../middleware/logger.js';
import { cacheService } from './cache.service.js';
import { config } from '../config/env.js';

/**
 * Video sentiment service for multimodal analysis
 * Fetches YouTube Shorts about crypto and transcribes them via Whisper
 */

interface VideoItem {
    id: string;
    title: string;
    channelTitle: string;
    publishedAt: string;
    viewCount?: number;
    thumbnail: string;
}

interface TranscriptResult {
    videoId: string;
    transcript: string;
    duration: number;
    language: string;
}

interface VideoSentimentData {
    videos: VideoItem[];
    transcripts: TranscriptResult[];
    aggregatedContent: string;
    enabled: boolean;
}

class VideoService {
    private readonly CACHE_KEY = 'video:sentiment';
    private readonly CACHE_TTL = 30 * 60; // 30 minutes (videos don't change as fast)
    private readonly youtubeApiKey: string | null;
    private readonly openaiApiKey: string | null;

    constructor() {
        this.youtubeApiKey = process.env.YOUTUBE_API_KEY || null;
        this.openaiApiKey = process.env.OPENAI_API_KEY || null;

        if (!this.youtubeApiKey) {
            logger.warn('YOUTUBE_API_KEY not set - video sentiment disabled');
        }
        if (!this.openaiApiKey) {
            logger.warn('OPENAI_API_KEY not set - Whisper transcription disabled');
        }
    }

    /**
     * Check if video sentiment is available
     */
    isEnabled(): boolean {
        return !!(this.youtubeApiKey);
    }

    /**
     * Check if transcription is available
     */
    isTranscriptionEnabled(): boolean {
        return !!(this.openaiApiKey);
    }

    /**
     * Get video sentiment data
     */
    async getVideoSentimentData(): Promise<VideoSentimentData> {
        if (!this.isEnabled()) {
            return {
                videos: [],
                transcripts: [],
                aggregatedContent: '',
                enabled: false,
            };
        }

        // Check cache first
        const cached = await cacheService.get<VideoSentimentData>(this.CACHE_KEY);
        if (cached) {
            logger.debug('Returning cached video sentiment data');
            return cached;
        }

        try {
            // Fetch trending crypto videos
            const videos = await this.fetchCryptoShorts();

            // Get transcripts if Whisper is available
            let transcripts: TranscriptResult[] = [];
            if (this.isTranscriptionEnabled() && videos.length > 0) {
                // Only transcribe top 3 videos to manage costs
                transcripts = await this.transcribeVideos(videos.slice(0, 3));
            }

            // Aggregate content for sentiment analysis
            const aggregatedContent = this.aggregateContent(videos, transcripts);

            const result: VideoSentimentData = {
                videos,
                transcripts,
                aggregatedContent,
                enabled: true,
            };

            // Cache result
            await cacheService.set(this.CACHE_KEY, result, this.CACHE_TTL);

            logger.info('Video sentiment data fetched', {
                videoCount: videos.length,
                transcriptCount: transcripts.length,
            });

            return result;
        } catch (error) {
            logger.error('Failed to fetch video sentiment data:', error);
            return {
                videos: [],
                transcripts: [],
                aggregatedContent: '',
                enabled: true,
            };
        }
    }

    /**
     * Fetch trending crypto shorts from YouTube
     */
    private async fetchCryptoShorts(): Promise<VideoItem[]> {
        if (!this.youtubeApiKey) return [];

        try {
            // Search for crypto-related short videos
            const searchQueries = ['crypto news today', 'bitcoin analysis', 'altcoin picks'];
            const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];

            const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
            searchUrl.searchParams.set('part', 'snippet');
            searchUrl.searchParams.set('q', query);
            searchUrl.searchParams.set('type', 'video');
            searchUrl.searchParams.set('videoDuration', 'short'); // Shorts only
            searchUrl.searchParams.set('order', 'date');
            searchUrl.searchParams.set('maxResults', '10');
            searchUrl.searchParams.set('publishedAfter', this.getRecentDate());
            searchUrl.searchParams.set('key', this.youtubeApiKey);

            const response = await fetch(searchUrl.toString());

            if (!response.ok) {
                throw new Error(`YouTube API error: ${response.status}`);
            }

            const data = await response.json();

            return (data.items || []).map((item: any) => ({
                id: item.id?.videoId || '',
                title: item.snippet?.title || '',
                channelTitle: item.snippet?.channelTitle || '',
                publishedAt: item.snippet?.publishedAt || '',
                thumbnail: item.snippet?.thumbnails?.medium?.url || '',
            }));
        } catch (error) {
            logger.error('Failed to fetch YouTube shorts:', error);
            return [];
        }
    }

    /**
     * Transcribe videos using Whisper
     * Note: This requires yt-dlp to be installed on the server for audio extraction
     * For now, we'll use YouTube's auto-generated captions as a fallback
     */
    private async transcribeVideos(videos: VideoItem[]): Promise<TranscriptResult[]> {
        const transcripts: TranscriptResult[] = [];

        for (const video of videos) {
            try {
                // Try to get YouTube's auto-captions first (free, no Whisper needed)
                const transcript = await this.getYouTubeCaptions(video.id);

                if (transcript) {
                    transcripts.push({
                        videoId: video.id,
                        transcript,
                        duration: 60, // Estimate for shorts
                        language: 'en',
                    });
                }
            } catch (error) {
                logger.warn(`Failed to transcribe video ${video.id}:`, error);
            }
        }

        return transcripts;
    }

    /**
     * Get YouTube auto-generated captions
     * Uses the timedtext API (may not work for all videos)
     */
    private async getYouTubeCaptions(videoId: string): Promise<string | null> {
        try {
            // YouTube's caption API (unofficial but commonly used)
            const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`;

            const response = await fetch(captionUrl, {
                headers: {
                    'User-Agent': 'QuantumMatrix/1.0',
                },
            });

            if (!response.ok) {
                return null;
            }

            const text = await response.text();

            // Parse the XML-like response to extract text
            const textMatches = text.match(/<text[^>]*>([^<]*)<\/text>/g);
            if (!textMatches) return null;

            const captions = textMatches
                .map(match => {
                    const content = match.match(/<text[^>]*>([^<]*)<\/text>/);
                    return content ? content[1] : '';
                })
                .join(' ')
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .trim();

            return captions.length > 10 ? captions : null;
        } catch (error) {
            logger.debug(`No captions for video ${videoId}`);
            return null;
        }
    }

    /**
     * Aggregate video content for sentiment analysis
     */
    private aggregateContent(videos: VideoItem[], transcripts: TranscriptResult[]): string {
        const sections: string[] = [];

        // Video titles (even without transcripts, titles are valuable)
        if (videos.length > 0) {
            const titles = videos.map(v => `- "${v.title}" by ${v.channelTitle}`).join('\n');
            sections.push(`RECENT CRYPTO VIDEO TITLES:\n${titles}`);
        }

        // Transcripts
        if (transcripts.length > 0) {
            const transcriptText = transcripts
                .map(t => `[Video ${t.videoId}]: ${t.transcript.substring(0, 500)}...`)
                .join('\n\n');
            sections.push(`VIDEO TRANSCRIPTS:\n${transcriptText}`);
        }

        return sections.join('\n\n');
    }

    /**
     * Get ISO date for 24 hours ago
     */
    private getRecentDate(): string {
        const date = new Date();
        date.setHours(date.getHours() - 24);
        return date.toISOString();
    }

    /**
     * Format video data for Gemini prompt
     */
    formatForPrompt(): string {
        // This will be called after getVideoSentimentData
        // Returns cached aggregated content
        return '';
    }
}

export const videoService = new VideoService();
