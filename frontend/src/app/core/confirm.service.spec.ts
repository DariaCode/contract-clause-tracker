import { ConfirmService } from './confirm.service';

describe('ConfirmService', () => {
  it('exposes the pending request and resolves it on respond(true)', async () => {
    const svc = new ConfirmService();
    const answer = svc.ask({ title: 'Delete', message: 'Sure?' });

    expect(svc.pending()?.title).toBe('Delete');

    svc.respond(true);
    await expect(answer).resolves.toBe(true);
    expect(svc.pending()).toBeNull();
  });

  it('resolves false on respond(false)', async () => {
    const svc = new ConfirmService();
    const answer = svc.ask({ title: 'X', message: 'Y' });
    svc.respond(false);
    await expect(answer).resolves.toBe(false);
  });

  it('respond() is a no-op when nothing is pending', () => {
    const svc = new ConfirmService();
    expect(() => svc.respond(true)).not.toThrow();
    expect(svc.pending()).toBeNull();
  });
});
