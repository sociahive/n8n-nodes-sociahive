import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type SociahiveContext = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

export const DEFAULT_BASE_URL = 'https://www.sociahive.com/api/v1';

async function getBaseUrl(this: SociahiveContext): Promise<string> {
	const credentials = await this.getCredentials('sociahiveApi');
	const baseUrl = (credentials.baseUrl as string | undefined) || DEFAULT_BASE_URL;
	return baseUrl.replace(/\/+$/, '');
}

/**
 * One request to the SociaHive v1 API with the stored API key
 * (`X-API-Key`, added by the credential).
 */
export async function sociahiveApiRequest(
	this: SociahiveContext,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${await getBaseUrl.call(this)}${path}`,
		json: true,
	};
	if (body !== undefined) options.body = body;
	if (qs !== undefined && Object.keys(qs).length > 0) options.qs = qs;

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'sociahiveApi',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/** The connected accounts of the key's owner (`GET /connected-accounts`). */
export async function listConnectedAccounts(this: SociahiveContext): Promise<IDataObject[]> {
	const response = await sociahiveApiRequest.call(this, 'GET', '/connected-accounts');
	return (response.data as IDataObject[] | undefined) ?? [];
}

export function accountLabel(account: IDataObject): string {
	const handle = account.username ? `@${account.username as string}` : undefined;
	const name = (account.display_name as string | undefined) || (account.name as string | undefined);
	const who = handle ?? name ?? (account.id as string);
	return `${who} (${account.platform as string})`;
}

/** Accounts for posting: the value is the connected account id. */
export async function getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const accounts = await listConnectedAccounts.call(this);
	return accounts.map((account) => ({
		name: accountLabel(account),
		value: account.id as string,
	}));
}

/** Accounts for flows: flows are listed by the account's platform user id. */
export async function getFlowAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const accounts = await listConnectedAccounts.call(this);
	return accounts
		.filter((account) => typeof account.platform_user_id === 'string' && account.platform_user_id)
		.map((account) => ({
			name: accountLabel(account),
			value: account.platform_user_id as string,
		}));
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(instant);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	const asUtc = Date.UTC(
		get('year'),
		get('month') - 1,
		get('day'),
		get('hour'),
		get('minute'),
		get('second'),
	);
	return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The API wants an ISO 8601 UTC instant. A value that names its own offset
 * (`Z` or `+02:00`) is used as is; a wall-clock value (`2026-10-20T09:00`, what
 * n8n's date picker gives) is read in `timeZone`.
 */
export function toUtcIso(value: string, timeZone: string): string {
	const trimmed = value.trim();
	if (/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed)) {
		const date = new Date(trimmed);
		if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
		return date.toISOString();
	}
	const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(trimmed);
	if (!match) throw new Error(`Invalid date: ${value}`);
	const [, y, mo, d, h = '0', mi = '0', s = '0'] = match;
	const wallAsUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
	// Two passes so a wall time next to a DST change gets the offset in force then.
	let utc = wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), timeZone);
	utc = wallAsUtc - zoneOffsetMs(new Date(utc), timeZone);
	return new Date(utc).toISOString();
}
