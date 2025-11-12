// Lightweight custom reporter that logs each test result as NDJSON and a final summary JSON
import type { Reporter, Task, File } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function flattenTests(files: File[]): Task[] {
  const out: Task[] = [];
  const walk = (task: Task) => {
    if (task.type === 'test') out.push(task);
    if ('tasks' in task && task.tasks) task.tasks.forEach(walk);
  };
  files.forEach(walk);
  return out;
}

export default function ReporterFactory(): Reporter {
  const baseDir = path.join(process.cwd(), 'test-results');
  const ndjsonPath = path.join(baseDir, 'test-log.ndjson');
  const summaryPath = path.join(baseDir, 'summary.json');

  try { fs.mkdirSync(baseDir, { recursive: true }); } catch {}
  try { fs.writeFileSync(ndjsonPath, ''); } catch {}

  return {
    onTaskUpdate(updatedTasks) {
      for (const task of updatedTasks) {
        if (task.type !== 'test') continue;
        const state = task.result?.state ?? task.state;
        if (!state) continue;
        const record = {
          id: task.id,
          name: task.name,
          suite: task.suite?.name,
          file: task.file?.name,
          state,
          duration: task.result?.duration ?? 0,
          error: task.result?.error ? {
            name: task.result.error.name,
            message: task.result.error.message,
            stack: task.result.error.stack,
          } : undefined,
        };
        try { fs.appendFileSync(ndjsonPath, JSON.stringify(record) + '\n'); } catch {}
      }
    },
    onFinished(files) {
      const tests = flattenTests(files);
      // Write per-test NDJSON entries on finish as a fallback
      for (const t of tests) {
        const record = {
          id: t.id,
          name: t.name,
          suite: t.suite?.name,
          file: t.file?.name,
          state: t.result?.state ?? t.state,
          duration: t.result?.duration ?? 0,
          error: t.result?.error ? {
            name: t.result.error.name,
            message: t.result.error.message,
            stack: t.result.error.stack,
          } : undefined,
        };
        try { fs.appendFileSync(ndjsonPath, JSON.stringify(record) + '\n'); } catch {}
      }

      const summary = {
        total: tests.length,
        passed: tests.filter(t => (t.result?.state ?? t.state) === 'pass').length,
        failed: tests.filter(t => (t.result?.state ?? t.state) === 'fail').length,
        skipped: tests.filter(t => ['skip', 'todo'].includes((t.result?.state ?? t.state) as string)).length,
        duration: tests.reduce((acc, t) => acc + (t.result?.duration ?? 0), 0),
        generatedAt: new Date().toISOString(),
      };
      try { fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2)); } catch {}
    },
  };
}
