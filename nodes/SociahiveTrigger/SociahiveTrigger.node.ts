import { createHmac, timingSafeEqual } from 'crypto';
import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import { sociahiveApiRequest } from '../Sociahive/GenericFunctions';

/** A delivery signed more than this far from now is refused (replay guard). */
const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Checks `X-SociaHive-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`
 * against the subscription's signing secret.
 */
export function isValidSignature(
	header: string | undefined,
	rawBody: string,
	secret: string,
	nowSeconds: number,
): boolean {
	if (!header) return false;
	const parts = new Map<string, string>();
	for (const part of header.split(',')) {
		const index = part.indexOf('=');
		if (index > 0) parts.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
	}
	const timestamp = Number(parts.get('t'));
	const signature = parts.get('v1');
	if (!Number.isFinite(timestamp) || !signature) return false;
	if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

	const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
	const a = Buffer.from(expected, 'utf8');
	const b = Buffer.from(signature, 'utf8');
	return a.length === b.length && timingSafeEqual(a, b);
}

export class SociahiveTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SociaHive Trigger',
		name: 'sociahiveTrigger',
		icon: { light: 'file:../../icons/sociahive.svg', dark: 'file:../../icons/sociahive.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when SociaHive sends an event',
		defaults: {
			name: 'SociaHive Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'sociahiveApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The SociaHive events that start the workflow',
				options: [
					{
						name: 'Automation Error',
						value: 'flow.error',
						description: 'An automation hit an error',
					},
					{
						name: 'Automation Started',
						value: 'flow.triggered',
						description: 'An automation started for someone',
					},
					{
						name: 'Post Failed',
						value: 'post.failed',
						description: 'A scheduled post failed to publish',
					},
					{
						name: 'Post Published',
						value: 'post.published',
						description: 'A scheduled post was published',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookId = webhookData.webhookId as string | undefined;
				if (!webhookId || !webhookData.signingSecret) return false;

				const webhookUrl = this.getNodeWebhookUrl('default');
				const response = await sociahiveApiRequest.call(this, 'GET', '/webhooks');
				const subscriptions = (response.data as IDataObject[] | undefined) ?? [];
				const match = subscriptions.find((s) => s.id === webhookId);
				if (match && match.target_url === webhookUrl) return true;

				delete webhookData.webhookId;
				delete webhookData.signingSecret;
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				const body = { target_url: webhookUrl, events, integration_type: 'n8n' };

				let response: IDataObject;
				try {
					response = await sociahiveApiRequest.call(this, 'POST', '/webhooks', body);
				} catch (error) {
					// 409: a subscription for this URL already exists (left behind by an
					// earlier activation). Its secret is only shown on create, so replace it.
					if ((error as NodeApiError).httpCode !== '409') {
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
					const list = await sociahiveApiRequest.call(this, 'GET', '/webhooks');
					const existing = ((list.data as IDataObject[] | undefined) ?? []).find(
						(s) => s.target_url === webhookUrl,
					);
					if (!existing) throw new NodeApiError(this.getNode(), error as JsonObject);
					await sociahiveApiRequest.call(this, 'DELETE', `/webhooks/${existing.id as string}`);
					response = await sociahiveApiRequest.call(this, 'POST', '/webhooks', body);
				}

				const data = response.data as IDataObject | undefined;
				if (!data?.id) return false;

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = data.id;
				webhookData.signingSecret = data.signing_secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookId = webhookData.webhookId as string | undefined;
				if (webhookId) {
					try {
						await sociahiveApiRequest.call(this, 'DELETE', `/webhooks/${webhookId}`);
					} catch (error) {
						// Already deleted in SociaHive: nothing left to remove.
						if ((error as NodeApiError).httpCode !== '404') return false;
					}
				}
				delete webhookData.webhookId;
				delete webhookData.signingSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookData = this.getWorkflowStaticData('node');
		const secret = webhookData.signingSecret as string | undefined;
		const request = this.getRequestObject() as { rawBody?: Buffer | string };
		const headers = this.getHeaderData() as IDataObject;

		if (secret) {
			const rawBody =
				request.rawBody === undefined
					? JSON.stringify(this.getBodyData())
					: request.rawBody.toString();
			const valid = isValidSignature(
				headers['x-sociahive-signature'] as string | undefined,
				rawBody,
				secret,
				Math.floor(Date.now() / 1000),
			);
			if (!valid) {
				const res = this.getResponseObject();
				res.status(401).json({ error: 'invalid signature' });
				return { noWebhookResponse: true };
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(this.getBodyData())],
		};
	}
}
