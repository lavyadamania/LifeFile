import { selectNextTokenId } from '../modules/queue/queue.service';

describe('Queue engine ordering', () => {
  it('picks higher emergency priority first', () => {
    const tokenId = selectNextTokenId([
      { id: 'normal-1', priorityScore: 0, createdAt: new Date('2026-04-24T10:00:00.000Z') },
      { id: 'emergency-low', priorityScore: 20, createdAt: new Date('2026-04-24T10:01:00.000Z') },
      { id: 'emergency-high', priorityScore: 80, createdAt: new Date('2026-04-24T10:02:00.000Z') }
    ]);

    expect(tokenId).toBe('emergency-high');
  });

  it('uses FIFO when all priorities are normal', () => {
    const tokenId = selectNextTokenId([
      { id: 'normal-first', priorityScore: 0, createdAt: new Date('2026-04-24T10:00:00.000Z') },
      { id: 'normal-second', priorityScore: 0, createdAt: new Date('2026-04-24T10:01:00.000Z') }
    ]);

    expect(tokenId).toBe('normal-first');
  });

  it('returns null when queue is empty', () => {
    expect(selectNextTokenId([])).toBeNull();
  });
});
