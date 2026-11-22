import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import initSqlJs from 'sql.js';

const ROOT = process.cwd();
const ROLES_DIR = join(ROOT, 'data', 'roles');
const QUESTIONS_DIR = join(ROOT, 'data', 'questions');
const DATASETS_DIR = join(ROOT, 'data', 'datasets');
const SCHEMAS_DIR = join(ROOT, 'data', 'schemas');

const OBFUSCATION_SALT = 'IX-STATIC-KEY-V1';
const NEAR_DUPLICATE_THRESHOLD = 0.78;

function deobfuscateText(encoded, salt = OBFUSCATION_SALT) {
  const buf = Buffer.from(encoded, 'base64');
  const key = Buffer.from(salt, 'utf-8');
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i += 1) {
    out[i] = buf[i] ^ key[i % key.length];
  }
  return out.toString('utf-8');
}

function hashAnswerKey(questionId, value) {
  const normalized = Array.isArray(value)
    ? [...value].map((v) => v.trim().toLowerCase()).sort().join(',')
    : String(value).trim().toLowerCase();
  return createHash('sha256').update(`${questionId}::${normalized}`).digest('hex');
}

function computeTopicQuotas(sections, totalQuestions) {
  const raw = sections.map((s) => {
    const exact = s.weight * totalQuestions;
    return {
      topic: s.topic,
      weight: s.weight,
      floor: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  let assigned = raw.reduce((acc, r) => acc + r.floor, 0);
  const byRemainder = [...raw].sort((a, b) => b.remainder - a.remainder);
  let idx = 0;
  while (assigned < totalQuestions && byRemainder.length > 0) {
    byRemainder[idx % byRemainder.length].floor += 1;
    assigned += 1;
    idx += 1;
  }
  return raw.map((r) => ({ topic: r.topic, weight: r.weight, count: r.floor }));
}

function tokenize(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalizeSqlResult(columns, rows, orderMatters) {
  const normCols = columns.map((c) => String(c).toLowerCase());
  const normRows = rows.map((row) =>
    row.map((cell) => (typeof cell === 'number' ? Math.round(cell * 100) / 100 : cell)),
  );
  if (!orderMatters) {
    normRows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return { columns: normCols, rows: normRows };
}

async function main() {
  const errors = [];
  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });

  const roleSchema = JSON.parse(readFileSync(join(SCHEMAS_DIR, 'role-profile.schema.json'), 'utf-8'));
  const bankSchema = JSON.parse(readFileSync(join(SCHEMAS_DIR, 'question-bank.schema.json'), 'utf-8'));
  const validateRole = ajv.compile(roleSchema);
  const validateBank = ajv.compile(bankSchema);

  const SQL = await initSqlJs();
  const datasets = new Map();
  for (const file of readdirSync(DATASETS_DIR).filter((f) => f.endsWith('.sql'))) {
    const id = file.replace(/\.sql$/, '');
    datasets.set(id, readFileSync(join(DATASETS_DIR, file), 'utf-8'));
  }

  const roleFiles = readdirSync(ROLES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
  if (roleFiles.length !== 7) {
    errors.push(`Expected 7 role profiles in data/roles/, found ${roleFiles.length}.`);
  }

  const profiles = new Map();
  for (const file of roleFiles) {
    const profile = JSON.parse(readFileSync(join(ROLES_DIR, file), 'utf-8'));
    if (!validateRole(profile)) {
      errors.push(`Schema error in data/roles/${file}: ${ajv.errorsText(validateRole.errors)}`);
      continue;
    }
    const weightSum = profile.sections.reduce((acc, s) => acc + s.weight, 0);
    if (Math.abs(weightSum - 1.0) > 1e-6) {
      errors.push(`Role ${profile.id}: section weights sum to ${weightSum.toFixed(6)} (must equal 1.0).`);
    }
    profiles.set(profile.id, profile);
  }

  const globalIds = new Set();
  const allPrompts = [];
  const coverageRows = [];
  let totalQuestions = 0;
  let verifiedSqlCount = 0;

  for (const [roleId, profile] of profiles.entries()) {
    const bankPath = join(QUESTIONS_DIR, `${roleId}.json`);
    let bank;
    try {
      bank = JSON.parse(readFileSync(bankPath, 'utf-8'));
    } catch (err) {
      errors.push(`Missing or invalid JSON for data/questions/${roleId}.json: ${err.message}`);
      continue;
    }

    if (!validateBank(bank)) {
      errors.push(`Schema error in data/questions/${roleId}.json: ${ajv.errorsText(validateBank.errors)}`);
      continue;
    }

    if (bank.roleId !== roleId) {
      errors.push(`Bank roleId "${bank.roleId}" does not match filename "${roleId}.json".`);
    }

    const validTopics = new Set(profile.sections.map((s) => s.topic));
    const validLevels = new Set(profile.levels.map((l) => l.id));

    for (const q of bank.questions) {
      totalQuestions += 1;
      if (globalIds.has(q.id)) {
        errors.push(`Duplicate question ID across bank: ${q.id}`);
      }
      globalIds.add(q.id);

      if (q.role !== roleId) {
        errors.push(`Question ${q.id} has role "${q.role}" inside "${roleId}.json".`);
      }
      if (!validTopics.has(q.topic)) {
        errors.push(`Question ${q.id} topic "${q.topic}" is not defined in role profile "${roleId}".`);
      }
      for (const lvl of q.levels) {
        if (!validLevels.has(lvl)) {
          errors.push(`Question ${q.id} references unknown level "${lvl}" for role "${roleId}".`);
        }
      }

      const rubricSum = q.rubric.reduce((acc, r) => acc + r.weight, 0);
      if (Math.abs(rubricSum - 1.0) > 1e-4) {
        errors.push(`Question ${q.id} rubric weights sum to ${rubricSum.toFixed(4)} (must equal 1.0).`);
      }

      // Near-duplicate prompt detection
      const tokens = tokenize(q.prompt);
      for (const prev of allPrompts) {
        const sim = jaccard(tokens, prev.tokens);
        if (sim >= NEAR_DUPLICATE_THRESHOLD) {
          errors.push(
            `Near-duplicate prompts (${(sim * 100).toFixed(1)}%): "${q.id}" and "${prev.id}".`,
          );
        }
      }
      allPrompts.push({ id: q.id, tokens });

      // Type-specific validation
      if (q.type === 'mcq' || q.type === 'multi') {
        if (!Array.isArray(q.options) || q.options.length < 4) {
          errors.push(`Question ${q.id} (${q.type}) must have at least 4 options.`);
        } else {
          const optIds = new Set(q.options.map((o) => o.id));
          if (optIds.size !== q.options.length) {
            errors.push(`Question ${q.id} has duplicate option IDs.`);
          }
          if (!q.answerHash || !q.answerObfuscated) {
            errors.push(`Question ${q.id} must have answerHash and answerObfuscated.`);
          } else {
            const decoded = deobfuscateText(q.answerObfuscated);
            const keys = q.type === 'multi' ? decoded.split(',').map((s) => s.trim()) : [decoded.trim()];
            if (q.type === 'mcq' && keys.length !== 1) {
              errors.push(`MCQ ${q.id} must have exactly 1 correct answer, got ${keys.length}.`);
            }
            if (q.type === 'multi' && keys.length < 2) {
              errors.push(`Multi-select ${q.id} must have at least 2 correct answers.`);
            }
            for (const k of keys) {
              if (!optIds.has(k)) {
                errors.push(`Question ${q.id} answer key "${k}" is not in options.`);
              }
            }
            const recomputed = hashAnswerKey(q.id, q.type === 'multi' ? keys : keys[0]);
            if (recomputed !== q.answerHash) {
              errors.push(`Question ${q.id} answerHash does not match answerObfuscated.`);
            }
          }
        }
      } else if (q.type === 'sql') {
        if (!q.datasetId || !datasets.has(q.datasetId)) {
          errors.push(`SQL question ${q.id} references unknown dataset "${q.datasetId}".`);
        } else if (!q.referenceSqlObfuscated || !q.expectedResult) {
          errors.push(`SQL question ${q.id} missing referenceSqlObfuscated or expectedResult.`);
        } else {
          const db = new SQL.Database();
          try {
            db.run(datasets.get(q.datasetId));
            const refSql = deobfuscateText(q.referenceSqlObfuscated);
            const execRes = db.exec(refSql);
            if (!execRes || execRes.length === 0) {
              errors.push(`SQL question ${q.id} reference query returned no result set.`);
            } else {
              const last = execRes[execRes.length - 1];
              const actual = normalizeSqlResult(last.columns, last.values, q.expectedResult.orderMatters);
              const expected = normalizeSqlResult(
                q.expectedResult.columns,
                q.expectedResult.rows,
                q.expectedResult.orderMatters,
              );
              if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                errors.push(
                  `SQL question ${q.id} result mismatch.\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`,
                );
              } else {
                verifiedSqlCount += 1;
              }
            }
          } catch (err) {
            errors.push(`SQL question ${q.id} execution failed: ${err.message}`);
          } finally {
            db.close();
          }
        }
      } else if (q.type === 'code') {
        if (!q.functionName || !Array.isArray(q.testCases) || q.testCases.length < 2 || !q.referenceCodeObfuscated) {
          errors.push(`Code question ${q.id} missing functionName, testCases (>=2), or referenceCodeObfuscated.`);
        }
      } else if (q.type === 'scenario') {
        if (!Array.isArray(q.keyPoints) || q.keyPoints.length < 2) {
          errors.push(`Scenario question ${q.id} must define at least 2 keyPoints.`);
        }
      }
    }

    // Check 2x pool coverage for every level & topic
    for (const level of profile.levels) {
      const quotas = computeTopicQuotas(profile.sections, level.questionCount);
      for (const quota of quotas) {
        const poolCount = bank.questions.filter(
          (q) => q.topic === quota.topic && q.levels.includes(level.id),
        ).length;
        const requiredPool = quota.count * 2;
        coverageRows.push({
          role: roleId,
          level: level.id,
          topic: quota.topic,
          needed: quota.count,
          minPool2x: requiredPool,
          actualPool: poolCount,
          ok: poolCount >= requiredPool,
        });
        if (poolCount < requiredPool) {
          errors.push(
            `Pool too small for ${roleId}/${level.id} topic "${quota.topic}": has ${poolCount}, requires >= ${requiredPool} (2x quota of ${quota.count}).`,
          );
        }
      }
    }
  }

  // Print Coverage Report
  console.log('\n=== Question Bank Coverage Report (2x Pool Enforced) ===');
  console.log(
    'Role   | Level      | Topic                     | Quota | Min 2x | Pool | Status',
  );
  console.log(
    '-------+------------+---------------------------+-------+--------+------+-------',
  );
  for (const row of coverageRows) {
    console.log(
      `${row.role.padEnd(6)} | ${row.level.padEnd(10)} | ${row.topic.padEnd(25)} | ${String(row.needed).padStart(5)} | ${String(row.minPool2x).padStart(6)} | ${String(row.actualPool).padStart(4)} | ${row.ok ? 'PASS' : 'FAIL'}`,
    );
  }
  console.log('--------------------------------------------------------------------------------');
  console.log(`Total roles: ${profiles.size} | Total questions: ${totalQuestions} | Verified SQL tasks: ${verifiedSqlCount}`);
  console.log('================================================================================\n');

  if (errors.length > 0) {
    console.error(`FAIL: ${errors.length} question bank integrity error(s) found:\n`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('PASS: All role profiles, question banks, 2x pools, and SQL reference queries verified.');
}

main();
