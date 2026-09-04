'use client';

import { useSyncExternalStore } from 'react';
import { readSession, subscribeSessions } from './aiChatStore';
import { statusBusy } from './chatStatus';
import { readThreads, subscribeThreads, type ThreadPurpose } from './chatThreads';

const NONE = new Set<string>();
let cached: { key: string; subjects: Set<string> } = { key: '', subjects: NONE };

export function useWorkingSubjects(): Set<string> {
  return useSyncExternalStore(subscribe, readWorkingSubjects, () => NONE);
}

export function useWorkingPurpose(subject: string, purpose: ThreadPurpose): boolean {
  const isWorking = () => busyThreads().some((thread) => thread.subject === subject && thread.purpose === purpose);
  return useSyncExternalStore(subscribe, isWorking, () => false);
}

function busyThreads() {
  return readThreads().filter((thread) => statusBusy(readSession(thread.key)));
}

// Return the same Set while membership holds; a new one re-renders every notification.
function readWorkingSubjects(): Set<string> {
  const subjects = busyThreads().map((thread) => thread.subject);
  const key = subjects.join('\n');
  if (key !== cached.key) cached = { key, subjects: new Set(subjects) };
  return cached.subjects;
}

function subscribe(listener: () => void): () => void {
  const stops = [subscribeSessions(listener), subscribeThreads(listener)];
  return () => stops.forEach((stop) => stop());
}
