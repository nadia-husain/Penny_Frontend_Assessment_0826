import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';
import { CrApiService } from '../../api/cr-api.service'

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentInstance.id = id;
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
	return fixture;
}

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
	});

	it('renders the diff kind for each line item', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const rows = fixture.nativeElement.querySelectorAll('.cr-diff__row');
		const kinds = Array.from(rows).map((r: any) => r.getAttribute('data-kind'));
		expect(kinds).toEqual(['changed', 'unchanged']); // SKU-A qty 10→11, SKU-B unchanged
	});

	it('renders the timeline oldest-first regardless of the fixture\'s raw audit order', async () => {
		const fixture = await render(users.approver, 'CR-1');
		// CR-1's raw fixture audit is [SEND_FOR_APPROVAL, SUBMIT, CREATE] (newest-first) —
		// rendered oldest-first it should come back reversed.
		const actions = Array.from(fixture.nativeElement.querySelectorAll('.cr-timeline__action'))
		.map((el: Element) => el.textContent);
		expect(actions).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL']);
	});

	it('approves a pending CR when the user has an approve-scope policy', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');

		approveBtn.click();
		await flush();
		fixture.detectChanges();

		const status = fixture.nativeElement.querySelector('.cr-status');
		expect(status.getAttribute('data-status')).toBe('APPROVED');
		expect(fixture.nativeElement.querySelector('.cr-actions__error')).toBeNull();
	});

	it('shows an error and leaves the CR unchanged when approve fails', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const api = TestBed.inject(CrApiService);
		api.failNext = true;

		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		approveBtn.click();
		await flush();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-actions__error')).not.toBeNull();
		expect(fixture.componentInstance.detail?.status).toBe('PENDING_APPROVAL'); // unchanged on failure
		expect(fixture.componentInstance.submitting).toBe(false); // busy state cleared even on failure
	});

	it('does not render the Reject reason field for a CR that is not pending approval', async () => {
		const fixture = await render(users.approver, 'CR-2'); // CR-2 is APPLIED
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
	});

	it('shows a validation error and disables Reject when the reason is blank or whitespace-only', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.cr-actions__reason');
		const rejectBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__reject-btn');

		textarea.value = '   ';
		textarea.dispatchEvent(new Event('input'));
		textarea.dispatchEvent(new Event('blur')); // marks control as touched
		fixture.detectChanges();

		expect(rejectBtn.disabled).toBe(true);
		expect(fixture.nativeElement.querySelector('.cr-actions__reason-error')).not.toBeNull();
	});

	it('enables Reject once a non-blank reason is entered', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.cr-actions__reason');
		const rejectBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__reject-btn');

		textarea.value = 'Pricing is out of date';
		textarea.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(rejectBtn.disabled).toBe(false);
		expect(fixture.nativeElement.querySelector('.cr-actions__reason-error')).toBeNull();
	});

	it('rejects a pending CR with a valid reason and clears the field on success', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.cr-actions__reason');
		const rejectBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__reject-btn');

		textarea.value = 'Budget not approved';
		textarea.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		rejectBtn.click();
		await flush();
		fixture.detectChanges();

		const status = fixture.nativeElement.querySelector('.cr-status');
		expect(status.getAttribute('data-status')).toBe('REJECTED');
		expect(fixture.componentInstance.rejectControl.value).toBe('');
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull(); // form is gone, as expected
	});

	it('shows an error and leaves the CR unchanged when reject fails', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const api = TestBed.inject(CrApiService);
		api.failNext = true;

		const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.cr-actions__reason');
		const rejectBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__reject-btn');

		textarea.value = 'Budget not approved';
		textarea.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		rejectBtn.click();
		await flush();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-actions__error')).not.toBeNull();
		expect(fixture.componentInstance.detail?.status).toBe('PENDING_APPROVAL'); // unchanged on failure
		expect(fixture.componentInstance.rejectControl.value).toBe('Budget not approved'); // not reset on failure
	});
});
