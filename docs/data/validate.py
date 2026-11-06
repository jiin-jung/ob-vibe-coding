"""Structural and publication-gate validation, not source truth verification."""
import hashlib
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8-sig'))

def validate():
    facts, sources, rules = read('data/facts.json'), read('data/sources.json'), read('data/approved-rules.json')
    ids = [x['id'] for x in facts]
    assert len(ids) == len(set(ids)), 'Duplicate fact IDs'
    sids = [x['id'] for x in sources]
    assert len(sids) == len(set(sids)), 'Duplicate source IDs'
    for s in sources:
        assert s['url'].startswith('https://'), s['id']
    for f in facts:
        assert f['research_status'] in ('verified', 'conditional', 'unverified', 'conflicting'), f['id']
        assert f['review_status'] in ('pending', 'approved', 'rejected'), f['id']
        assert f['source_id'] is None or f['source_id'] in sids, f['id']
        date.fromisoformat(f['checked_at'])
        for k in ('conditions', 'exceptions'):
            assert isinstance(f[k], list) and all(isinstance(v, str) for v in f[k]), f['id']
        assert '\ufffd' not in json.dumps(f, ensure_ascii=False), 'Broken text: ' + f['id']
        if f['research_status'] == 'verified':
            assert f['source_id'] and f['statement'] and f['evidence']['quote'], f['id']
        if f['publish_enabled'] or f['rule_execution_enabled']:
            assert f['review_status'] == 'approved' and f['research_status'] not in ('unverified', 'conflicting'), f['id']
    # No executable logic has been approved in this research snapshot.
    assert rules == [], 'Executable rules require a separately reviewed contract'
    example = read('examples/game-event.example.json')
    assert example['is_example'] and not example['publish_enabled']
    assert all(x in ids for x in example['fact_ids'])
    manifest = read('manifest.json')
    assert manifest['record_count'] == len(facts)
    assert manifest['source_count'] == len(sources)
    for name, checksum in read('checksums.json').items():
        assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == checksum, name
    print(f'OK: {len(facts)} facts, {len(sources)} sources; references, dates, gates and checksums passed')

if __name__ == '__main__':
    validate()
