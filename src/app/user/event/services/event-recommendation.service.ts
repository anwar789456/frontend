import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecommendedEvent } from '../models/event.model';
import { EventRegistration } from '../models/event-registration.model';
import { Event } from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class EventRecommendationService {
    private readonly apiUrl = 'https://minolingo.online/api/events';
    private readonly ollamaUrl = 'https://minolingo.online/ollama/v1/completions';

    constructor(private http: HttpClient) {}

    /**
     * AI-powered recommendations using self-hosted Ollama (qwen2.5:3b):
     * 1. Fetch user history + upcoming events from backend
     * 2. Dynamically calculate how many to recommend based on pool size
     * 3. Call Ollama with extended thinking tokens
     * 4. Deduplicate, validate, and return ranked resultsss
     */
    getRecommendations(userId: number): Observable<RecommendedEvent[]> {
        return new Observable(observer => {
            Promise.all([
                this.http.get<EventRegistration[]>(`${this.apiUrl}/registrations/get-by-user/${userId}`).toPromise().catch(() => [] as EventRegistration[]),
                this.http.get<Event[]>(`${this.apiUrl}/get-all-events`).toPromise().catch(() => [] as Event[])
            ]).then(([registrations, allEvents]) => {
                const regs = registrations || [];
                const events = allEvents || [];

                // Filter: only UPCOMING events not already registered for
                const registeredIds = new Set(regs.map((r: EventRegistration) => r.eventId).filter(Boolean));
                const candidates = events.filter((e: Event) => e.status === 'UPCOMING' && !registeredIds.has(e.id));

                if (candidates.length === 0) {
                    observer.next([]);
                    observer.complete();
                    return;
                }

                // ─── Smart Limit: recommend fewer when pool is small ───
                const limit = this.calculateLimit(candidates.length);

                // ─── Build user profile by cross-referencing registrations with full event data ───
                const allEventMap = new Map(events.map((e: Event) => [e.id, e]));
                const registeredEvents: Event[] = regs
                    .map((r: EventRegistration) => {
                        const eid = r.eventId || r.event?.id;
                        return eid ? allEventMap.get(eid) : undefined;
                    })
                    .filter((e): e is Event => !!e);

                const pastCategories = [...new Set(registeredEvents.map(e => e.category).filter(Boolean))];
                const pastLevels = [...new Set(registeredEvents.map(e => e.targetLevel).filter(Boolean))];
                const pastSkills = [...new Set(registeredEvents.map(e => e.skillFocus).filter(Boolean))];
                const pastTitles = registeredEvents.map(e => e.title).filter(Boolean);

                let userProfile: string;
                if (registeredEvents.length === 0) {
                    userProfile = 'New user with no event history. Recommend the most accessible and diverse events.';
                } else {
                    userProfile = [
                        `Attended ${registeredEvents.length} event(s): ${pastTitles.join(', ')}`,
                        pastCategories.length > 0 ? `Preferred categories: ${pastCategories.join(', ')}` : '',
                        pastLevels.length > 0 ? `User's level: ${pastLevels.join(', ')}` : '',
                        pastSkills.length > 0 ? `Practiced skills: ${pastSkills.join(', ')}` : ''
                    ].filter(Boolean).join('\n');
                }

                // ─── Build simplified event list ───
                const eventsSummary = candidates.slice(0, 15).map((e: Event) => ({
                    id: e.id,
                    title: e.title,
                    category: e.category || 'General',
                    targetLevel: e.targetLevel || 'ALL_LEVELS',
                    skillFocus: e.skillFocus || 'General',
                    description: e.description ? e.description.substring(0, 80) : ''
                }));

                // ─── Build strict prompt for high accuracy ───
                const prompt = `You are an expert event recommendation engine for MiNoLingo, a language learning platform.

TASK: Analyze the user profile and select exactly ${limit} event(s) from the list below that best match the user.

USER PROFILE:
${userProfile}

AVAILABLE EVENTS:
${JSON.stringify(eventsSummary, null, 2)}

SCORING RULES:
- Score 85-100: Strong match (category, level, or skill directly aligns with user history)
- Score 70-84: Good match (related category or suitable level progression)
- Score 50-69: Moderate match (general relevance or good for exploration)
- For new users with no history: score based on accessibility and beginner-friendliness (ALL_LEVELS gets 80+, BEGINNER gets 75+)
- Never score below 50 — if an event is recommended, it should be genuinely relevant

STRICT RULES:
- Recommend exactly ${limit} event(s), no more, no less
- Each event ID must appear ONLY ONCE — absolutely no duplicates
- Only use event IDs from the list above
- Write a specific, personal reason that references the event's actual content
- Do NOT mention generic phrases like "might be interesting"

Respond with ONLY a raw JSON array. No markdown, no explanation, no code fences:
[{"eventId": <number>, "score": <50-100>, "reason": "<specific 1-sentence reason>"}]`;

                console.log(`[AI] Calling Ollama — ${candidates.length} candidates, recommending ${limit}`);

                // ─── Call Ollama with extended tokens ───
                this.http.post<any>(this.ollamaUrl, {
                    model: 'qwen2.5:3b',
                    prompt: prompt,
                    max_tokens: 1024,
                    temperature: 0.2,
                    top_p: 0.9,
                    stream: false
                }).toPromise().then(ollamaResp => {
                    console.log('[AI] Ollama responded');
                    try {
                        const rawText: string = ollamaResp?.choices?.[0]?.text || '';
                        console.log('[AI] Raw text:', rawText);

                        // ─── Extract JSON robustly ───
                        let json = rawText.trim();

                        // Remove markdown fences
                        json = json.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

                        // Find the JSON array
                        const arrStart = json.indexOf('[');
                        const arrEnd = json.lastIndexOf(']');
                        if (arrStart >= 0 && arrEnd > arrStart) {
                            json = json.substring(arrStart, arrEnd + 1);
                        }

                        const items: {eventId: number, score: number, reason: string}[] = JSON.parse(json);

                        // ─── DEDUPLICATION: strict, keep first occurrence ───
                        const seenIds = new Set<number>();
                        const uniqueItems = items.filter(item => {
                            if (!item.eventId || seenIds.has(item.eventId)) return false;
                            seenIds.add(item.eventId);
                            return true;
                        });

                        // ─── VALIDATION: only include events that actually exist and score >= 70 ───
                        const eventMap = new Map(candidates.map((e: Event) => [e.id, e]));
                        const results: RecommendedEvent[] = uniqueItems
                            .filter(item => eventMap.has(item.eventId) && item.score >= 70)
                            .slice(0, limit)
                            .map(item => ({
                                event: eventMap.get(item.eventId)!,
                                score: Math.min(100, Math.max(0, item.score)),  // Clamp 0-100
                                reason: (item.reason || 'Recommended based on your profile.').trim()
                            }));

                        console.log(`[AI] ✅ ${results.length} recommendations ready`);
                        observer.next(results.length > 0 ? results : this.fallback(candidates, limit));
                    } catch (parseErr) {
                        console.error('[AI] Parse error:', parseErr);
                        observer.next(this.fallback(candidates, limit));
                    }
                    observer.complete();
                }).catch((err) => {
                    console.error('[AI] Ollama error:', err?.status, err?.message);
                    observer.next(this.fallback(candidates, limit));
                    observer.complete();
                });

            }).catch(() => {
                observer.next([]);
                observer.complete();
            });
        });
    }

    /**
     * Smart limit: scale recommendations based on available event pool.
     *  1-2 events  → recommend 1
     *  3-5 events  → recommend 2
     *  6-9 events  → recommend 3
     *  10+ events  → recommend 4
     */
    private calculateLimit(totalCandidates: number): number {
        if (totalCandidates <= 2) return 1;
        if (totalCandidates <= 5) return 2;
        if (totalCandidates <= 9) return 3;
        return 4;
    }

    private fallback(candidates: Event[], limit: number): RecommendedEvent[] {
        return candidates.slice(0, limit).map(e => ({
            event: e,
            score: 0,
            reason: 'Upcoming event you might enjoy!'
        }));
    }
}
