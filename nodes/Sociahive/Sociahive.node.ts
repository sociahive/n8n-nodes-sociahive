import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	getAccounts,
	getFlowAccounts,
	listConnectedAccounts,
	sociahiveApiRequest,
	toUtcIso,
} from './GenericFunctions';

/** Post statuses the API filters by (`POST_STATUSES` on the server). */
const POST_STATUS_OPTIONS = [
	{ name: 'Draft', value: 'draft' },
	{ name: 'Failed', value: 'failed' },
	{ name: 'Partially Published', value: 'partially_published' },
	{ name: 'Pending Approval', value: 'pending_approval' },
	{ name: 'Published', value: 'published' },
	{ name: 'Publishing', value: 'publishing' },
	{ name: 'Reminder Sent', value: 'reminder_sent' },
	{ name: 'Scheduled', value: 'scheduled' },
];

const PAGE_SIZE = 100;

export class Sociahive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SociaHive',
		name: 'sociahive',
		icon: { light: 'file:../../icons/sociahive.svg', dark: 'file:../../icons/sociahive.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Schedule social posts, upload media and manage DM automations in SociaHive',
		defaults: {
			name: 'SociaHive',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'sociahiveApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Analytics', value: 'analytics' },
					{ name: 'Flow', value: 'flow' },
					{ name: 'Media', value: 'media' },
					{ name: 'Post', value: 'post' },
				],
				default: 'post',
			},

			// ── Account ──────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List your connected social accounts',
						action: 'Get many accounts',
					},
				],
				default: 'getAll',
			},

			// ── Post ─────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['post'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a post: save a draft, publish now or schedule it',
						action: 'Create a post',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a post',
						action: 'Get a post',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List your posts',
						action: 'Get many posts',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Account Names or IDs',
				name: 'accountIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getAccounts' },
				required: true,
				default: [],
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				description:
					'The connected accounts to post to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				description: 'The post caption. Each platform has its own character limit.',
			},
			{
				displayName: 'When',
				name: 'scheduleType',
				type: 'options',
				options: [
					{
						name: 'Publish Now',
						value: 'immediate',
						description: 'Publish the post right away',
					},
					{
						name: 'Save as Draft',
						value: 'draft',
						description: 'Save the post as a draft in SociaHive without scheduling it',
					},
					{
						name: 'Schedule',
						value: 'scheduled',
						description: 'Publish the post at a set time',
					},
				],
				default: 'draft',
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
			},
			{
				displayName: 'Scheduled At',
				name: 'scheduledAt',
				type: 'dateTime',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['post'], operation: ['create'], scheduleType: ['scheduled'] },
				},
				description:
					'When to publish. A time without an offset is read in the timezone below. Must be in the future.',
			},
			{
				displayName: 'Media',
				name: 'media',
				type: 'fixedCollection',
				placeholder: 'Add Media',
				typeOptions: { multipleValues: true },
				default: {},
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				description:
					'Images or videos, each at a public HTTPS URL. Use Media > Upload From URL to copy a file into SociaHive first.',
				options: [
					{
						displayName: 'Media Item',
						name: 'items',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{ name: 'Image', value: 'image' },
									{ name: 'Video', value: 'video' },
								],
								default: 'image',
							},
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								default: '',
								placeholder: 'https://example.com/photo.jpg',
							},
						],
					},
				],
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				placeholder: 'Europe/Berlin',
				displayOptions: { show: { resource: ['post'], operation: ['create'] } },
				description:
					"IANA timezone stored with the post. Leave empty to use the workflow's timezone.",
			},
			{
				displayName: 'Post ID',
				name: 'postId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['post'], operation: ['get'] } },
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 50,
				displayOptions: { show: { resource: ['post'], operation: ['getAll'], returnAll: [false] } },
				description: 'Max number of results to return',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
				options: [
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: POST_STATUS_OPTIONS,
						default: 'scheduled',
					},
				],
			},

			// ── Media ────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['media'] } },
				options: [
					{
						name: 'Upload From URL',
						value: 'uploadFromUrl',
						description: 'Copy an image or video from a public URL into SociaHive',
						action: 'Upload media from a URL',
					},
				],
				default: 'uploadFromUrl',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/photo.jpg',
				displayOptions: { show: { resource: ['media'], operation: ['uploadFromUrl'] } },
				description:
					'Public URL of a JPEG, PNG, WebP, MP4 or MOV file. The result has a URL you can use in Post > Create.',
			},

			// ── Flow ─────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['flow'] } },
				options: [
					{
						name: 'Activate',
						value: 'activate',
						description: 'Turn a flow on (publish it)',
						action: 'Activate a flow',
					},
					{
						name: 'Deactivate',
						value: 'deactivate',
						description: 'Turn a flow off (back to draft)',
						action: 'Deactivate a flow',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a flow with its steps',
						action: 'Get a flow',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: "List an account's flows",
						action: 'Get many flows',
					},
					{
						name: 'Get Stats',
						value: 'getStats',
						description: 'Get run statistics for a flow',
						action: 'Get flow stats',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Account Name or ID',
				name: 'platformUserId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getFlowAccounts' },
				required: true,
				default: '',
				displayOptions: { show: { resource: ['flow'], operation: ['getAll'] } },
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Flow ID',
				name: 'flowId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['flow'], operation: ['activate', 'deactivate', 'get', 'getStats'] },
				},
			},

			// ── Analytics ────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['analytics'] } },
				options: [
					{
						name: 'Get Overview',
						value: 'getOverview',
						description: 'Get post performance across your accounts',
						action: 'Get analytics overview',
					},
				],
				default: 'getOverview',
			},
			{
				displayName: 'Options',
				name: 'analyticsOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['analytics'], operation: ['getOverview'] } },
				options: [
					{
						displayName: 'End Date',
						name: 'endDate',
						type: 'dateTime',
						default: '',
						description: 'Last day to include',
					},
					{
						displayName: 'Platform',
						name: 'platform',
						type: 'options',
						options: [
							{ name: 'Bluesky', value: 'bluesky' },
							{ name: 'Dev.to', value: 'devto' },
							{ name: 'Facebook', value: 'facebook' },
							{ name: 'Hashnode', value: 'hashnode' },
							{ name: 'Instagram', value: 'instagram' },
							{ name: 'Lemmy', value: 'lemmy' },
							{ name: 'LinkedIn', value: 'linkedin' },
							{ name: 'Listmonk', value: 'listmonk' },
							{ name: 'Mastodon', value: 'mastodon' },
							{ name: 'Pinterest', value: 'pinterest' },
							{ name: 'Threads', value: 'threads' },
							{ name: 'TikTok', value: 'tiktok' },
							{ name: 'Tumblr', value: 'tumblr' },
							{ name: 'X (Twitter)', value: 'twitter' },
							{ name: 'YouTube', value: 'youtube' },
						],
						default: 'instagram',
					},
					{
						displayName: 'Start Date',
						name: 'startDate',
						type: 'dateTime',
						default: '',
						description: 'First day to include',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			getAccounts,
			getFlowAccounts,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		// Account id -> platform, read once per run for Post > Create.
		let platformById: Map<string, string> | undefined;

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let result: IDataObject | IDataObject[];

				if (resource === 'account' && operation === 'getAll') {
					result = await listConnectedAccounts.call(this);
				} else if (resource === 'post' && operation === 'create') {
					if (!platformById) {
						const accounts = await listConnectedAccounts.call(this);
						platformById = new Map(
							accounts.map((a) => [a.id as string, a.platform as string]),
						);
					}
					const body = buildCreatePostBody(this, i, platformById);
					const response = await sociahiveApiRequest.call(this, 'POST', '/posts', body);
					result = (response.data as IDataObject) ?? response;
				} else if (resource === 'post' && operation === 'get') {
					const postId = encodeURIComponent(this.getNodeParameter('postId', i) as string);
					const response = await sociahiveApiRequest.call(this, 'GET', `/posts/${postId}`);
					result = (response.data as IDataObject) ?? response;
				} else if (resource === 'post' && operation === 'getAll') {
					result = await listPosts(this, i);
				} else if (resource === 'media' && operation === 'uploadFromUrl') {
					const url = this.getNodeParameter('url', i) as string;
					result = await sociahiveApiRequest.call(this, 'POST', '/uploads/from-url', { url });
				} else if (resource === 'flow' && operation === 'getAll') {
					const platformUserId = this.getNodeParameter('platformUserId', i) as string;
					const response = await sociahiveApiRequest.call(this, 'GET', '/flows', undefined, {
						platform_user_id: platformUserId,
					});
					result = (response.flows as IDataObject[] | undefined) ?? [];
				} else if (resource === 'flow' && operation === 'get') {
					const flowId = encodeURIComponent(this.getNodeParameter('flowId', i) as string);
					result = await sociahiveApiRequest.call(this, 'GET', `/flows/${flowId}`);
				} else if (resource === 'flow' && (operation === 'activate' || operation === 'deactivate')) {
					const flowId = encodeURIComponent(this.getNodeParameter('flowId', i) as string);
					// Flow statuses are draft / published / archived.
					const status = operation === 'activate' ? 'published' : 'draft';
					const response = await sociahiveApiRequest.call(this, 'PATCH', `/flows/${flowId}`, {
						status,
					});
					const flow = (response.flow as IDataObject | undefined) ?? response;
					result = response.warnings ? { ...flow, warnings: response.warnings } : flow;
				} else if (resource === 'flow' && operation === 'getStats') {
					const flowId = encodeURIComponent(this.getNodeParameter('flowId', i) as string);
					result = await sociahiveApiRequest.call(this, 'GET', `/flows/${flowId}/stats`);
				} else if (resource === 'analytics' && operation === 'getOverview') {
					const options = this.getNodeParameter('analyticsOptions', i, {}) as IDataObject;
					const qs: IDataObject = {};
					if (options.startDate) qs.start_date = toDateOnly(this, i, options.startDate as string);
					if (options.endDate) qs.end_date = toDateOnly(this, i, options.endDate as string);
					if (options.platform) qs.platform = options.platform;
					const response = await sociahiveApiRequest.call(this, 'GET', '/analytics', undefined, qs);
					result = (response.data as IDataObject) ?? response;
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for "${resource}"`,
						{ itemIndex: i },
					);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(result),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				if (error instanceof NodeApiError) {
					error.context.itemIndex = i;
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

/**
 * The create body the API accepts. The schema is strict: only these fields.
 */
function buildCreatePostBody(
	ctx: IExecuteFunctions,
	i: number,
	platformById: Map<string, string>,
): IDataObject {
	const accountIds = ctx.getNodeParameter('accountIds', i) as string[] | string;
	const ids = (Array.isArray(accountIds) ? accountIds : String(accountIds).split(','))
		.map((id) => id.trim())
		.filter(Boolean);
	if (ids.length === 0) {
		throw new NodeOperationError(ctx.getNode(), 'Choose at least one account', { itemIndex: i });
	}
	const platforms = ids.map((id) => {
		const platform = platformById.get(id);
		if (!platform) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Account "${id}" is not one of your connected accounts`,
				{ itemIndex: i },
			);
		}
		return { platform, account_id: id };
	});

	const text = ctx.getNodeParameter('text', i, '') as string;
	const mediaParam = ctx.getNodeParameter('media', i, {}) as {
		items?: Array<{ type: string; url: string }>;
	};
	const media = (mediaParam.items ?? [])
		.filter((m) => m.url && m.url.trim())
		.map((m) => ({ type: m.type, url: m.url.trim() }));

	const timezone = (ctx.getNodeParameter('timezone', i, '') as string).trim() || ctx.getTimezone();
	const when = ctx.getNodeParameter('scheduleType', i) as string;

	const content: IDataObject = { text };
	if (media.length > 0) content.media = media;

	const body: IDataObject = { content, platforms, timezone };
	if (when === 'immediate') {
		body.schedule_type = 'immediate';
	} else if (when === 'scheduled') {
		const scheduledAt = ctx.getNodeParameter('scheduledAt', i) as string;
		if (!scheduledAt) {
			throw new NodeOperationError(ctx.getNode(), 'Set "Scheduled At" to schedule the post', {
				itemIndex: i,
			});
		}
		body.schedule_type = 'scheduled';
		body.scheduled_at = toUtcIso(scheduledAt, timezone);
	} else {
		// A scheduled post with no time is stored as a draft.
		body.schedule_type = 'scheduled';
	}
	return body;
}

async function listPosts(ctx: IExecuteFunctions, i: number): Promise<IDataObject[]> {
	const returnAll = ctx.getNodeParameter('returnAll', i) as boolean;
	const filters = ctx.getNodeParameter('filters', i, {}) as IDataObject;
	const qs: IDataObject = {};
	if (filters.status) qs.status = filters.status;

	if (!returnAll) {
		qs.limit = ctx.getNodeParameter('limit', i) as number;
		const response = await sociahiveApiRequest.call(ctx, 'GET', '/posts', undefined, qs);
		return (response.data as IDataObject[] | undefined) ?? [];
	}

	const all: IDataObject[] = [];
	for (let offset = 0; ; offset += PAGE_SIZE) {
		const response = await sociahiveApiRequest.call(ctx, 'GET', '/posts', undefined, {
			...qs,
			limit: PAGE_SIZE,
			offset,
		});
		const page = (response.data as IDataObject[] | undefined) ?? [];
		all.push(...page);
		if (page.length < PAGE_SIZE) return all;
	}
}

/** The analytics API takes days as YYYY-MM-DD. */
function toDateOnly(ctx: IExecuteFunctions, i: number, value: string): string {
	const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
	if (match) return match[1];
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new NodeOperationError(ctx.getNode(), `Invalid date: ${value}`, { itemIndex: i });
	}
	return date.toISOString().slice(0, 10);
}
