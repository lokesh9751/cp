import { config } from '../config/env.js';

// Judge0 CE standard language IDs
export const LANGUAGE_MAP = {
  cpp: { id: 54, label: 'C++ (GCC 9.2.0)' },        // 105 if GCC 14 on newer CE
  python: { id: 71, label: 'Python (3.8.1)' },      // 92 if Python 3.11
  java: { id: 62, label: 'Java (OpenJDK 13.0.1)' },
  javascript: { id: 63, label: 'JavaScript (Node.js 12.14.0)' },
};

export function normalizeOutput(str = '') {
  return String(str)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();
}

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (config.judge0ApiKey) {
    headers['X-RapidAPI-Key'] = config.judge0ApiKey;
  }
  if (config.judge0ApiHost) {
    headers['X-RapidAPI-Host'] = config.judge0ApiHost;
  }
  return headers;
}

function mapJudge0Result(data, expectedOutput = null) {
  const statusId = data?.status?.id;
  const stdoutRaw = data?.stdout || '';
  const stderrRaw = data?.stderr || '';
  const compileOutputRaw = data?.compile_output || '';
  const messageRaw = data?.message || '';
  const runtimeMs = data?.time != null ? Math.round(parseFloat(data.time) * 1000) : null;
  const memoryKb = data?.memory != null ? Number(data.memory) : null;

  // 6 = Compilation Error
  if (statusId === 6) {
    return {
      verdict: 'COMPILATION_ERROR',
      stdout: stdoutRaw,
      errorOutput: compileOutputRaw || stderrRaw || messageRaw || 'Compilation failed',
      runtimeMs,
      memoryKb,
    };
  }

  // 3 = Accepted execution by sandbox
  if (statusId === 3) {
    if (expectedOutput !== null && expectedOutput !== undefined) {
      const actualNorm = normalizeOutput(stdoutRaw);
      const expectedNorm = normalizeOutput(expectedOutput);
      const isMatch = actualNorm === expectedNorm;

      return {
        verdict: isMatch ? 'ACCEPTED' : 'WRONG_ANSWER',
        stdout: stdoutRaw,
        errorOutput: null,
        runtimeMs,
        memoryKb,
      };
    }

    return {
      verdict: 'EXECUTED',
      stdout: stdoutRaw,
      errorOutput: null,
      runtimeMs,
      memoryKb,
    };
  }

  // 5 = Time Limit Exceeded
  if (statusId === 5) {
    return {
      verdict: 'TIME_LIMIT_EXCEEDED',
      stdout: stdoutRaw,
      errorOutput: 'Time limit exceeded',
      runtimeMs,
      memoryKb,
    };
  }

  // 7..12 = Runtime Errors (NZEC, Segfault, etc.) or 13 = Internal Error
  if (statusId === 13 || statusId === 14) {
    return {
      verdict: 'RUNTIME_ERROR',
      stdout: stdoutRaw,
      errorOutput: messageRaw || 'Judge execution error',
      runtimeMs,
      memoryKb,
    };
  }

  // Default for runtime error status IDs (7-12)
  return {
    verdict: 'RUNTIME_ERROR',
    stdout: stdoutRaw,
    errorOutput: stderrRaw || messageRaw || data?.status?.description || 'Runtime error',
    runtimeMs,
    memoryKb,
  };
}

/**
 * Execute code against a single stdin via Judge0 CE
 */
export async function executeSingle({
  language,
  code,
  stdin = '',
  expectedOutput = null,
  timeLimitMs = 2000,
  memoryLimitKb = 262144,
}) {
  const langConfig = LANGUAGE_MAP[language];
  if (!langConfig) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const baseUrl = config.judge0ApiUrl.replace(/\/+$/, '');
  const endpoint = `${baseUrl}/submissions?base64_encoded=false&wait=true`;

  const cpuTimeLimitSec = Math.max(0.5, Number((timeLimitMs / 1000).toFixed(2)));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        language_id: langConfig.id,
        source_code: code,
        stdin,
        cpu_time_limit: cpuTimeLimitSec,
        memory_limit: memoryLimitKb,
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.message || data?.error || `Judge0 HTTP ${response.status}`;
      const err = new Error(msg);
      err.status = response.status === 429 ? 429 : 502;
      throw err;
    }

    return mapJudge0Result(data, expectedOutput);
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Judge execution timed out waiting for response');
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}